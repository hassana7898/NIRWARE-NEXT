import { ApiClient } from '@nirware/api-client';
import { getApiConfig, ApiConfigurationError } from '../config/api';
import { isDemoModeActive } from '../config/demo';
import { DemoAdapter } from './demo.adapter';

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

// Preserve prototype methods bound to mobileApi instance
const origGet = mobileApi.get.bind(mobileApi);
const origPost = mobileApi.post.bind(mobileApi);
const origPut = mobileApi.put.bind(mobileApi);
const origPatch = mobileApi.patch.bind(mobileApi);
const origDelete = mobileApi.delete.bind(mobileApi);

// Wrap request methods with Demo Mode interception
mobileApi.get = async function <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  if (isDemoModeActive()) {
    return (await DemoAdapter.handleGet(endpoint)) as T;
  }
  if (!getApiConfig().isValid && !(mobileApi.getBaseUrl() && mobileApi.getBaseUrl().startsWith('http'))) {
    throw new ApiConfigurationError(config.error || 'EXPO_PUBLIC_API_URL is not configured (Fail-Closed).');
  }
  return origGet(endpoint, params);
};

mobileApi.post = async function <T>(endpoint: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  if (isDemoModeActive()) {
    return (await DemoAdapter.handlePost(endpoint, body)) as T;
  }
  if (!getApiConfig().isValid && !(mobileApi.getBaseUrl() && mobileApi.getBaseUrl().startsWith('http'))) {
    throw new ApiConfigurationError(config.error || 'EXPO_PUBLIC_API_URL is not configured (Fail-Closed).');
  }
  return origPost(endpoint, body, idempotencyKey);
};

mobileApi.put = async function <T>(endpoint: string, body?: unknown): Promise<T> {
  if (isDemoModeActive()) {
    return (await DemoAdapter.handlePost(endpoint, body)) as T;
  }
  if (!getApiConfig().isValid && !(mobileApi.getBaseUrl() && mobileApi.getBaseUrl().startsWith('http'))) {
    throw new ApiConfigurationError(config.error || 'EXPO_PUBLIC_API_URL is not configured (Fail-Closed).');
  }
  return origPut(endpoint, body);
};

mobileApi.patch = async function <T>(endpoint: string, body?: unknown): Promise<T> {
  if (isDemoModeActive()) {
    return (await DemoAdapter.handlePost(endpoint, body)) as T;
  }
  if (!getApiConfig().isValid && !(mobileApi.getBaseUrl() && mobileApi.getBaseUrl().startsWith('http'))) {
    throw new ApiConfigurationError(config.error || 'EXPO_PUBLIC_API_URL is not configured (Fail-Closed).');
  }
  return origPatch(endpoint, body);
};

mobileApi.delete = async function <T>(endpoint: string): Promise<T> {
  if (isDemoModeActive()) {
    return (await DemoAdapter.handlePost(endpoint, undefined)) as T;
  }
  if (!getApiConfig().isValid && !(mobileApi.getBaseUrl() && mobileApi.getBaseUrl().startsWith('http'))) {
    throw new ApiConfigurationError(config.error || 'EXPO_PUBLIC_API_URL is not configured (Fail-Closed).');
  }
  return origDelete(endpoint);
};

export const setMobileApiBaseUrl = (newUrl: string) => {
  mobileApi.setBaseUrl(newUrl);
};
