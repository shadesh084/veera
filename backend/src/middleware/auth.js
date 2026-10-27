import { supabaseAdmin, createAuthScopedClient } from '../config/supabase.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware that validates Supabase JWT access tokens.
 * Enforces server-side authentication without trusting client-supplied user IDs.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing or malformed Bearer token.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    // Check if Supabase credentials are configured
    const isSupabaseConfigured = Boolean(
      config.supabase.url && 
      !config.supabase.url.includes('placeholder') &&
      config.supabase.serviceRoleKey &&
      !config.supabase.serviceRoleKey.includes('placeholder')
    );

    if (!isSupabaseConfigured) {
      // In local dev/test environment when credentials have not been configured yet,
      // allow a simulated local development user if explicitly marked
      if (token.startsWith('dev-mock-token-') || token === 'mock-test-token') {
        const mockUserId = token.startsWith('dev-mock-token-') 
          ? token.replace('dev-mock-token-', '') 
          : '00000000-0000-0000-0000-000000000001';
        
        req.user = {
          id: mockUserId,
          email: 'student@example.com',
          user_metadata: { display_name: 'Dev Student' },
        };
        req.supabase = createAuthScopedClient(token);
        return next();
      }
    }

    // Verify token with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      logger.warn('Failed token verification:', { error: error?.message });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired session. Please log in again.',
        },
      });
    }

    req.user = data.user;
    req.supabase = createAuthScopedClient(token);
    next();
  } catch (err) {
    logger.error('Authentication middleware exception:', { error: err.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_SERVER_ERROR',
        message: 'Internal error during authentication verification.',
      },
    });
  }
};
