import type {
  ExistingSubmission,
  WarehouseMaster,
} from '../../types/domain'
import type { WarehouseFormValues } from './formTypes'

export function mergeWarehouseFormValues(
  masterWarehouses: readonly WarehouseMaster[],
  existingSubmission: ExistingSubmission | null,
): WarehouseFormValues[] {
  const existingByCode = new Map(
    existingSubmission?.warehouses.map((warehouse) => [
      warehouse.kodeGudang,
      warehouse,
    ]) ?? [],
  )

  return masterWarehouses.map((master) => {
    const existing = existingByCode.get(master.kodeGudang)
    const isInactive = existing?.status === 'Tidak Aktif'
    return {
      kodeGudang: master.kodeGudang,
      namaGudang: master.namaGudang,
      kapasitasGudang: master.kapasitasGudang,
      status: existing?.status ?? '',
      kepemilikan: isInactive ? '' : (existing?.kepemilikan ?? ''),
      mulaiSewa: isInactive ? undefined : existing?.mulaiSewa,
      berakhirSewa: isInactive ? undefined : existing?.berakhirSewa,
      existingShm: isInactive ? undefined : existing?.shm,
      existingBuktiSewa: isInactive ? undefined : existing?.buktiSewa,
    }
  })
}
