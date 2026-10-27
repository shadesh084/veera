import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, API_BASE_URL } from '../config/supabase.js';

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

  // Fetch or refresh profile from backend
  const fetchProfile = useCallback(async (token) => {
    try {
      const authToken = token || (await getToken());
      if (!authToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        setProfile(json.data);
        return json.data;
      }
    } catch (err) {
      console.warn('Could not fetch user profile from API:', err);
    }
    return null;
  }, [getToken]);

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
          if (initialSession) {
            await fetchProfile(initialSession.access_token);
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
      if (newSession) {
        await fetchProfile(newSession.access_token);
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
      await fetchProfile(token);
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
    await fetchProfile(data.session.access_token);
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
      await fetchProfile(token);
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
      await fetchProfile(data.session.access_token);
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

  // Update profile handler
  const updateProfile = async (updates) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update profile');
    }

    setProfile(json.data);
    return json.data;
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
