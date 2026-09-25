import { uploadService, type DocumentType } from '../../services/uploadService'
import type {
  DriveDocumentReference,
  PilokSubmissionRequest,
  WarehouseStatus,
  WarehouseSubmissionRequest,
} from '../../types/domain'
import type { PilokFormValues, WarehouseFormValues } from './formTypes'

const isWarehouseStatus = (value: string): value is WarehouseStatus =>
  value === 'Aktif' || value === 'Tidak Aktif'

export type UploadedDocumentField = 'existingShm' | 'existingBuktiSewa'

export interface UploadedDocumentUpdate {
  index: number
  field: UploadedDocumentField
  reference: DriveDocumentReference
}

async function resolveDocument(input: {
  values: PilokFormValues
  warehouse: WarehouseFormValues
  index: number
  file: File | undefined
  existing: DriveDocumentReference | undefined
  documentType: DocumentType
  field: UploadedDocumentField
  onUploaded: (update: UploadedDocumentUpdate) => void
}) {
  if (!input.file) {
    if (!input.existing) throw new Error('Dokumen wajib tersedia.')
    return input.existing
  }

  const reference = await uploadService.uploadDocument({
    kodePilok: input.values.kodePilok,
    kodeGudang: input.warehouse.kodeGudang,
    documentType: input.documentType,
    file: input.file,
  })
  input.onUploaded({ index: input.index, field: input.field, reference })
  return reference
}

export async function buildSubmissionPayload(
  values: PilokFormValues,
  onUploaded: (update: UploadedDocumentUpdate) => void,
): Promise<PilokSubmissionRequest> {
  const warehouses = await Promise.all(
    values.warehouses.map(
      async (warehouse, index): Promise<WarehouseSubmissionRequest> => {
        if (!isWarehouseStatus(warehouse.status)) {
          throw new Error('Status Gudang tidak valid.')
        }

        if (warehouse.status === 'Tidak Aktif') {
          return {
            kodeGudang: warehouse.kodeGudang.trim(),
            status: 'Tidak Aktif',
            kepemilikan: '',
          }
        }

        if (warehouse.kepemilikan === 'Milik Sendiri') {
          const shm = await resolveDocument({
            values,
            warehouse,
            index,
            file: warehouse.shm,
            existing: warehouse.existingShm,
            documentType: 'SHM',
            field: 'existingShm',
            onUploaded,
          })
          return {
            kodeGudang: warehouse.kodeGudang.trim(),
            status: 'Aktif',
            kepemilikan: 'Milik Sendiri',
            shm,
          }
        }

        if (
          warehouse.kepemilikan === 'Sewa' &&
          warehouse.mulaiSewa &&
          warehouse.berakhirSewa
        ) {
          const buktiSewa = await resolveDocument({
            values,
            warehouse,
            index,
            file: warehouse.buktiSewa,
            existing: warehouse.existingBuktiSewa,
            documentType: 'BUKTI_SEWA',
            field: 'existingBuktiSewa',
            onUploaded,
          })
          return {
            kodeGudang: warehouse.kodeGudang.trim(),
            status: 'Aktif',
            kepemilikan: 'Sewa',
            mulaiSewa: warehouse.mulaiSewa,
            berakhirSewa: warehouse.berakhirSewa,
            buktiSewa,
          }
        }

        throw new Error('Data kepemilikan gudang tidak lengkap.')
      },
    ),
  )

  return {
    kodePilok: values.kodePilok,
    warehouses,
  }
}
