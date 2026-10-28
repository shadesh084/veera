import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Retrieve user access token for backend requests
  const getToken = useCallback(async () => {
    if (session?.access_token) {
      return session.access_token;
    }
    if (!isSupabaseConfigured) {
      const devToken = localStorage.getItem('academitrack_dev_token');
      return devToken || 'mock-test-token';
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [session]);

  // Fetch or refresh profile directly from Supabase
  const fetchProfile = useCallback(async (userOrId) => {
    try {
      // Accept a user object, a UUID string, or fall back to current session
      let userId;
      if (userOrId && typeof userOrId === 'object' && userOrId.id) {
        userId = userOrId.id;
      } else if (userOrId && typeof userOrId === 'string' && !userOrId.startsWith('dev-mock') && !userOrId.startsWith('mock')) {
        // It's a real UUID — get the current user to fetch profile
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id;
      } else if (!userOrId) {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id;
      }

      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        return data;
      }

      // Profile row may not exist yet for new users — return a minimal default
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const defaultProfile = {
        id: userId,
        email: authUser?.email,
        display_name: authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'Student',
        academic_level: null,
        institution_name: null,
        target_percentage: 85.0,
      };
      setProfile(defaultProfile);
      return defaultProfile;
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
    return null;
  }, []);

  // Initialize session and listen for auth changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Local fallback mode when Supabase credentials have not been configured yet
          const savedMockUser = localStorage.getItem('academitrack_dev_user');
          if (savedMockUser) {
            const parsed = JSON.parse(savedMockUser);
            if (mounted) {
              setUser(parsed);
              setSession({
                access_token: localStorage.getItem('academitrack_dev_token') || 'dev-mock-token-00000000-0000-0000-0000-000000000001',
                user: parsed,
              });
              await fetchProfile('mock-test-token');
            }
          }
          if (mounted) setLoading(false);
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchProfile(initialSession.user);
          }
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Setup listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // Login handler
  const login = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Local dev simulated login
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        user_metadata: { display_name: email.split('@')[0] },
      };
      const token = 'dev-mock-token-00000000-0000-0000-0000-000000000001';
      localStorage.setItem('academitrack_dev_user', JSON.stringify(mockUser));
      localStorage.setItem('academitrack_dev_token', token);
      setUser(mockUser);
      setSession({ access_token: token, user: mockUser });
      setProfile({ id: mockUser.id, display_name: mockUser.user_metadata?.display_name || mockUser.email?.split('@')[0], target_percentage: 85.0 });
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setSession(data.session);
    setUser(data.user);
    await fetchProfile(data.user);
    return { success: true };
  };

  // Register handler
  const register = async (email, password, displayName) => {
    if (!isSupabaseConfigured) {
      // Local dev simulated registration
      const newUserId = crypto.randomUUID();
      const mockUser = {
        id: newUserId,
        email,
        user_metadata: { display_name: displayName || email.split('@')[0] },
      };
      const token = `dev-mock-token-${newUserId}`;
      localStorage.setItem('academitrack_dev_user', JSON.stringify(mockUser));
      localStorage.setItem('academitrack_dev_token', token);
      setUser(mockUser);
      setSession({ access_token: token, user: mockUser });
      setProfile({ id: newUserId, display_name: displayName || mockUser.email?.split('@')[0], target_percentage: 85.0 });
      return { success: true, emailConfirmationRequired: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) throw error;

    const emailConfirmationRequired = Boolean(data.user && !data.session);
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      await fetchProfile(data.user);
    }

    return {
      success: true,
      emailConfirmationRequired,
      user: data.user,
    };
  };

  // Password reset handler
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
    return { success: true };
  };

  // Logout handler
  const logout = async () => {
    localStorage.removeItem('academitrack_dev_user');
    localStorage.removeItem('academitrack_dev_token');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Update profile handler — writes directly to Supabase
  const updateProfile = async (updates) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', authUser.id)
      .select()
      .single();

    if (error) throw new Error(error.message || 'Failed to update profile');

    setProfile(data);
    return data;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    getToken,
    refreshProfile: () => fetchProfile(),
    isConfigured: isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
