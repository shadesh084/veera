import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';

export const getStudyPlans = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    if (isSupabaseLive()) {
      let query = req.supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data: data || [],
      });
    }

    // Local in-memory fallback
    let plans = Array.from(inMemoryStore.studyPlans.values())
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (status) {
      plans = plans.filter((p) => p.status === status);
    }

    res.json({
      success: true,
      data: plans,
    });
  } catch (err) {
    next(err);
  }
};

export const getStudyPlanById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('study_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Study plan not found or unauthorized.',
          },
        });
      }

      return res.json({
        success: true,
        data,
      });
    }

    // Local in-memory fallback
    const plan = inMemoryStore.studyPlans.get(id);
    if (!plan || plan.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Study plan not found or unauthorized.',
        },
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const createStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, start_date, end_date, status = 'active', tasks = [] } = req.body;

    const formattedTasks = tasks.map((t) => ({
      id: t.id || crypto.randomUUID(),
      title: t.title,
      description: t.description || null,
      estimated_minutes: t.estimated_minutes || 45,
      priority: t.priority || 'medium',
      completed: Boolean(t.completed),
      subject_name: t.subject_name || null,
    }));

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('study_plans')
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description || null,
          start_date,
          end_date,
          status,
          tasks: formattedTasks,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Study plan created successfully.',
        data,
      });
    }

    // Local in-memory fallback
    const newPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: title.trim(),
      description: description || null,
      start_date,
      end_date,
      status,
      tasks: formattedTasks,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryStore.studyPlans.set(newPlan.id, newPlan);

    res.status(201).json({
      success: true,
      message: 'Study plan created successfully.',
      data: newPlan,
    });
  } catch (err) {
    next(err);
  }
};

export const updateStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('study_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Study plan not found or unauthorized.',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Study plan updated successfully.',
        data,
      });
    }

    // Local in-memory fallback
    const plan = inMemoryStore.studyPlans.get(id);
    if (!plan || plan.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Study plan not found or unauthorized.',
        },
      });
    }

    const updated = {
      ...plan,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.studyPlans.set(id, updated);

    res.json({
      success: true,
      message: 'Study plan updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, taskId } = req.params;

    if (isSupabaseLive()) {
      const { data: plan, error: fetchErr } = await req.supabase
        .from('study_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Study plan not found.' },
        });
      }

      const tasks = (plan.tasks || []).map((t) => {
        if (t.id === taskId) {
          return { ...t, completed: !t.completed };
        }
        return t;
      });

      const { data, error: updateErr } = await req.supabase
        .from('study_plans')
        .update({ tasks, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return res.json({
        success: true,
        message: 'Task progress updated.',
        data,
      });
    }

    // Local in-memory fallback
    const plan = inMemoryStore.studyPlans.get(id);
    if (!plan || plan.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Study plan not found.' },
      });
    }

    const tasks = (plan.tasks || []).map((t) => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    plan.tasks = tasks;
    plan.updated_at = new Date().toISOString();
    inMemoryStore.studyPlans.set(id, plan);

    res.json({
      success: true,
      message: 'Task progress updated.',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('study_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, title')
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Study plan not found or unauthorized.',
          },
        });
      }

      return res.json({
        success: true,
        message: `Study plan "${data.title}" deleted.`,
        deleted_id: id,
      });
    }

    // Local in-memory fallback
    const plan = inMemoryStore.studyPlans.get(id);
    if (!plan || plan.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Study plan not found or unauthorized.',
        },
      });
    }

    inMemoryStore.studyPlans.delete(id);

    res.json({
      success: true,
      message: `Study plan "${plan.title}" deleted.`,
      deleted_id: id,
    });
  } catch (err) {
    next(err);
  }
};
