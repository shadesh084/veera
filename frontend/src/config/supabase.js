import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials for AcademiTrack
// (Anon keys are public keys intended for client-side use with PostgreSQL RLS enabled)
const DEFAULT_SUPABASE_URL = 'https://mgwjebwyqdoafsvhfqgo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nd2plYnd5cWRvYWZzdmhmcWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMDM3NzYsImV4cCI6MjEwODY3OTc3Nn0.u-9qZVG_pUFh9GemoHUGfqiJ9DClfPuHaZefPV3qURk';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl =
  rawUrl && !rawUrl.includes('placeholder')
    ? rawUrl
    : DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  rawAnon && !rawAnon.includes('placeholder')
    ? rawAnon
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Resilient wrapper: ensures getUser() falls back to local session user if server call is delayed
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
supabase.auth.getUser = async (jwt) => {
  if (jwt) return originalGetUser(jwt);
  try {
    const res = await originalGetUser();
    if (res?.data?.user) return res;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return { data: { user: session.user }, error: null };
    }
    return res;
  } catch (err) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return { data: { user: session.user }, error: null };
    }
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch (err) {
    console.warn('getCurrentUser error:', err);
    return null;
  }
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
