import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import { calculateAssessmentPercentage, getPerformanceBand } from '../utils/calculations.js';

export const getAssessments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      subject_id,
      assessment_type,
      start_date,
      end_date,
      search,
      sort_by = 'assessment_date',
      sort_order = 'desc',
    } = req.query;

    if (isSupabaseLive()) {
      let query = req.supabase
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
        .eq('user_id', userId);

      if (subject_id) query = query.eq('subject_id', subject_id);
      if (assessment_type) query = query.eq('assessment_type', assessment_type);
      if (start_date) query = query.gte('assessment_date', start_date);
      if (end_date) query = query.lte('assessment_date', end_date);
      if (search) query = query.ilike('title', `%${search}%`);

      const ascending = sort_order === 'asc';
      query = query.order(sort_by, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      const enriched = (data || []).map((item) => {
        const percentage = calculateAssessmentPercentage(item.marks_obtained, item.max_marks);
        return {
          ...item,
          percentage,
          performance_band: getPerformanceBand(percentage),
        };
      });

      return res.json({
        success: true,
        data: enriched,
        total: enriched.length,
      });
    }

    // Local in-memory fallback
    let items = Array.from(inMemoryStore.assessments.values()).filter(
      (a) => a.user_id === userId
    );

    if (subject_id) items = items.filter((a) => a.subject_id === subject_id);
    if (assessment_type) items = items.filter((a) => a.assessment_type === assessment_type);
    if (start_date) items = items.filter((a) => a.assessment_date >= start_date);
    if (end_date) items = items.filter((a) => a.assessment_date <= end_date);
    if (search) {
      const term = search.toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          (a.remarks && a.remarks.toLowerCase().includes(term))
      );
    }

    // Attach subject
    let enriched = items.map((item) => {
      const subject = inMemoryStore.subjects.get(item.subject_id);
      const percentage = calculateAssessmentPercentage(item.marks_obtained, item.max_marks);
      return {
        ...item,
        percentage,
        performance_band: getPerformanceBand(percentage),
        subject: subject
          ? {
              id: subject.id,
              name: subject.name,
              subject_code: subject.subject_code,
              color: subject.color,
              target_percentage: subject.target_percentage,
            }
          : null,
      };
    });

    // Sort
    enriched.sort((a, b) => {
      let valA = a[sort_by];
      let valB = b[sort_by];

      if (sort_by === 'assessment_date') {
        valA = new Date(valA);
        valB = new Date(valB);
      }

      if (valA < valB) return sort_order === 'asc' ? -1 : 1;
      if (valA > valB) return sort_order === 'asc' ? 1 : -1;
      return 0;
    });

    res.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (err) {
    next(err);
  }
};

