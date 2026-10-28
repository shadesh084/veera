import { supabase } from '../config/supabase.js';
import {
  computeAcademicOverview,
  calculateAssessmentPercentage,
  getPerformanceBand,
} from '../utils/calculations.js';

export const reportService = {
  getSummary: async (params = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let assessQuery = supabase
      .from('assessments')
      .select(`*, subject:subjects (id, name, color, subject_code, target_percentage)`)
      .eq('user_id', user.id);

    if (params.start_date) assessQuery = assessQuery.gte('assessment_date', params.start_date);
    if (params.end_date) assessQuery = assessQuery.lte('assessment_date', params.end_date);
    assessQuery = assessQuery.order('assessment_date', { ascending: false });

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
    const assessmentList = assessments.map((a) => {
      const pct = calculateAssessmentPercentage(a.marks_obtained, a.max_marks);
      return { ...a, percentage: pct, performance_band: getPerformanceBand(pct) };
    });

    return {
      ...overview,
      assessments: assessmentList,
      reporting_period: {
        start_date: params.start_date || 'Beginning of record',
        end_date: params.end_date || 'Present',
      },
    };
  },

  downloadCsv: async (params = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('assessments')
      .select(`*, subject:subjects (name, subject_code)`)
      .eq('user_id', user.id);

    if (params.start_date) query = query.gte('assessment_date', params.start_date);
    if (params.end_date) query = query.lte('assessment_date', params.end_date);
    query = query.order('assessment_date', { ascending: true });

    const { data: assessments, error } = await query;
    if (error) throw error;

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const headers = [
      'Assessment Date', 'Subject Name', 'Subject Code', 'Assessment Title',
      'Assessment Type', 'Marks Obtained', 'Maximum Marks', 'Percentage (%)',
      'Performance Band', 'Remarks',
    ];

    const rows = (assessments || []).map((a) => {
      const pct = calculateAssessmentPercentage(a.marks_obtained, a.max_marks);
      const band = getPerformanceBand(pct);
      return [
        escapeCsv(a.assessment_date),
        escapeCsv(a.subject?.name || 'General'),
        escapeCsv(a.subject?.subject_code || ''),
        escapeCsv(a.title),
        escapeCsv(a.assessment_type),
        a.marks_obtained,
        a.max_marks,
        pct !== null ? `${pct}%` : 'N/A',
        escapeCsv(band?.label || 'N/A'),
        escapeCsv(a.remarks || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `academic-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
