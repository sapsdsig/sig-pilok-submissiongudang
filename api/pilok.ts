import { sendApiError, rejectMethod, requireQueryCode } from './_lib/errors.js'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { getPilokByCode } from './_lib/masterData.js'

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== 'GET') return rejectMethod(response, 'GET')

  try {
    const code = requireQueryCode(request.query.code, 'Kode PILOK')
    const pilok = await getPilokByCode(code)
    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).json(pilok)
  } catch (error) {
    return sendApiError(response, error)
  }
}
