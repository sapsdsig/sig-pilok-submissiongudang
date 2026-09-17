import {
  rejectMethod,
  requireQueryCode,
  sendApiError,
} from './_lib/errors.js'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { getPilokByCode } from './_lib/masterData.js'
import { getExistingSubmission, upsertSubmission } from './_lib/submissions.js'
import { validateAndNormalizeSubmission } from './_lib/submissionValidation.js'

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return rejectMethod(response, 'GET, POST')
  }

  try {
    response.setHeader('Cache-Control', 'private, no-store')

    if (request.method === 'GET') {
      const code = requireQueryCode(request.query.pilok, 'Kode PILOK')
      const pilok = await getPilokByCode(code)
      const submission = await getExistingSubmission(pilok)
      return response.status(200).json(
        submission
          ? { found: true, submission }
          : { found: false, submission: null },
      )
    }

    const normalized = await validateAndNormalizeSubmission(request.body)
    const submission = await upsertSubmission(
      normalized.pilok,
      normalized.request,
      normalized.warehouseMasters,
    )
    return response.status(200).json({ submission })
  } catch (error) {
    return sendApiError(response, error)
  }
}
