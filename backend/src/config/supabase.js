import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const isConfigured = Boolean(config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey));

if (!isConfigured) {
  logger.warn('Supabase credentials are not fully configured. Using fallback configuration. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

// Service-role Supabase client (for server-side token validation and administrative tasks)
export const supabaseAdmin = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.serviceRoleKey || config.supabase.anonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  }
);

// Anonymous Supabase client
export const supabaseAnon = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.anonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  }
);

/**
 * Creates an authenticated Supabase client scoped to the user's JWT access token.
 * This guarantees that queries adhere strictly to Row-Level Security (RLS) policies.
 * @param {string} token - The user's JWT access token
 */
export const createAuthScopedClient = (token) => {
  return createClient(
    config.supabase.url || 'https://placeholder.supabase.co',
    config.supabase.anonKey || 'placeholder-key',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: WebSocket,
      },
    }
  );
};
