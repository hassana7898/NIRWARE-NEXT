import { ApiClient } from '@nirware/api-client';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => {
  return currentAuthToken;
};

// Production and development API endpoint resolution
const env = (globalThis as any).process?.env;
const MOBILE_API_URL =
  env?.EXPO_PUBLIC_API_URL ||
  (env?.NODE_ENV === 'production'
    ? 'https://api.nirware.ir/api/v1'
    : 'http://10.0.2.2:4000/api/v1');

export const mobileApi = new ApiClient({
  baseUrl: MOBILE_API_URL,
  getToken: () => currentAuthToken,
  onUnauthorized: () => {
    currentAuthToken = null;
  },
});
