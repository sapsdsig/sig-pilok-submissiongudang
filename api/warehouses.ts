import { rejectMethod, requireQueryCode, sendApiError } from './_lib/errors.js'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import {
  getPilokByCode,
  getWarehousesByPilok,
} from './_lib/masterData.js'

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== 'GET') return rejectMethod(response, 'GET')

  try {
    const code = requireQueryCode(request.query.pilok, 'Kode PILOK')
    const pilok = await getPilokByCode(code)
    const warehouses = await getWarehousesByPilok(pilok.kodePilok)
    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).json({ warehouses })
  } catch (error) {
    return sendApiError(response, error)
  }
}
