import type { Pilok, WarehouseMaster } from '../../src/types/domain.js'
import {
  getPilokSheetConfig,
  getWarehouseSheetConfig,
} from './env.js'
import { ApiError } from './errors.js'
import { readSheetTable } from './sheets.js'

export const PILOK_HEADERS = [
  'kode_pilok',
  'nama_distributor',
  'area_name',
] as const

export const WAREHOUSE_HEADERS = [
  'kode_pilok',
  'kode_gudang',
  'nama_gudang',
  'kapasitas_gudang',
] as const

export async function getPilokByCode(code: string): Promise<Pilok> {
  const config = getPilokSheetConfig()
  const table = await readSheetTable(
    config.spreadsheetId,
    config.sheetName,
    PILOK_HEADERS,
  )
  const matches = table.rows.filter(
    (row) => row.record.kode_pilok === code.trim(),
  )
  if (matches.length === 0) {
    throw new ApiError(404, 'PILOK_NOT_FOUND', 'Kode PILOK tidak ditemukan.')
  }

  const records = matches.map((row) => ({
    kodePilok: row.record.kode_pilok ?? '',
    namaDistributor: row.record.nama_distributor ?? '',
    areaName: row.record.area_name ?? '',
  }))
  const first = records[0]
  if (!first) {
    throw new ApiError(404, 'PILOK_NOT_FOUND', 'Kode PILOK tidak ditemukan.')
  }
  if (!first.namaDistributor || !first.areaName) {
    throw new ApiError(
      500,
      'MASTER_DATA_CONFLICT',
      'Data master PILOK tidak lengkap.',
    )
  }
  const conflict = records.some(
    (record) =>
      record.kodePilok !== first.kodePilok ||
      record.namaDistributor !== first.namaDistributor ||
      record.areaName !== first.areaName,
  )
  if (conflict) {
    throw new ApiError(
      500,
      'MASTER_DATA_CONFLICT',
      'Kode PILOK memiliki data master yang saling bertentangan.',
    )
  }
  return first
}

function parseCapacity(value: string, code: string): number {
  const normalized = /^\d{1,3}([.,]\d{3})+$/.test(value)
    ? value.replace(/[.,]/g, '')
    : value
  if (!/^\d+$/.test(normalized)) {
    throw new ApiError(
      500,
      'MASTER_DATA_CONFLICT',
      'Kapasitas Gudang ' + code + ' tidak valid.',
    )
  }
  const capacity = Number(normalized)
  if (!Number.isSafeInteger(capacity)) {
    throw new ApiError(
      500,
      'MASTER_DATA_CONFLICT',
      'Kapasitas Gudang ' + code + ' berada di luar batas angka yang didukung.',
    )
  }
  return capacity
}

export async function getWarehousesByPilok(
  kodePilok: string,
): Promise<WarehouseMaster[]> {
  const config = getWarehouseSheetConfig()
  const table = await readSheetTable(
    config.spreadsheetId,
    config.sheetName,
    WAREHOUSE_HEADERS,
  )
  const normalizedPilok = kodePilok.trim()
  const matches = table.rows.filter(
    (row) => row.record.kode_pilok === normalizedPilok,
  )
  const seen = new Set<string>()

  return matches.map((row) => {
    const code = row.record.kode_gudang ?? ''
    const name = row.record.nama_gudang ?? ''
    const capacityText = row.record.kapasitas_gudang ?? ''
    if (!code || !name || !capacityText) {
      throw new ApiError(
        500,
        'MASTER_DATA_CONFLICT',
        'Data gudang_master untuk PILOK ' + normalizedPilok + ' tidak lengkap.',
      )
    }
    const compositeKey = normalizedPilok + ':' + code
    if (seen.has(compositeKey)) {
      throw new ApiError(
        500,
        'MASTER_DATA_CONFLICT',
        'Relasi PILOK ' +
          normalizedPilok +
          ' dan Gudang ' +
          code +
          ' muncul lebih dari satu kali pada master.',
      )
    }
    seen.add(compositeKey)
    return {
      kodePilok: normalizedPilok,
      kodeGudang: code,
      namaGudang: name,
      kapasitasGudang: parseCapacity(capacityText, code),
    }
  })
}

export async function getWarehouseForPilok(
  kodePilok: string,
  kodeGudang: string,
): Promise<WarehouseMaster> {
  const warehouses = await getWarehousesByPilok(kodePilok)
  const warehouse = warehouses.find(
    (candidate) => candidate.kodeGudang === kodeGudang.trim(),
  )
  if (!warehouse) {
    throw new ApiError(
      404,
      'WAREHOUSE_NOT_FOUND',
      'Kode Gudang tidak ditemukan untuk PILOK ini.',
    )
  }
  return warehouse
}
