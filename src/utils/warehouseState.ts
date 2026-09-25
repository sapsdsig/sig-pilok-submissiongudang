import type { WarehouseOwnership, WarehouseStatus } from '../types/domain.js'

export interface WarehouseStateBaseline {
  originalStatus: WarehouseStatus | ''
  originalOwnership: WarehouseOwnership | ''
  finalStatus: WarehouseStatus | ''
  finalOwnership: WarehouseOwnership | ''
}

export function requiresNewOwnershipEvidence(
  state: WarehouseStateBaseline,
): boolean {
  if (state.finalStatus !== 'Aktif' || state.finalOwnership === '') {
    return false
  }

  return !(
    state.originalStatus === 'Aktif' &&
    state.originalOwnership !== '' &&
    state.finalOwnership === state.originalOwnership
  )
}
