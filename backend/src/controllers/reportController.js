import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import {
  computeAcademicOverview,
  calculateAssessmentPercentage,
  getPerformanceBand,
} from '../utils/calculations.js';

export const getReportSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

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

      if (start_date) assessQuery = assessQuery.gte('assessment_date', start_date);
      if (end_date) assessQuery = assessQuery.lte('assessment_date', end_date);
      assessQuery = assessQuery.order('assessment_date', { ascending: false });

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

      if (start_date) items = items.filter((a) => a.assessment_date >= start_date);
      if (end_date) items = items.filter((a) => a.assessment_date <= end_date);
      items.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));

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

    const assessmentList = assessments.map((a) => {
      const pct = calculateAssessmentPercentage(a.marks_obtained, a.max_marks);
      return {
        ...a,
        percentage: pct,
        performance_band: getPerformanceBand(pct),
      };
    });

    res.json({
      success: true,
      data: {
        ...overview,
        assessments: assessmentList,
        reporting_period: {
          start_date: start_date || 'Beginning of record',
          end_date: end_date || 'Present',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export student's authorized records as CSV
 */
export const exportCsv = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    let assessments = [];

    if (isSupabaseLive()) {
      let query = req.supabase
        .from('assessments')
        .select(`
          *,
          subject:subjects (
            name,
            subject_code
          )
        `)
        .eq('user_id', userId);

      if (start_date) query = query.gte('assessment_date', start_date);
      if (end_date) query = query.lte('assessment_date', end_date);
      query = query.order('assessment_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      assessments = data || [];
    } else {
      let items = Array.from(inMemoryStore.assessments.values()).filter((a) => a.user_id === userId);
      if (start_date) items = items.filter((a) => a.assessment_date >= start_date);
      if (end_date) items = items.filter((a) => a.assessment_date <= end_date);
      items.sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));

      assessments = items.map((a) => ({
        ...a,
        subject: inMemoryStore.subjects.get(a.subject_id) || null,
      }));
    }

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const text = String(str).replace(/"/g, '""');
      return `"${text}"`;
    };

    const headers = [
      'Assessment Date',
      'Subject Name',
      'Subject Code',
      'Assessment Title',
      'Assessment Type',
      'Marks Obtained',
      'Maximum Marks',
      'Percentage (%)',
      'Performance Band',
      'Remarks',
    ];

    const rows = assessments.map((a) => {
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

    const filename = `student-progress-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};
