import { supabase } from '../config/supabase.js';
import { calculateSubjectMetrics } from '../utils/calculations.js';

export const subjectService = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subjects, error: subjError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (subjError) throw subjError;

    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id);

    if (assessError) throw assessError;

    return calculateSubjectMetrics(subjects || [], assessments || []);
  },

  getById: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subject, error: subjError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (subjError || !subject) throw new Error('Subject not found');

    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select('*')
      .eq('subject_id', id)
      .eq('user_id', user.id)
      .order('assessment_date', { ascending: false });

    if (assessError) throw assessError;

    const [metrics] = calculateSubjectMetrics([subject], assessments || []);
    return { ...metrics, assessments: assessments || [] };
  },

  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const normalizedName = data.name.trim();

    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', normalizedName);

    if (existing && existing.length > 0) {
      const err = new Error(`A subject named "${normalizedName}" already exists.`);
      err.code = 'DUPLICATE_SUBJECT';
      throw err;
    }

    const { data: created, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: normalizedName,
        subject_code: data.subject_code || null,
        description: data.description || null,
        target_percentage: data.target_percentage !== undefined ? data.target_percentage : null,
        color: data.color || 'blue',
      })
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  update: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (data.name) {
      data.name = data.name.trim();
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', data.name)
        .neq('id', id);

      if (existing && existing.length > 0) {
        const err = new Error(`Another subject named "${data.name}" already exists.`);
        err.code = 'DUPLICATE_SUBJECT';
        throw err;
      }
    }

    const { data: updated, error } = await supabase
      .from('subjects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !updated) throw new Error('Subject not found or unauthorized');
    return updated;
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subject, error: fetchErr } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !subject) throw new Error('Subject not found or unauthorized');

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true, message: `Subject "${subject.name}" deleted.`, deleted_id: id };
  },
};
