import { isSupabaseLive, inMemoryStore } from '../services/dataService.js';
import { logger } from '../utils/logger.js';

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Fallback default if trigger hasn't fired or newly registered
        return res.json({
          success: true,
          data: {
            id: userId,
            email: req.user.email,
            display_name: req.user.user_metadata?.display_name || req.user.email?.split('@')[0] || 'Student',
            academic_level: null,
            institution_name: null,
            target_percentage: 85.0,
            created_at: new Date().toISOString(),
          },
        });
      }

      return res.json({
        success: true,
        data: {
          ...data,
          email: req.user.email,
        },
      });
    }

    // Local in-memory fallback
    let profile = inMemoryStore.profiles.get(userId);
    if (!profile) {
      profile = {
        id: userId,
        display_name: req.user.email?.split('@')[0] || 'Student',
        academic_level: 'High School / College',
        institution_name: 'Academic Academy',
        target_percentage: 85.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      inMemoryStore.profiles.set(userId, profile);
    }

    res.json({
      success: true,
      data: {
        ...profile,
        email: req.user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    if (isSupabaseLive()) {
      const { data, error } = await req.supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data,
      });
    }

    // Local in-memory fallback
    const existing = inMemoryStore.profiles.get(userId) || { id: userId };
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(userId, updated);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
