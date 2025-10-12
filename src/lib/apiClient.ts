import { supabase } from './supabase';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function authenticatedFetch(url: string, options: ApiRequestOptions = {}) {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // If we get a 401 or 403, the user might need to re-authenticate
  if (response.status === 401 || response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Authentication failed');
  }

  return response;
}
