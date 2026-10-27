import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import {
  computeAcademicOverview,
  calculateAssessmentPercentage,
  getPerformanceBand,
} from '../utils/calculations.js';

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let subjects = [];
    let assessments = [];
    let profile = null;

    if (isSupabaseLive()) {
      const [subjRes, assessRes, profRes] = await Promise.all([
        req.supabase.from('subjects').select('*').eq('user_id', userId),
        req.supabase
          .from('assessments')
          .select(`
            *,
            subject:subjects (
              id,
              name,
              color,
              subject_code
            )
          `)
          .eq('user_id', userId)
          .order('assessment_date', { ascending: false }),
        req.supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);

      if (subjRes.error) throw subjRes.error;
      if (assessRes.error) throw assessRes.error;

      subjects = subjRes.data || [];
      assessments = assessRes.data || [];
      profile = profRes.data || null;
    } else {
      // Local in-memory fallback
      subjects = Array.from(inMemoryStore.subjects.values()).filter((s) => s.user_id === userId);
      assessments = Array.from(inMemoryStore.assessments.values())
        .filter((a) => a.user_id === userId)
        .map((a) => {
          const s = inMemoryStore.subjects.get(a.subject_id);
          return {
            ...a,
            subject: s
              ? {
                  id: s.id,
                  name: s.name,
                  color: s.color,
                  subject_code: s.subject_code,
                }
              : null,
          };
        })
        .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
      profile = inMemoryStore.profiles.get(userId) || null;
    }

    const overview = computeAcademicOverview(subjects, assessments, profile);

    // Latest 5 assessments
    const recentAssessments = assessments.slice(0, 5).map((item) => {
      const percentage = calculateAssessmentPercentage(item.marks_obtained, item.max_marks);
      return {
        ...item,
        percentage,
        performance_band: getPerformanceBand(percentage),
      };
    });

    res.json({
      success: true,
      data: {
        ...overview,
        recent_assessments: recentAssessments,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProgressAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, subject_id } = req.query;

    let subjects = [];
    let assessments = [];
    let profile = null;

    if (isSupabaseLive()) {
      let assessQuery = req.supabase
        .from('assessments')
        .select(`
          *,
          subject:subjects (
            id,
            name,
            color,
            subject_code,
            target_percentage
          )
        `)
        .eq('user_id', userId);

      if (subject_id) assessQuery = assessQuery.eq('subject_id', subject_id);
      if (start_date) assessQuery = assessQuery.gte('assessment_date', start_date);
      if (end_date) assessQuery = assessQuery.lte('assessment_date', end_date);

      assessQuery = assessQuery.order('assessment_date', { ascending: true });

      const [subjRes, assessRes, profRes] = await Promise.all([
        req.supabase.from('subjects').select('*').eq('user_id', userId),
        assessQuery,
        req.supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);

      if (subjRes.error) throw subjRes.error;
      if (assessRes.error) throw assessRes.error;

      subjects = subjRes.data || [];
      assessments = assessRes.data || [];
      profile = profRes.data || null;
    } else {
      subjects = Array.from(inMemoryStore.subjects.values()).filter((s) => s.user_id === userId);
      let items = Array.from(inMemoryStore.assessments.values()).filter((a) => a.user_id === userId);

      if (subject_id) items = items.filter((a) => a.subject_id === subject_id);
      if (start_date) items = items.filter((a) => a.assessment_date >= start_date);
      if (end_date) items = items.filter((a) => a.assessment_date <= end_date);

      items.sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));

      assessments = items.map((a) => {
        const s = inMemoryStore.subjects.get(a.subject_id);
        return {
          ...a,
          subject: s || null,
        };
      });

      profile = inMemoryStore.profiles.get(userId) || null;
    }

    const overview = computeAcademicOverview(subjects, assessments, profile);

    // Build chronological trend line points
    let cumulativeMarks = 0;
    let cumulativeMax = 0;
    const timelineData = assessments.map((a) => {
      const marks = parseFloat(a.marks_obtained);
      const max = parseFloat(a.max_marks);
      cumulativeMarks += marks;
      cumulativeMax += max;

      const singlePct = calculateAssessmentPercentage(marks, max);
      const runningPct = Math.round((cumulativeMarks / cumulativeMax) * 10000) / 100;

      return {
        id: a.id,
        date: a.assessment_date,
        title: a.title,
        subject: a.subject?.name || 'General',
        color: a.subject?.color || 'blue',
        score_pct: singlePct,
        cumulative_pct: runningPct,
        type: a.assessment_type,
      };
    });

    // Breakdown by assessment type
    const typeDistributionMap = new Map();
    for (const a of assessments) {
      const t = a.assessment_type;
      if (!typeDistributionMap.has(t)) {
        typeDistributionMap.set(t, { type: t, count: 0, total_marks: 0, total_max: 0 });
      }
      const entry = typeDistributionMap.get(t);
      entry.count += 1;
      entry.total_marks += parseFloat(a.marks_obtained);
      entry.total_max += parseFloat(a.max_marks);
    }

    const typeBreakdown = Array.from(typeDistributionMap.values()).map((entry) => ({
      type: entry.type,
      count: entry.count,
      percentage: entry.total_max > 0 ? Math.round((entry.total_marks / entry.total_max) * 10000) / 100 : null,
    }));

    res.json({
      success: true,
      data: {
        ...overview,
        timeline: timelineData,
        type_breakdown: typeBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};
