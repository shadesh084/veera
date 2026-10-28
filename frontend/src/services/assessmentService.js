import { supabase } from '../config/supabase.js';
import { calculateAssessmentPercentage, getPerformanceBand } from '../utils/calculations.js';

export const assessmentService = {
  getAll: async (params = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('assessments')
      .select(`
        *,
        subject:subjects (
          id,
          name,
          subject_code,
          color,
          target_percentage
        )
      `)
      .eq('user_id', user.id);

    if (params.subject_id) query = query.eq('subject_id', params.subject_id);
    if (params.assessment_type) query = query.eq('assessment_type', params.assessment_type);
    if (params.start_date) query = query.gte('assessment_date', params.start_date);
    if (params.end_date) query = query.lte('assessment_date', params.end_date);
    if (params.search) query = query.ilike('title', `%${params.search}%`);

    const ascending = params.sort_order === 'asc';
    const sortBy = params.sort_by || 'assessment_date';
    query = query.order(sortBy, { ascending });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item) => {
      const percentage = calculateAssessmentPercentage(item.marks_obtained, item.max_marks);
      return { ...item, percentage, performance_band: getPerformanceBand(percentage) };
    });
  },

  getById: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        subject:subjects (
          id,
          name,
          subject_code,
          color,
          target_percentage
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) throw new Error('Assessment not found');

    const percentage = calculateAssessmentPercentage(data.marks_obtained, data.max_marks);
    return { ...data, percentage, performance_band: getPerformanceBand(percentage) };
  },

  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify subject belongs to this user
    const { data: subject, error: subjErr } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', data.subject_id)
      .eq('user_id', user.id)
      .single();

    if (subjErr || !subject) throw new Error('The specified subject does not belong to your account.');

    const { data: created, error } = await supabase
      .from('assessments')
      .insert({
        user_id: user.id,
        subject_id: data.subject_id,
        title: data.title.trim(),
        assessment_type: data.assessment_type,
        assessment_date: data.assessment_date,
        marks_obtained: data.marks_obtained,
        max_marks: data.max_marks,
        remarks: data.remarks || null,
      })
      .select(`
        *,
        subject:subjects (
          id,
          name,
          subject_code,
          color,
          target_percentage
        )
      `)
      .single();

    if (error) throw error;

    const percentage = calculateAssessmentPercentage(created.marks_obtained, created.max_marks);
    return { ...created, percentage, performance_band: getPerformanceBand(percentage) };
  },

  update: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (data.title) data.title = data.title.trim();

    if (data.subject_id) {
      const { data: newSubj, error: sErr } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', data.subject_id)
        .eq('user_id', user.id)
        .single();
      if (sErr || !newSubj) throw new Error('Target subject does not belong to your account.');
    }

    const { data: updated, error } = await supabase
      .from('assessments')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        subject:subjects (
          id,
          name,
          subject_code,
          color,
          target_percentage
        )
      `)
      .single();

    if (error || !updated) throw new Error('Assessment not found or unauthorized');

    const percentage = calculateAssessmentPercentage(updated.marks_obtained, updated.max_marks);
    return { ...updated, percentage, performance_band: getPerformanceBand(percentage) };
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title')
      .single();

    if (error || !data) throw new Error('Assessment not found or unauthorized');
    return { success: true, message: `Assessment "${data.title}" deleted.`, deleted_id: id };
  },
};
