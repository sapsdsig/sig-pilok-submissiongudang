import type {
  ExistingSubmission,
  ExistingWarehouse,
  Pilok,
  PilokSubmission,
  PilokSubmissionRequest,
  WarehouseMaster,
  WarehouseSubmission,
} from '../../src/types/domain.js'
import { verifyDriveDocument } from './drive.js'
import { getSubmissionSheetConfig } from './env.js'
import { ApiError } from './errors.js'
import {
  appendRows,
  deleteRows,
  readSheetTable,
  updateRowFields,
} from './sheets.js'

export const SUBMISSION_HEADERS = [
  'kode_pilok',
  'nama_distributor',
  'area_name',
  'ada_perubahan',
  'created_at',
  'updated_at',
] as const

export const SUBMISSION_WAREHOUSE_HEADERS = [
  'kode_pilok',
  'nama_distributor',
  'area_name',
  'kode_gudang',
  'nama_gudang',
  'kapasitas_gudang',
  'status_gudang',
  'kepemilikan',
  'mulai_sewa',
  'berakhir_sewa',
  'shm_file_id',
  'shm_file_name',
  'shm_url',
  'bukti_sewa_file_id',
  'bukti_sewa_file_name',
  'bukti_sewa_url',
  'updated_at',
] as const

export async function hasExistingSubmission(
  kodePilok: string,
): Promise<boolean> {
  const config = getSubmissionSheetConfig()
  const table = await readSheetTable(
    config.spreadsheetId,
    config.submissionSheetName,
    SUBMISSION_HEADERS,
  )
  const matches = table.rows.filter(
    (row) => row.record.kode_pilok === kodePilok,
  )
  if (matches.length > 1) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Ditemukan lebih dari satu submission aktif untuk Kode PILOK ini.',
    )
  }
  return matches.length === 1
}

function readDocumentId(
  row: Readonly<Record<string, string>>,
  prefix: 'shm' | 'bukti_sewa',
): string | undefined {
  return row[`${prefix}_file_id`] || undefined
}

function readStoredCapacity(value: string, code: string): number {
  const normalized = /^\d{1,3}([.,]\d{3})+$/.test(value)
    ? value.replace(/[.,]/g, '')
    : value
  if (!/^\d+$/.test(normalized)) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Kapasitas tersimpan untuk Gudang ' + code + ' tidak valid.',
    )
  }
  const capacity = Number(normalized)
  if (!Number.isSafeInteger(capacity)) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Kapasitas tersimpan berada di luar batas angka yang didukung.',
    )
  }
  return capacity
}

