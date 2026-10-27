import { supabase, isSupabaseConfigured, API_BASE_URL } from '../config/supabase.js';

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', details = null, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * Universal fetch wrapper that automatically injects Supabase Bearer token
 */
export const apiClient = async (endpoint, options = {}) => {
  let token = null;

  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } else {
    token = localStorage.getItem('academitrack_dev_token') || 'mock-test-token';
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle CSV or file downloads
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      if (!response.ok) {
        throw new ApiError('Failed to download report', 'DOWNLOAD_ERROR', null, response.status);
      }
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = data.error || {};
      throw new ApiError(
        err.message || 'An unexpected error occurred with the request.',
        err.code || 'HTTP_ERROR',
        err.details || null,
        response.status
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err.message || 'Unable to connect to the server. Please verify your internet and backend server.',
      'NETWORK_ERROR',
      null,
      0
    );
  }
};
