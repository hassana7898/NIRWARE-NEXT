import { ApiClient } from '@nirware/api-client';
import { getApiConfig, ApiConfigurationError } from '../config/api';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => {
  return currentAuthToken;
};

// Central Fail-Closed API configuration
const config = getApiConfig();

export const mobileApi = new ApiClient({
  baseUrl: config.isValid ? config.baseUrl : 'https://unconfigured.nirware.invalid',
  getToken: () => currentAuthToken,
  onUnauthorized: () => {
    currentAuthToken = null;
  },
});

// Fail-closed enforcement: if EXPO_PUBLIC_API_URL is missing, block requests immediately with a clear error
if (!config.isValid) {
  const failClosed = () => {
    throw new ApiConfigurationError(
      config.error || 'EXPO_PUBLIC_API_URL is not configured. Request blocked (Fail-Closed).'
    );
  };
  mobileApi.get = failClosed as any;
  mobileApi.post = failClosed as any;
  mobileApi.put = failClosed as any;
  mobileApi.patch = failClosed as any;
  mobileApi.delete = failClosed as any;
}