export const getAssessmentById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
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
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Assessment not found or does not belong to you.',
          },
        });
      }

      const percentage = calculateAssessmentPercentage(data.marks_obtained, data.max_marks);
      return res.json({
        success: true,
        data: {
          ...data,
          percentage,
          performance_band: getPerformanceBand(percentage),
        },
      });
    }

    // Local in-memory fallback
    const assessment = inMemoryStore.assessments.get(id);
    if (!assessment || assessment.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Assessment not found or does not belong to you.',
        },
      });
    }

    const subject = inMemoryStore.subjects.get(assessment.subject_id);
    const percentage = calculateAssessmentPercentage(assessment.marks_obtained, assessment.max_marks);

    res.json({
      success: true,
      data: {
        ...assessment,
        percentage,
        performance_band: getPerformanceBand(percentage),
        subject: subject
          ? {
              id: subject.id,
              name: subject.name,
              subject_code: subject.subject_code,
              color: subject.color,
              target_percentage: subject.target_percentage,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createAssessment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      subject_id,
      title,
      assessment_type,
      assessment_date,
      marks_obtained,
      max_marks,
      remarks,
    } = req.body;

    if (isSupabaseLive()) {
      // 1. Verify subject ownership explicitly before insertion
      const { data: subject, error: subjErr } = await req.supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subject_id)
        .eq('user_id', userId)
        .single();

      if (subjErr || !subject) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot record assessment: The specified subject does not belong to your account.',
          },
        });
      }

      const { data, error } = await req.supabase
        .from('assessments')
        .insert({
          user_id: userId,
          subject_id,
          title: title.trim(),
          assessment_type,
          assessment_date,
          marks_obtained,
          max_marks,
          remarks: remarks || null,
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

      const percentage = calculateAssessmentPercentage(data.marks_obtained, data.max_marks);
      return res.status(201).json({
        success: true,
        message: 'Assessment recorded successfully.',
        data: {
          ...data,
          percentage,
          performance_band: getPerformanceBand(percentage),
        },
      });
    }

    // Local in-memory fallback
    const subject = inMemoryStore.subjects.get(subject_id);
    if (!subject || subject.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot record assessment: The specified subject does not belong to your account.',
        },
      });
    }

    const newAssessment = {
      id: crypto.randomUUID(),
      user_id: userId,
      subject_id,
      title: title.trim(),
      assessment_type,
      assessment_date,
      marks_obtained,
      max_marks,
      remarks: remarks || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryStore.assessments.set(newAssessment.id, newAssessment);
    const percentage = calculateAssessmentPercentage(marks_obtained, max_marks);

    res.status(201).json({
      success: true,
      message: 'Assessment recorded successfully.',
      data: {
        ...newAssessment,
        percentage,
        performance_band: getPerformanceBand(percentage),
        subject: {
          id: subject.id,
          name: subject.name,
          subject_code: subject.subject_code,
          color: subject.color,
          target_percentage: subject.target_percentage,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAssessment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (updates.title) updates.title = updates.title.trim();

    if (isSupabaseLive()) {
      // If subject_id is changed, verify new subject belongs to user
      if (updates.subject_id) {
        const { data: newSubj, error: sErr } = await req.supabase
          .from('subjects')
          .select('id')
          .eq('id', updates.subject_id)
          .eq('user_id', userId)
          .single();

        if (sErr || !newSubj) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Target subject does not belong to your account.',
            },
          });
        }
      }

      const { data, error } = await req.supabase
        .from('assessments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
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

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Assessment not found or unauthorized.',
          },
        });
      }

      const percentage = calculateAssessmentPercentage(data.marks_obtained, data.max_marks);
      return res.json({
        success: true,
        message: 'Assessment updated successfully.',
        data: {
          ...data,
          percentage,
          performance_band: getPerformanceBand(percentage),
        },
      });
    }

    // Local in-memory fallback
    const assessment = inMemoryStore.assessments.get(id);
    if (!assessment || assessment.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Assessment not found or unauthorized.',
        },
      });
    }

    if (updates.subject_id) {
      const subject = inMemoryStore.subjects.get(updates.subject_id);
      if (!subject || subject.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Target subject does not belong to your account.',
          },
        });
      }
    }

    const updated = {
      ...assessment,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.assessments.set(id, updated);

    const subject = inMemoryStore.subjects.get(updated.subject_id);
    const percentage = calculateAssessmentPercentage(updated.marks_obtained, updated.max_marks);

    res.json({
      success: true,
      message: 'Assessment updated successfully.',
      data: {
        ...updated,
        percentage,
        performance_band: getPerformanceBand(percentage),
        subject: subject
          ? {
              id: subject.id,
              name: subject.name,
              subject_code: subject.subject_code,
              color: subject.color,
              target_percentage: subject.target_percentage,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAssessment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('assessments')
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
            message: 'Assessment not found or unauthorized.',
          },
        });
      }

      return res.json({
        success: true,
        message: `Assessment "${data.title}" was deleted successfully.`,
        deleted_id: id,
      });
    }

    // Local in-memory fallback
    const assessment = inMemoryStore.assessments.get(id);
    if (!assessment || assessment.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Assessment not found or unauthorized.',
        },
      });
    }

    inMemoryStore.assessments.delete(id);

    res.json({
      success: true,
      message: `Assessment "${assessment.title}" was deleted successfully.`,
      deleted_id: id,
    });
  } catch (err) {
    next(err);
  }
};
