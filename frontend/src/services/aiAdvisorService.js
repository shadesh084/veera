import { supabase } from '../config/supabase.js';
import { computeAcademicOverview, calculateAssessmentPercentage } from '../utils/calculations.js';

const fetchStudentContext = async (user, reportingPeriod = 'all') => {
  let assessQuery = supabase
    .from('assessments')
    .select(`*, subject:subjects (id, name, color, target_percentage)`)
    .eq('user_id', user.id);

  if (reportingPeriod === 'last_30_days') {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    assessQuery = assessQuery.gte('assessment_date', past.toISOString().split('T')[0]);
  } else if (reportingPeriod === 'last_90_days') {
    const past = new Date();
    past.setDate(past.getDate() - 90);
    assessQuery = assessQuery.gte('assessment_date', past.toISOString().split('T')[0]);
  }

  const [subjRes, assessRes, profRes] = await Promise.all([
    supabase.from('subjects').select('*').eq('user_id', user.id),
    assessQuery.order('assessment_date', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ]);

  const subjects = subjRes.data || [];
  const assessments = assessRes.data || [];
  const profile = profRes.data || null;
  const overview = computeAcademicOverview(subjects, assessments, profile);

  return { overview, subjects, assessments: assessments.slice(0, 20), profile };
};

const generateDeterministicAdvisory = (context, studentQuestion, weakTopics) => {
  const { overview } = context;
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

export const aiAdvisorService = {
  getStatus: async () => {
    return {
      status: 'fallback_mode',
      model: 'system_heuristic_engine',
      features: {
        performance_analysis: true,
        study_plan_generation: true,
        weak_topic_diagnostic: true,
      },
      message: 'Running in structured rule-based advisory mode.',
    };
  },

  analyze: async (payload = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { reporting_period = 'all', student_question, weak_topics } = payload;
    const context = await fetchStudentContext(user, reporting_period);

    if (context.subjects.length === 0) {
      return {
        data: {
          summary: 'No subjects recorded yet.',
          performance_assessment: 'To receive personalized AI insights, please create your subjects and record recent marks.',
          strengths: [],
          areas_for_improvement: [],
          priority_actions: ['Add your enrolled subjects on the Subjects page.', 'Log marks from your recent tests or assignments.'],
          revision_strategies: [],
          encouragement: 'Welcome! Add your first subject to get started.',
        },
      };
    }

    const guidance = generateDeterministicAdvisory(context, student_question, weak_topics);
    return {
      data: guidance,
      meta: { provider: 'system_advisor_engine' },
    };
  },

  generateStudyPlan: async (payload = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { weak_topics = [] } = payload;
    const context = await fetchStudentContext(user, 'all');

    if (context.subjects.length === 0) {
      throw new Error('Please add at least one subject before generating a study plan.');
    }

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
          title: 'Solve 10 targeted practice questions',
          description: 'Attempt representative problems without checking solutions prematurely.',
          subject_name: targetSubject,
          estimated_minutes: 60,
          priority: 'high',
          completed: false,
          activity_type: 'practice_questions',
        },
        {
          id: crypto.randomUUID(),
          title: 'Conduct mistake & error log analysis',
          description: 'Identify root causes of incorrect answers from previous quizzes.',
          subject_name: targetSubject,
          estimated_minutes: 30,
          priority: 'medium',
          completed: false,
          activity_type: 'error_review',
        },
        ...(weak_topics.map((topic) => ({
          id: crypto.randomUUID(),
          title: `Focused revision: ${topic}`,
          description: `Active recall and practice problems specifically for ${topic}.`,
          subject_name: targetSubject,
          estimated_minutes: 45,
          priority: 'high',
          completed: false,
          activity_type: 'topic_specific_practice',
        }))),
      ],
    };

    return { data: plan, meta: { provider: 'system_advisor_engine' } };
  },
};
