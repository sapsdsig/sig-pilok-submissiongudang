interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false
  }
  const error = value.error
  return typeof error === 'object' && error !== null
}

export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    throw new ApiClientError(
      'Tidak dapat terhubung ke layanan integrasi. Periksa koneksi Anda.',
      'NETWORK_ERROR',
      0,
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const code = isErrorEnvelope(body) ? body.error?.code : undefined
    const message = isErrorEnvelope(body) ? body.error?.message : undefined
    throw new ApiClientError(
      message || 'Permintaan tidak dapat diproses.',
      code || 'API_ERROR',
      response.status,
    )
  }

  return body as T
}
