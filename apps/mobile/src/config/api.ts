/**
 * NIRWARE NEXT Mobile - Central API Configuration
 *
 * Production-Safe, Fail-Closed Environment Variable Resolution
 * Injects EXPO_PUBLIC_API_URL without hardcoded hostnames or silent fallbacks.
 */

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export interface ApiConfig {
  isValid: boolean;
  baseUrl: string;
  error?: string;
}

/**
 * Validates and normalizes the API base URL from EXPO_PUBLIC_API_URL.
 * Strips trailing slashes and ensures standard HTTP/HTTPS protocol.
 */
export function validateApiUrl(url: string | undefined): ApiConfig {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isValid: false,
      baseUrl: '',
      error:
        'متغیر محیطی EXPO_PUBLIC_API_URL تعریف نشده است. به دلایل امنیتی هیچ آدرس فرضی یا محلی در پروداکشن استفاده نمی‌شود (Fail-Closed). لطفاً آدرس سرور را در .env یا تنظیمات EAS مشخص کنید.',
    };
  }

  const trimmed = url.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return {
      isValid: false,
      baseUrl: '',
      error: `آدرس API نامعتبر است (${trimmed}). پروتکل حتماً باید با http:// یا https:// آغاز شود.`,
    };
  }

  // Remove trailing slashes for consistent endpoint path joining
  const cleanUrl = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

  return {
    isValid: true,
    baseUrl: cleanUrl,
  };
}

/**
 * Resolves the current mobile API configuration from EXPO_PUBLIC_API_URL.
 */
export function getApiConfig(): ApiConfig {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  return validateApiUrl(envUrl);
}

/**
 * Returns the validated base URL. Throws ApiConfigurationError if missing or invalid.
 */
export function getApiBaseUrl(): string {
  const config = getApiConfig();
  if (!config.isValid) {
    throw new ApiConfigurationError(config.error || 'Missing EXPO_PUBLIC_API_URL');
  }
  return config.baseUrl;
}

/**
 * Checks if the API URL is properly configured.
 */
export function isApiConfigured(): boolean {
  return getApiConfig().isValid;
}
