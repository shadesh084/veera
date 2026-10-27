import { getAIClient, isAIConfigured } from '../config/gemini.js';
import { config } from '../config/index.js';
import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import { computeAcademicOverview, calculateAssessmentPercentage } from '../utils/calculations.js';
import {
  aiAnalysisResponseSchema,
  aiStudyPlanResponseSchema,
} from '../schemas/aiAdvisorSchemas.js';
import { logger } from '../utils/logger.js';

/**
 * Fetch authenticated student's academic history for AI analysis
 */
const fetchStudentContext = async (req, userId, reportingPeriod = 'all') => {
  let subjects = [];
  let assessments = [];
  let profile = null;

  if (isSupabaseLive()) {
    let query = req.supabase
      .from('assessments')
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color,
          target_percentage
        )
      `)
      .eq('user_id', userId);

    if (reportingPeriod === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      query = query.gte('assessment_date', past.toISOString().split('T')[0]);
    } else if (reportingPeriod === 'last_90_days') {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      query = query.gte('assessment_date', past.toISOString().split('T')[0]);
    }

    const [subjRes, assessRes, profRes] = await Promise.all([
      req.supabase.from('subjects').select('*').eq('user_id', userId),
      query.order('assessment_date', { ascending: false }),
      req.supabase.from('profiles').select('*').eq('id', userId).single(),
    ]);

    subjects = subjRes.data || [];
    assessments = assessRes.data || [];
    profile = profRes.data || null;
  } else {
    subjects = Array.from(inMemoryStore.subjects.values()).filter((s) => s.user_id === userId);
    let items = Array.from(inMemoryStore.assessments.values()).filter((a) => a.user_id === userId);

    if (reportingPeriod === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      items = items.filter((a) => new Date(a.assessment_date) >= past);
    } else if (reportingPeriod === 'last_90_days') {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      items = items.filter((a) => new Date(a.assessment_date) >= past);
    }

    assessments = items.map((a) => {
      const s = inMemoryStore.subjects.get(a.subject_id);
      return {
        ...a,
        subject: s ? { id: s.id, name: s.name, color: s.color, target_percentage: s.target_percentage } : null,
      };
    });

    profile = inMemoryStore.profiles.get(userId) || null;
  }

  const overview = computeAcademicOverview(subjects, assessments, profile);

  return {
    overview,
    subjects,
    assessments: assessments.slice(0, 20), // Bound history payload
    profile,
  };
};

/**
 * Fallback structured advisory generator when GEMINI_API_KEY is not configured
 */
const generateDeterministicAdvisory = (context, studentQuestion, weakTopics) => {
  const { overview, subjects } = context;
  const overallPct = overview.overall_percentage;
  const best = overview.best_performing_subject;
  const lowest = overview.lowest_performing_subject;

  const strengths = [];
  const areasForImprovement = [];

  for (const s of overview.subjects) {
    if (s.weighted_percentage !== null) {
      if (s.weighted_percentage >= 75) {
        strengths.push({
          subject: s.name,
          observation: `Strong performance with a weighted score of ${s.weighted_percentage}%.`,
          evidence: `Recorded across ${s.assessments_count} assessments.`,
        });
      } else if (s.weighted_percentage < 65) {
        areasForImprovement.push({
          subject: s.name,
          gap: `Current weighted score is ${s.weighted_percentage}%, below recommended target.`,
          priority: s.weighted_percentage < 50 ? 'high' : 'medium',
          recommended_action: `Schedule weekly dedicated revision and practice fundamental questions in ${s.name}.`,
        });
      }
    }
  }

  if (weakTopics && weakTopics.length > 0) {
    for (const topic of weakTopics) {
      areasForImprovement.push({
        subject: 'Student Highlighted Topic',
        gap: `Identified topic needing attention: "${topic}".`,
        priority: 'high',
        recommended_action: `Allocate 45 minutes of active recall and error analysis specifically to ${topic}.`,
      });
    }
  }

  return {
    summary: overallPct !== null
      ? `Overall academic standing is ${overallPct}% (${overview.performance_band?.label || 'In Progress'}). Trend shows: ${overview.trend?.message}`
      : 'You have not recorded enough assessments to form a historical trend yet. Begin by adding recent test marks.',
    performance_assessment: overallPct !== null
      ? `Your strongest performance is in ${best?.name || 'your core subjects'} (${best?.percentage || 0}%), while ${lowest?.name || 'other subjects'} (${lowest?.percentage || 0}%) requires prioritized attention.`
      : 'Start recording assessments to receive granular performance insights.',
    strengths,
    areas_for_improvement: areasForImprovement,
    priority_actions: [
      lowest ? `Dedicate the first 2 study blocks this week to ${lowest.name}.` : 'Add assessments for each active subject.',
      'Conduct weekly error log reviews 24 hours after each assessment.',
      'Practice active recall before reviewing notes.',
    ],
    revision_strategies: [
      {
        title: 'Spaced Retrieval Practice',
        method: 'Solve 5-10 practice problems 2 days, 5 days, and 10 days after learning a topic.',
        frequency: '3 times per week',
      },
      {
        title: 'Feynman Explanation Method',
        method: 'Explain challenging concepts simply without referring to reference materials.',
        frequency: 'Twice weekly for lowest-scoring subjects',
      },
    ],
    encouragement: 'Consistent daily effort and reviewing mistakes will steadily improve your grades and comprehension.',
  };
};

/**
 * Controller: Analyze academic performance using Gemini or structured advisor
 */
export const analyzePerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reporting_period = 'all', student_question, weak_topics } = req.body;

    const context = await fetchStudentContext(req, userId, reporting_period);

    if (context.subjects.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: 'No subjects recorded yet.',
          performance_assessment: 'To receive personalized AI insights, please create your subjects and record recent marks.',
          strengths: [],
          areas_for_improvement: [],
          priority_actions: ['Add your enrolled subjects on the Subjects page.', 'Log marks from your recent tests or assignments.'],
          revision_strategies: [],
          encouragement: 'Welcome! Add your first subject to get started.',
        },
      });
    }

    if (!isAIConfigured()) {
      const guidance = generateDeterministicAdvisory(context, student_question, weak_topics);
      return res.json({
        success: true,
        data: guidance,
        meta: {
          provider: 'system_advisor_engine',
          note: 'Configuring GEMINI_API_KEY enables live Google Gemini neural reasoning.',
        },
      });
    }

    // Live Gemini call via @google/genai
    const ai = getAIClient();
    const prompt = `
You are an expert, supportive Academic Advisor in an AI-powered student progress tracking application.
Analyze the following authentic academic records for this student:

STUDENT ACADEMIC SUMMARY:
- Total Subjects: ${context.overview.total_subjects}
- Total Recorded Assessments: ${context.overview.total_assessments}
- Marks-Weighted Overall Percentage: ${context.overview.overall_percentage ?? 'Unavailable (no marks)'}%
- Target Percentage: ${context.overview.profile_target ?? 'Not specified'}%
- Best Performing Subject: ${JSON.stringify(context.overview.best_performing_subject)}
- Lowest Performing Subject: ${JSON.stringify(context.overview.lowest_performing_subject)}
- Historical Performance Trend: ${context.overview.trend?.status} (${context.overview.trend?.message})

SUBJECT-BY-SUBJECT BREAKDOWN:
${context.overview.subjects.map((s) => `- ${s.name}: Weighted Score: ${s.weighted_percentage ?? 'No marks yet'}%, Assessments Count: ${s.assessments_count}, Target: ${s.target_percentage ?? 'None'}%`).join('\n')}

RECENT ASSESSMENTS (Chronological):
${context.assessments.map((a) => `- [${a.assessment_date}] ${a.subject?.name || 'Subject'}: ${a.title} (${a.assessment_type}) - ${a.marks_obtained}/${a.max_marks} marks (${calculateAssessmentPercentage(a.marks_obtained, a.max_marks)}%)`).join('\n')}

STUDENT QUESTION / NOTE: ${student_question || 'None provided'}
WEAK TOPICS REPORTED BY STUDENT: ${weak_topics && weak_topics.length > 0 ? weak_topics.join(', ') : 'None specified'}

STRICT RULES:
1. Ground your advice ONLY on the provided academic data. Do NOT invent grades, syllabus topics, or exam dates.
2. Return ONLY a valid JSON object matching this exact schema:
{
  "summary": "Concise summary of student performance",
  "performance_assessment": "Detailed diagnostic of standing and trends",
  "strengths": [{"subject": "Subject Name", "observation": "...", "evidence": "..."}],
  "areas_for_improvement": [{"subject": "Subject Name", "gap": "...", "priority": "high|medium|low", "recommended_action": "..."}],
  "priority_actions": ["Action 1", "Action 2", "Action 3"],
  "revision_strategies": [{"title": "Strategy Name", "method": "...", "frequency": "..."}],
  "encouragement": "Warm, motivating closing note"
}
`;

    try {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsedJSON = JSON.parse(responseText);
      const validated = aiAnalysisResponseSchema.parse(parsedJSON);

      return res.json({
        success: true,
        data: validated,
        meta: {
          provider: 'google_genai',
          model: config.gemini.model,
        },
      });
    } catch (aiErr) {
      logger.error('Gemini API call failed, falling back to deterministic advisory:', {
        error: aiErr.message,
      });
      const fallback = generateDeterministicAdvisory(context, student_question, weak_topics);
      return res.json({
        success: true,
        data: fallback,
        meta: {
          provider: 'fallback_advisor_engine',
          error_handled: aiErr.message,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Generate tailored weekly study plan
 */
export const generateStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { weak_topics = [] } = req.body;

    const context = await fetchStudentContext(req, userId, 'all');

    if (context.subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SUBJECTS',
          message: 'Please add at least one subject before generating a study plan.',
        },
      });
    }

    if (!isAIConfigured()) {
      // Deterministic fallback plan
      const targetSubject = context.overview.lowest_performing_subject?.name || context.subjects[0]?.name;
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const plan = {
        title: `${targetSubject} Reinforcement & Practice Plan`,
        rationale: `Targeted revision to improve understanding and score in ${targetSubject}.`,
        suggested_days: 7,
        start_date: today.toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0],
        tasks: [
          {
            id: crypto.randomUUID(),
            title: `Review core formulas and key definitions in ${targetSubject}`,
            description: 'Spend 45 minutes on concept clarity and creating flashcards.',
            subject_name: targetSubject,
            estimated_minutes: 45,
            priority: 'high',
            completed: false,
            activity_type: 'concept_revision',
          },
          {
            id: crypto.randomUUID(),
            title: `Solve 10 targeted practice questions`,
            description: 'Attempt representative problems without checking solutions prematurely.',
            subject_name: targetSubject,
            estimated_minutes: 60,
            priority: 'high',
            completed: false,
            activity_type: 'practice_questions',
          },
          {
            id: crypto.randomUUID(),
            title: `Conduct mistake & error log analysis`,
            description: 'Identify root causes of incorrect answers from previous quizzes.',
            subject_name: targetSubject,
            estimated_minutes: 30,
            priority: 'medium',
            completed: false,
            activity_type: 'error_review',
          },
        ],
      };

      return res.json({
        success: true,
        data: plan,
        meta: { provider: 'system_advisor_engine' },
      });
    }

    // Live Gemini model invocation
    const ai = getAIClient();
    const prompt = `
You are an expert academic advisor. Generate a 7-day actionable study plan based on the student's actual performance:
SUBJECTS: ${context.subjects.map((s) => s.name).join(', ')}
LOWEST PERFORMING SUBJECT: ${context.overview.lowest_performing_subject?.name || 'All'}
STUDENT'S WEAK TOPICS: ${weak_topics.join(', ') || 'General review'}

RULES:
1. Provide between 4 and 7 specific, realistic study tasks.
2. Return ONLY valid JSON matching this schema:
{
  "title": "Clear plan title",
  "rationale": "Why this plan is prioritized",
  "suggested_days": 7,
  "tasks": [
    {
      "title": "Specific task",
      "description": "Concrete instruction",
      "subject_name": "Subject Name",
      "estimated_minutes": 45,
      "priority": "high|medium|low",
      "activity_type": "concept_revision|practice_questions|assignment_completion|mock_test|error_review|spaced_revision|time_management|topic_specific_practice"
    }
  ]
}
`;

    try {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);
      const validated = aiStudyPlanResponseSchema.parse(parsed);

      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + (validated.suggested_days || 7));

      const formattedPlan = {
        title: validated.title,
        rationale: validated.rationale,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        tasks: validated.tasks.map((t) => ({
          id: crypto.randomUUID(),
          ...t,
          completed: false,
        })),
      };

      return res.json({
        success: true,
        data: formattedPlan,
        meta: { provider: 'google_genai' },
      });
    } catch (aiErr) {
      logger.error('Gemini Study Plan generation failed:', { error: aiErr.message });
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'The AI service encountered a temporary error. You can create a custom study plan manually.',
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Check AI service status
 */
export const getAIStatus = (req, res) => {
  const isConfigured = isAIConfigured();
  res.json({
    success: true,
    data: {
      status: isConfigured ? 'available' : 'fallback_mode',
      model: isConfigured ? config.gemini.model : 'system_heuristic_engine',
      features: {
        performance_analysis: true,
        study_plan_generation: true,
        weak_topic_diagnostic: true,
      },
      message: isConfigured
        ? 'Google Gemini neural advisor is active.'
        : 'Running in structured rule-based advisory mode. Add GEMINI_API_KEY in .env for generative insights.',
    },
  });
};
