import { z } from 'zod'
import { createResumableUploadSession } from './_lib/drive.js'
import { ApiError, rejectMethod, sendApiError } from './_lib/errors.js'
import {
  getPilokByCode,
  getWarehouseForPilok,
} from './_lib/masterData.js'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { requireAllowedAppOrigin } from './_lib/appOrigin.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const uploadSessionSchema = z.object({
  kodePilok: z.string().trim().min(1),
  kodeGudang: z.string().trim().min(1),
  documentType: z.enum(['SHM', 'BUKTI_SEWA']),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.literal('application/pdf'),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
})

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== 'POST') return rejectMethod(response, 'POST')

  try {
    const origin = requireAllowedAppOrigin(request.headers.origin)
    const parsed = uploadSessionSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new ApiError(
        400,
        'REQUEST_INVALID',
        'Metadata upload PDF tidak valid. PDF wajib berukuran 1 byte sampai 10 MB.',
      )
    }

    const pilok = await getPilokByCode(parsed.data.kodePilok)
    await getWarehouseForPilok(pilok.kodePilok, parsed.data.kodeGudang)
    const session = await createResumableUploadSession({
      kodePilok: parsed.data.kodePilok,
      kodeGudang: parsed.data.kodeGudang,
      documentType: parsed.data.documentType,
      size: parsed.data.size,
      origin,
    })

    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).json(session)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && error instanceof ApiError) {
      console.error('PDF upload session error', {
        code: error.code,
        step: 'upload-session-initiation',
        status: error.status,
        message: error.message,
      })
    }
    return sendApiError(response, error)
  }
}
