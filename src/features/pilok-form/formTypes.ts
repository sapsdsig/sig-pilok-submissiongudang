import type { DriveDocumentReference } from '../../types/domain'

export type ChangeAnswer = 'ya' | 'tidak'
export type WarehouseStatusInput = '' | 'Aktif' | 'Tidak Aktif'
export type WarehouseOwnershipInput = '' | 'Milik Sendiri' | 'Sewa'

export interface WarehouseFormValues {
  kodeGudang: string
  namaGudang: string
  kapasitasGudang: number
  status: WarehouseStatusInput
  kepemilikan: WarehouseOwnershipInput
  mulaiSewa?: string
  berakhirSewa?: string
  shm?: File
  buktiSewa?: File
  existingShm?: DriveDocumentReference
  existingBuktiSewa?: DriveDocumentReference
}

export interface PilokFormValues {
  kodePilok: string
  namaDistributor: string
  areaName: string
  adaPerubahan: ChangeAnswer
  warehouses: WarehouseFormValues[]
}
