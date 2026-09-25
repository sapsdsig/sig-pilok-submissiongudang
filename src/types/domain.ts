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
}

export interface OwnedWarehouseSubmission extends SubmittedWarehouseBase {
  status: 'Aktif'
  kepemilikan: 'Milik Sendiri'
  shm: DriveDocumentReference
}

export interface RentedWarehouseSubmission extends SubmittedWarehouseBase {
  status: 'Aktif'
  kepemilikan: 'Sewa'
  mulaiSewa: string
  berakhirSewa: string
  buktiSewa: DriveDocumentReference
}

export interface InactiveWarehouseSubmission extends SubmittedWarehouseBase {
  status: 'Tidak Aktif'
  kepemilikan: ''
}

export type WarehouseSubmission =
  | OwnedWarehouseSubmission
  | RentedWarehouseSubmission
  | InactiveWarehouseSubmission

export interface PilokSubmission {
  kodePilok: string
  namaDistributor: string
  areaName: string
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
  createdAt: string | null
  updatedAt: string | null
  warehouses: ExistingWarehouse[]
}

export interface OwnedWarehouseRequest {
  kodeGudang: string
  status: 'Aktif'
  kepemilikan: 'Milik Sendiri'
  shm: DriveDocumentReference
}

export interface RentedWarehouseRequest {
  kodeGudang: string
  status: 'Aktif'
  kepemilikan: 'Sewa'
  mulaiSewa: string
  berakhirSewa: string
  buktiSewa: DriveDocumentReference
}

export interface InactiveWarehouseRequest {
  kodeGudang: string
  status: 'Tidak Aktif'
  kepemilikan: ''
}

export type WarehouseSubmissionRequest =
  | OwnedWarehouseRequest
  | RentedWarehouseRequest
  | InactiveWarehouseRequest

export interface PilokSubmissionRequest {
  kodePilok: string
  warehouses: WarehouseSubmissionRequest[]
}
