import { ApiClient } from '@nirware/api-client';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => {
  return currentAuthToken;
};

// Default API URL (e.g. 10.0.2.2 for Android emulator or LAN IP)
const MOBILE_API_URL = 'http://10.0.2.2:4000/api/v1';

export const mobileApi = new ApiClient({
  baseUrl: MOBILE_API_URL,
  getToken: () => currentAuthToken,
  onUnauthorized: () => {
    currentAuthToken = null;
  },
});
