import type { ApiResponse } from './http.js'

export type ApiErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'REQUEST_INVALID'
  | 'APP_ORIGIN_NOT_ALLOWED'
  | 'PILOK_NOT_FOUND'
  | 'WAREHOUSE_NOT_FOUND'
  | 'MASTER_DATA_CONFLICT'
  | 'SUBMISSION_DATA_CONFLICT'
  | 'SUBMISSION_INVALID'
  | 'DOCUMENT_INVALID'
  | 'UPLOAD_SESSION_ERROR'
  | 'GOOGLE_CONFIG_ERROR'
  | 'GOOGLE_API_ERROR'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function sendApiError(response: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message },
    })
  }

  console.error('Google integration request failed', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  })
  return response.status(502).json({
    error: {
      code: 'GOOGLE_API_ERROR',
      message: 'Layanan Google sedang tidak dapat diakses. Silakan coba kembali.',
    },
  })
}

export function rejectMethod(response: ApiResponse, allowed: string) {
  response.setHeader('Allow', allowed)
  return response.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Metode permintaan tidak didukung.',
    },
  })
}

export function requireQueryCode(
  value: string | string[] | undefined,
  label: string,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'REQUEST_INVALID', `${label} wajib diisi.`)
  }
  return value.trim()
}