export async function getExistingSubmission(
  pilok: Pilok,
): Promise<ExistingSubmission | null> {
  const config = getSubmissionSheetConfig()
  const submissionTable = await readSheetTable(
    config.spreadsheetId,
    config.submissionSheetName,
    SUBMISSION_HEADERS,
  )
  const matches = submissionTable.rows.filter(
    (row) => row.record.kode_pilok === pilok.kodePilok,
  )
  if (matches.length === 0) return null
  if (matches.length > 1) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Ditemukan lebih dari satu submission aktif untuk Kode PILOK ini.',
    )
  }

  const submissionRow = matches[0]
  if (!submissionRow) return null
  const answer = submissionRow.record.ada_perubahan
  if (answer !== 'Ya' && answer !== 'Tidak') {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Nilai ada_perubahan pada submission tersimpan tidak valid.',
    )
  }
  const createdAt = submissionRow.record.created_at ?? ''
  const updatedAt = submissionRow.record.updated_at ?? ''
  if (
    !createdAt ||
    !updatedAt ||
    !Number.isFinite(Date.parse(createdAt)) ||
    !Number.isFinite(Date.parse(updatedAt))
  ) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Timestamp pada submission tersimpan tidak valid.',
    )
  }

  const warehouseTable = await readSheetTable(
    config.spreadsheetId,
    config.warehouseSheetName,
    SUBMISSION_WAREHOUSE_HEADERS,
  )
  const storedWarehouseRows = warehouseTable.rows.filter(
    (row) => row.record.kode_pilok === pilok.kodePilok,
  )
  const storedCodes = storedWarehouseRows.map(
    (row) => row.record.kode_gudang ?? '',
  )
  if (new Set(storedCodes).size !== storedCodes.length) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Submission tersimpan memiliki Kode Gudang duplikat.',
    )
  }
  const warehouses = await Promise.all(
    storedWarehouseRows.map(async (row): Promise<ExistingWarehouse> => {
      const status = row.record.status_gudang
      if (status !== '' && status !== 'Aktif' && status !== 'Tidak Aktif') {
        throw new ApiError(
          500,
          'SUBMISSION_INVALID',
          'Status gudang pada submission tersimpan tidak valid.',
        )
      }

      if (status === 'Tidak Aktif') {
        return {
          kodeGudang: row.record.kode_gudang ?? '',
          namaGudang: row.record.nama_gudang ?? '',
          kapasitasGudang: row.record.kapasitas_gudang
            ? readStoredCapacity(
                row.record.kapasitas_gudang,
                row.record.kode_gudang ?? '',
              )
            : undefined,
          status,
          kepemilikan: '',
          updatedAt: row.record.updated_at ?? '',
        }
      }

      const kepemilikan = row.record.kepemilikan
      if (
        kepemilikan !== '' &&
        kepemilikan !== 'Milik Sendiri' &&
        kepemilikan !== 'Sewa'
      ) {
        throw new ApiError(
          500,
          'SUBMISSION_INVALID',
          'Kepemilikan gudang pada submission tersimpan tidak valid.',
        )
      }

      const shmFileId = readDocumentId(row.record, 'shm')
      const buktiSewaFileId = readDocumentId(row.record, 'bukti_sewa')
      const [shm, buktiSewa] = await Promise.all([
        shmFileId ? verifyDriveDocument(shmFileId, 'SHM') : undefined,
        buktiSewaFileId
          ? verifyDriveDocument(buktiSewaFileId, 'BUKTI_SEWA')
          : undefined,
      ])

      return {
        kodeGudang: row.record.kode_gudang ?? '',
        namaGudang: row.record.nama_gudang ?? '',
        kapasitasGudang: row.record.kapasitas_gudang
          ? readStoredCapacity(
              row.record.kapasitas_gudang,
              row.record.kode_gudang ?? '',
            )
          : undefined,
        status,
        kepemilikan,
        mulaiSewa: row.record.mulai_sewa || undefined,
        berakhirSewa: row.record.berakhir_sewa || undefined,
        shm,
        buktiSewa,
        updatedAt: row.record.updated_at ?? '',
      }
    }),
  )

  return {
    ...pilok,
    adaPerubahan: answer === 'Ya',
    createdAt,
    updatedAt,
    warehouses,
  }
}

function warehouseRecord(
  pilok: Pilok,
  warehouse: WarehouseSubmission,
  updatedAt: string,
): Readonly<Record<string, string>> {
  const base = {
    kode_pilok: pilok.kodePilok,
    nama_distributor: pilok.namaDistributor,
    area_name: pilok.areaName,
    kode_gudang: warehouse.kodeGudang,
    nama_gudang: warehouse.namaGudang,
    kapasitas_gudang: String(warehouse.kapasitasGudang),
    status_gudang: warehouse.status,
    kepemilikan: warehouse.kepemilikan,
    mulai_sewa: '',
    berakhir_sewa: '',
    shm_file_id: '',
    shm_file_name: '',
    shm_url: '',
    bukti_sewa_file_id: '',
    bukti_sewa_file_name: '',
    bukti_sewa_url: '',
    updated_at: updatedAt,
  }
  if (warehouse.status === 'Tidak Aktif') return base

  if (warehouse.kepemilikan === 'Milik Sendiri') {
    return {
      ...base,
      shm_file_id: warehouse.shm.fileId,
      shm_file_name: warehouse.shm.fileName,
      shm_url: warehouse.shm.url,
    }
  }
  return {
    ...base,
    mulai_sewa: warehouse.mulaiSewa,
    berakhir_sewa: warehouse.berakhirSewa,
    bukti_sewa_file_id: warehouse.buktiSewa.fileId,
    bukti_sewa_file_name: warehouse.buktiSewa.fileName,
    bukti_sewa_url: warehouse.buktiSewa.url,
  }
}

