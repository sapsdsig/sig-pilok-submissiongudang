import type { Pilok } from '../types/domain'
import { ApiClientError, fetchJson } from './apiClient'

export interface PilokService {
  getByCode(code: string): Promise<Pilok | null>
}

class ApiPilokService implements PilokService {
  async getByCode(code: string): Promise<Pilok | null> {
    const normalizedCode = code.trim()
    try {
      return await fetchJson<Pilok>(
        `/api/pilok?code=${encodeURIComponent(normalizedCode)}`,
      )
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'PILOK_NOT_FOUND'
      ) {
        return null
      }
      throw error
    }
  }
}

export const pilokService: PilokService = new ApiPilokService()
