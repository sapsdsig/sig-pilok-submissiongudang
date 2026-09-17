import { ApiError } from './errors.js'

const LOCAL_APP_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

function readConfiguredAppOrigin(): string | undefined {
  const configured = process.env.APP_ORIGIN?.trim()
  if (!configured) return undefined

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      'Konfigurasi APP_ORIGIN bukan origin URL yang valid.',
    )
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.origin !== configured
  ) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      'APP_ORIGIN harus berupa origin lengkap tanpa path atau trailing slash.',
    )
  }

  return parsed.origin
}

export function isAllowedAppOrigin(origin: string): boolean {
  const configured = readConfiguredAppOrigin()
  return (
    LOCAL_APP_ORIGINS.has(origin) ||
    (configured !== undefined && origin === configured)
  )
}

export function requireAllowedAppOrigin(
  originHeader: string | string[] | undefined,
): string {
  if (
    typeof originHeader !== 'string' ||
    !originHeader ||
    !isAllowedAppOrigin(originHeader)
  ) {
    throw new ApiError(
      403,
      'APP_ORIGIN_NOT_ALLOWED',
      'Origin aplikasi tidak diizinkan untuk membuat sesi upload.',
    )
  }
  return originHeader
}