export async function upsertSubmission(
  pilok: Pilok,
  request: PilokSubmissionRequest,
  warehouseMasters: ReadonlyMap<string, WarehouseMaster>,
): Promise<PilokSubmission> {
  const config = getSubmissionSheetConfig()
  const [submissionTable, warehouseTable] = await Promise.all([
    readSheetTable(
      config.spreadsheetId,
      config.submissionSheetName,
      SUBMISSION_HEADERS,
    ),
    readSheetTable(
      config.spreadsheetId,
      config.warehouseSheetName,
      SUBMISSION_WAREHOUSE_HEADERS,
    ),
  ])
  const existingRows = submissionTable.rows.filter(
    (row) => row.record.kode_pilok === pilok.kodePilok,
  )
  if (existingRows.length > 1) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Ditemukan lebih dari satu submission aktif untuk Kode PILOK ini.',
    )
  }
  if (!request.adaPerubahan && existingRows.length === 0) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Pilihan Tidak hanya tersedia jika data sebelumnya sudah ada.',
    )
  }

  const updatedAt = new Date().toISOString()
  const storedCreatedAt = existingRows[0]?.record.created_at
  if (
    existingRows[0] &&
    (!storedCreatedAt || !Number.isFinite(Date.parse(storedCreatedAt)))
  ) {
    throw new ApiError(
      500,
      'SUBMISSION_INVALID',
      'Timestamp pembuatan submission tersimpan tidak valid.',
    )
  }
  const createdAt = storedCreatedAt || updatedAt
  const warehouses = request.adaPerubahan
    ? request.warehouses.map((warehouse): WarehouseSubmission => {
        const master = warehouseMasters.get(warehouse.kodeGudang)
        if (!master) {
          throw new ApiError(
            404,
            'WAREHOUSE_NOT_FOUND',
            'Kode Gudang tidak ditemukan pada hasil validasi master.',
          )
        }
        return {
          ...warehouse,
          namaGudang: master.namaGudang,
          kapasitasGudang: master.kapasitasGudang,
        }
      })
    : []

  const oldWarehouseRows = warehouseTable.rows.filter(
    (row) => row.record.kode_pilok === pilok.kodePilok,
  )
  if (request.adaPerubahan) {
    if (warehouses.length > 0) {
      await appendRows(
        config.spreadsheetId,
        config.warehouseSheetName,
        warehouseTable.headers,
        warehouses.map((warehouse) =>
          warehouseRecord(pilok, warehouse, updatedAt),
        ),
      )
    }
    await deleteRows(
      config.spreadsheetId,
      config.warehouseSheetName,
      oldWarehouseRows.map((row) => row.rowNumber),
    )
  }

  const parentRecord = {
    kode_pilok: pilok.kodePilok,
    nama_distributor: pilok.namaDistributor,
    area_name: pilok.areaName,
    ada_perubahan: request.adaPerubahan ? 'Ya' : 'Tidak',
    created_at: createdAt,
    updated_at: updatedAt,
  }
  const existingRow = existingRows[0]
  if (existingRow) {
    await updateRowFields(
      config.spreadsheetId,
      config.submissionSheetName,
      submissionTable.headers,
      existingRow.rowNumber,
      parentRecord,
    )
  } else {
    await appendRows(
      config.spreadsheetId,
      config.submissionSheetName,
      submissionTable.headers,
      [parentRecord],
    )
  }

  return {
    ...pilok,
    adaPerubahan: request.adaPerubahan,
    createdAt,
    updatedAt,
    warehouses,
  }
}
