/**
 * Typed isomorphic API Client for NIRWARE NEXT
 * Works in React Web, PWA, and React Native / Expo
 */

import { ApiResponse, AppError } from '@nirware/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null | Promise<string | null>;
  private onUnauthorized?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      const isNetworkError =
        networkErr?.name === 'TypeError' ||
        networkErr?.message?.includes('Network request failed') ||
        networkErr?.code === 'ECONNREFUSED' ||
        networkErr?.code === 'ENOTFOUND' ||
        networkErr?.code === 'ETIMEDOUT';

      if (isNetworkError) {
        throw new AppError(
          `عدم برقراری ارتباط با سرور سامانه (${this.baseUrl}). لطفاً از روشن بودن سرور و اتصال اینترنت دستگاه اطمینان حاصل فرمایید.`,
          0,
          'NETWORK_UNREACHABLE',
          { targetUrl: url, originalMessage: networkErr?.message }
        );
      }
      throw networkErr;
    }

    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      }
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      const errorMsg = !json.success ? json.error.message : 'خطای ارتباط با سرور';
      const errorCode = !json.success ? json.error.code : 'HTTP_ERROR';
      const details = !json.success ? json.error.details : undefined;
      throw new AppError(errorMsg, response.status, errorCode, details);
    }

    return json.data;
  }

  public get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = endpoint;
    if (params) {
      const query = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (query) {
        url += (url.includes('?') ? '&' : '?') + query;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      idempotencyKey,
    });
  }

  public put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
