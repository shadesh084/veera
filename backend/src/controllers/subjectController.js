import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import { calculateSubjectMetrics } from '../utils/calculations.js';

export const getSubjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (isSupabaseLive()) {
      const { data: subjects, error: subjError } = await req.supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (subjError) throw subjError;

      const { data: assessments, error: assessError } = await req.supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId);

      if (assessError) throw assessError;

      const subjectsWithMetrics = calculateSubjectMetrics(subjects || [], assessments || []);

      return res.json({
        success: true,
        data: subjectsWithMetrics,
      });
    }

    // Local in-memory fallback
    const userSubjects = Array.from(inMemoryStore.subjects.values())
      .filter((s) => s.user_id === userId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const userAssessments = Array.from(inMemoryStore.assessments.values()).filter(
      (a) => a.user_id === userId
    );

    const metrics = calculateSubjectMetrics(userSubjects, userAssessments);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjectById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data: subject, error: subjError } = await req.supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (subjError || !subject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subject not found or does not belong to you.',
          },
        });
      }

      const { data: assessments, error: assessError } = await req.supabase
        .from('assessments')
        .select('*')
        .eq('subject_id', id)
        .eq('user_id', userId)
        .order('assessment_date', { ascending: false });

      if (assessError) throw assessError;

      const [metrics] = calculateSubjectMetrics([subject], assessments || []);

      return res.json({
        success: true,
        data: {
          ...metrics,
          assessments: assessments || [],
        },
      });
    }

    // Local in-memory fallback
    const subject = inMemoryStore.subjects.get(id);
    if (!subject || subject.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subject not found or does not belong to you.',
        },
      });
    }

    const assessments = Array.from(inMemoryStore.assessments.values())
      .filter((a) => a.subject_id === id && a.user_id === userId)
      .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));

    const [metrics] = calculateSubjectMetrics([subject], assessments);

    res.json({
      success: true,
      data: {
        ...metrics,
        assessments,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, subject_code, description, target_percentage, color } = req.body;
    const normalizedName = name.trim();

    if (isSupabaseLive()) {
      // Check for duplicate subject name
      const { data: existing } = await req.supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', normalizedName);

      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SUBJECT',
            message: `A subject with the name "${normalizedName}" already exists in your account.`,
          },
        });
      }

      const { data, error } = await req.supabase
        .from('subjects')
        .insert({
          user_id: userId,
          name: normalizedName,
          subject_code: subject_code || null,
          description: description || null,
          target_percentage: target_percentage !== undefined ? target_percentage : null,
          color: color || 'blue',
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Subject created successfully.',
        data,
      });
    }

    // Local in-memory fallback
    const duplicate = Array.from(inMemoryStore.subjects.values()).some(
      (s) => s.user_id === userId && s.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_SUBJECT',
          message: `A subject with the name "${normalizedName}" already exists in your account.`,
        },
      });
    }

    const newSubject = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: normalizedName,
      subject_code: subject_code || null,
      description: description || null,
      target_percentage: target_percentage !== undefined ? target_percentage : null,
      color: color || 'blue',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryStore.subjects.set(newSubject.id, newSubject);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: newSubject,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    if (isSupabaseLive()) {
      if (updates.name) {
        const { data: existing } = await req.supabase
          .from('subjects')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', updates.name)
          .neq('id', id);

        if (existing && existing.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'DUPLICATE_SUBJECT',
              message: `Another subject named "${updates.name}" already exists.`,
            },
          });
        }
      }

      const { data, error } = await req.supabase
        .from('subjects')
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
            message: 'Subject not found or unauthorized.',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Subject updated successfully.',
        data,
      });
    }

    // Local in-memory fallback
    const subject = inMemoryStore.subjects.get(id);
    if (!subject || subject.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subject not found or unauthorized.',
        },
      });
    }

    if (updates.name && updates.name.toLowerCase() !== subject.name.toLowerCase()) {
      const duplicate = Array.from(inMemoryStore.subjects.values()).some(
        (s) =>
          s.id !== id &&
          s.user_id === userId &&
          s.name.trim().toLowerCase() === updates.name.toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SUBJECT',
            message: `Another subject named "${updates.name}" already exists.`,
          },
        });
      }
    }

    const updated = {
      ...subject,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.subjects.set(id, updated);

    res.json({
      success: true,
      message: 'Subject updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data: subject, error: fetchErr } = await req.supabase
        .from('subjects')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !subject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subject not found or unauthorized.',
          },
        });
      }

      // Foreign key CASCADE will delete assessments and plans in database
      const { error: delErr } = await req.supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (delErr) throw delErr;

      return res.json({
        success: true,
        message: `Subject "${subject.name}" and all associated assessments have been deleted.`,
        deleted_id: id,
      });
    }

    // Local in-memory fallback
    const subject = inMemoryStore.subjects.get(id);
    if (!subject || subject.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subject not found or unauthorized.',
        },
      });
    }

    inMemoryStore.subjects.delete(id);

    // Cascade delete assessments
    let cascadedCount = 0;
    for (const [aId, a] of inMemoryStore.assessments.entries()) {
      if (a.subject_id === id) {
        inMemoryStore.assessments.delete(aId);
        cascadedCount++;
      }
    }

    res.json({
      success: true,
      message: `Subject "${subject.name}" and ${cascadedCount} associated assessments were deleted.`,
      deleted_id: id,
    });
  } catch (err) {
    next(err);
  }
};
