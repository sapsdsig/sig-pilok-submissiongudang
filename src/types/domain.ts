export interface Pilok {
  kodePilok: string
  namaDistributor: string
  areaName: string
}

export interface WarehouseMaster {
  kodePilok: string
  kodeGudang: string
  namaGudang: string
  kapasitasGudang: number
}

export type WarehouseStatus = 'Aktif' | 'Tidak Aktif'
export type WarehouseOwnership = 'Milik Sendiri' | 'Sewa'

export interface DriveDocumentReference {
  fileId: string
  fileName: string
  url: string
}

interface SubmittedWarehouseBase {
  kodeGudang: string
  namaGudang: string
  kapasitasGudang: number
  status: WarehouseStatus
}

export interface OwnedWarehouseSubmission extends SubmittedWarehouseBase {
  kepemilikan: 'Milik Sendiri'
  shm: DriveDocumentReference
}

export interface RentedWarehouseSubmission extends SubmittedWarehouseBase {
  kepemilikan: 'Sewa'
  mulaiSewa: string
  berakhirSewa: string
  buktiSewa: DriveDocumentReference
}

export type WarehouseSubmission =
  | OwnedWarehouseSubmission
  | RentedWarehouseSubmission

export interface PilokSubmission {
  kodePilok: string
  namaDistributor: string
  areaName: string
  adaPerubahan: boolean
  createdAt: string
  updatedAt: string
  warehouses: WarehouseSubmission[]
}

export interface ExistingWarehouse {
  kodeGudang: string
  namaGudang: string
  kapasitasGudang?: number
  status: WarehouseStatus | ''
  kepemilikan: WarehouseOwnership | ''
  mulaiSewa?: string
  berakhirSewa?: string
  shm?: DriveDocumentReference
  buktiSewa?: DriveDocumentReference
  updatedAt: string
}

export interface ExistingSubmission {
  kodePilok: string
  namaDistributor: string
  areaName: string
  adaPerubahan: boolean
  createdAt: string
  updatedAt: string
  warehouses: ExistingWarehouse[]
}

export interface OwnedWarehouseRequest {
  kodeGudang: string
  status: WarehouseStatus
  kepemilikan: 'Milik Sendiri'
  shm: DriveDocumentReference
}

export interface RentedWarehouseRequest {
  kodeGudang: string
  status: WarehouseStatus
  kepemilikan: 'Sewa'
  mulaiSewa: string
  berakhirSewa: string
  buktiSewa: DriveDocumentReference
}

export type WarehouseSubmissionRequest =
  | OwnedWarehouseRequest
  | RentedWarehouseRequest

export interface PilokSubmissionRequest {
  kodePilok: string
  adaPerubahan: boolean
  warehouses: WarehouseSubmissionRequest[]
}
