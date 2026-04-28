/**
 * API Configuration with environment switching
 */

import { CRM_API_URL } from './env';

export type ApiEnvironment = 'local' | 'production';

const API_ENVIRONMENTS = {
  local: 'http://localhost:89',
  production: CRM_API_URL,
} as const;

const API_ENV_STORAGE_KEY = 'api_environment';

/**
 * Get current API environment from localStorage or default to production
 */
export const getApiEnvironment = (): ApiEnvironment => {
  if (typeof window === 'undefined') return 'production';
  
  const stored = localStorage.getItem(API_ENV_STORAGE_KEY) as ApiEnvironment | null;
  if (stored && (stored === 'local' || stored === 'production')) {
    return stored;
  }
  
  // Default to production
  return 'production';
};

/**
 * Set API environment
 */
export const setApiEnvironment = (env: ApiEnvironment): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_ENV_STORAGE_KEY, env);
};

/**
 * Get current API base URL
 */
export const getApiBaseUrl = (): string => {
  const env = getApiEnvironment();
  return API_ENVIRONMENTS[env];
};

/**
 * Toggle between local and production
 */
export const toggleApiEnvironment = (): ApiEnvironment => {
  const current = getApiEnvironment();
  const next = current === 'local' ? 'production' : 'local';
  setApiEnvironment(next);
  return next;
};

/**
 * Get full API URL for a route
 * For registration endpoint, it doesn't use /api/v1 prefix
 */
export const getApiUrl = (route: string, useApiV1: boolean = true): string => {
  const baseUrl = getApiBaseUrl();
  const prefix = useApiV1 ? '/api/v1' : '';
  // Remove leading slash from route if present to avoid double slashes
  const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
  // Ensure no double slashes
  const url = `${baseUrl}${prefix}/${cleanRoute}`.replace(/([^:]\/)\/+/g, '$1');
  return url;
};

