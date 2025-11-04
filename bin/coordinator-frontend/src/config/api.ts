/**
 * API Configuration
 * 
 * This configuration reads the backend API URL from environment variables.
 * In Next.js, environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_API_URL: The backend API URL (defaults to http://localhost:59059)
 */

const getApiUrl = (): string => {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_EXTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:59059';
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:59059';
};

export const API_BASE_URL = getApiUrl();

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    API_BASE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_EXTERNAL_API_URL: process.env.NEXT_PUBLIC_EXTERNAL_API_URL,
    isServer: typeof window === 'undefined',
  });
}

