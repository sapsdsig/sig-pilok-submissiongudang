import type { WarehouseMaster } from '../types/domain'
import { fetchJson } from './apiClient'

export interface WarehouseService {
  getByPilok(kodePilok: string): Promise<WarehouseMaster[]>
}

class ApiWarehouseService implements WarehouseService {
  async getByPilok(kodePilok: string): Promise<WarehouseMaster[]> {
    const response = await fetchJson<{ warehouses: WarehouseMaster[] }>(
      `/api/warehouses?pilok=${encodeURIComponent(kodePilok.trim())}`,
    )
    return response.warehouses
  }
}

export const warehouseService: WarehouseService = new ApiWarehouseService()
