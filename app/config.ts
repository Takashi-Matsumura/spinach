/**
 * Application configuration
 * Loads from environment variables with fallback defaults
 * Backend URL can be overridden in localStorage
 */

// Helper function to get backend URL
const getBackendUrl = (): string => {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('backendUrl');
    if (savedUrl) {
      return savedUrl;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

export const config = {
  // Backend API URL (can be overridden in localStorage)
  get backendUrl(): string {
    return getBackendUrl();
  },

  // Application Info
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Spinach',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
} as const;

export type Config = typeof config;
