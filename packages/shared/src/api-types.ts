/**
 * Standard API Response Envelopes
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: ApiErrorDetail[] | unknown;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function createSuccessResponse<T>(
  data: T,
  requestId = 'req-system',
  meta?: PaginationMeta | Record<string, unknown>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    requestId,
  };
}

export function createErrorResponse(
  message: string,
  code = 'ERROR',
  requestId = 'req-system',
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    requestId,
  };
}
