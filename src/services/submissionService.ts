import type {
  ExistingSubmission,
  PilokSubmission,
  PilokSubmissionRequest,
} from '../types/domain'
import { fetchJson } from './apiClient'

interface ExistingSubmissionResponse {
  found: boolean
  submission: ExistingSubmission | null
}

interface SubmissionResponse {
  submission: PilokSubmission
}

export interface SubmissionService {
  getByPilok(code: string): Promise<ExistingSubmission | null>
  submit(payload: PilokSubmissionRequest): Promise<PilokSubmission>
}

class ApiSubmissionService implements SubmissionService {
  async getByPilok(code: string): Promise<ExistingSubmission | null> {
    const response = await fetchJson<ExistingSubmissionResponse>(
      `/api/submission?pilok=${encodeURIComponent(code.trim())}`,
    )
    return response.found ? response.submission : null
  }

  async submit(payload: PilokSubmissionRequest): Promise<PilokSubmission> {
    const response = await fetchJson<SubmissionResponse>('/api/submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.submission
  }
}

export const submissionService: SubmissionService =
  new ApiSubmissionService()
