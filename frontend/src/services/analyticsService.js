import { supabase } from '../config/supabase.js';
import {
  computeAcademicOverview,
  calculateAssessmentPercentage,
  getPerformanceBand,
  calculateOverallWeightedPercentage,
} from '../utils/calculations.js';

export const analyticsService = {
  getDashboard: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const [subjRes, assessRes, profRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id),
      supabase
        .from('assessments')
        .select(`*, subject:subjects (id, name, color, subject_code)`)
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (subjRes.error) throw subjRes.error;
    if (assessRes.error) throw assessRes.error;

    const subjects = subjRes.data || [];
    const assessments = assessRes.data || [];
    const profile = profRes.data || null;

    const overview = computeAcademicOverview(subjects, assessments, profile);

    const recentAssessments = assessments.slice(0, 5).map((item) => {
      const percentage = calculateAssessmentPercentage(item.marks_obtained, item.max_marks);
      return { ...item, percentage, performance_band: getPerformanceBand(percentage) };
    });

    return { ...overview, recent_assessments: recentAssessments };
  },

  getProgress: async (params = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let assessQuery = supabase
      .from('assessments')
      .select(`*, subject:subjects (id, name, color, subject_code, target_percentage)`)
      .eq('user_id', user.id);

    if (params.subject_id) assessQuery = assessQuery.eq('subject_id', params.subject_id);
    if (params.start_date) assessQuery = assessQuery.gte('assessment_date', params.start_date);
    if (params.end_date) assessQuery = assessQuery.lte('assessment_date', params.end_date);
    assessQuery = assessQuery.order('assessment_date', { ascending: true });

    const [subjRes, assessRes, profRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id),
      assessQuery,
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (subjRes.error) throw subjRes.error;
    if (assessRes.error) throw assessRes.error;

    const subjects = subjRes.data || [];
    const assessments = assessRes.data || [];
    const profile = profRes.data || null;

    const overview = computeAcademicOverview(subjects, assessments, profile);

    // Build chronological timeline
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

    return { ...overview, timeline: timelineData, type_breakdown: typeBreakdown };
  },
};
