import { supabase } from '../config/supabase.js';

export const studyPlanService = {
  getAll: async (status = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  getById: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) throw new Error('Study plan not found');
    return data;
  },

  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const formattedTasks = (data.tasks || []).map((t) => ({
      id: t.id || crypto.randomUUID(),
      title: t.title,
      description: t.description || null,
      estimated_minutes: t.estimated_minutes || 45,
      priority: t.priority || 'medium',
      completed: Boolean(t.completed),
      subject_name: t.subject_name || null,
    }));

    const { data: created, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        title: data.title.trim(),
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status || 'active',
        tasks: formattedTasks,
      })
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  update: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: updated, error } = await supabase
      .from('study_plans')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !updated) throw new Error('Study plan not found or unauthorized');
    return updated;
  },

  toggleTask: async (planId, taskId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: plan, error: fetchErr } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !plan) throw new Error('Study plan not found');

    const tasks = (plan.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    const { data: updated, error } = await supabase
      .from('study_plans')
      .update({ tasks, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title')
      .single();

    if (error || !data) throw new Error('Study plan not found or unauthorized');
    return { success: true, message: `Study plan "${data.title}" deleted.`, deleted_id: id };
  },
};
