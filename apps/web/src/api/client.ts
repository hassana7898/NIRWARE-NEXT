import { ApiClient } from '@nirware/api-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => {
    return localStorage.getItem('nirware_token');
  },
  onUnauthorized: () => {
    localStorage.removeItem('nirware_token');
    localStorage.removeItem('nirware_user');
    window.location.href = '/login';
  },
});
