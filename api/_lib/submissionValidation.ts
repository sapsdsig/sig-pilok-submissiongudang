import { z } from 'zod'
import type {
  Pilok,
  PilokSubmissionRequest,
  WarehouseMaster,
  WarehouseSubmissionRequest,
} from '../../src/types/domain.js'
import { verifyDriveDocument } from './drive.js'
import { ApiError } from './errors.js'
import {
  getPilokByCode,
  getWarehousesByPilok,
} from './masterData.js'
import { hasExistingSubmission } from './submissions.js'

const documentSchema = z
  .object({
    fileId: z.string().trim().min(1),
    fileName: z.string().optional(),
    url: z.string().optional(),
  })
  .strict()

const ownedWarehouseSchema = z
  .object({
    kodeGudang: z.string().trim().min(1),
    status: z.enum(['Aktif', 'Tidak Aktif']),
    kepemilikan: z.literal('Milik Sendiri'),
    shm: documentSchema,
  })
  .strict()

const rentedWarehouseSchema = z
  .object({
    kodeGudang: z.string().trim().min(1),
    status: z.enum(['Aktif', 'Tidak Aktif']),
    kepemilikan: z.literal('Sewa'),
    mulaiSewa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    berakhirSewa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    buktiSewa: documentSchema,
  })
  .strict()

const warehouseSchema = z.discriminatedUnion('kepemilikan', [
  ownedWarehouseSchema,
  rentedWarehouseSchema,
])

const envelopeSchema = z
  .object({
    kodePilok: z.string().trim().min(1),
    adaPerubahan: z.boolean(),
    warehouses: z.array(z.unknown()).default([]),
  })
  .strict()

function validDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === (month ?? 1) - 1 &&
    parsed.getUTCDate() === day
  )
}

export interface ValidatedSubmission {
  pilok: Pilok
  request: PilokSubmissionRequest
  warehouseMasters: ReadonlyMap<string, WarehouseMaster>
}

export async function validateAndNormalizeSubmission(
  rawInput: unknown,
): Promise<ValidatedSubmission> {
  const envelope = envelopeSchema.safeParse(rawInput)
  if (!envelope.success) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Struktur submission tidak valid.',
    )
  }

  const pilok = await getPilokByCode(envelope.data.kodePilok)
  if (!envelope.data.adaPerubahan) {
    if (!(await hasExistingSubmission(pilok.kodePilok))) {
      throw new ApiError(
        400,
        'SUBMISSION_INVALID',
        'Pilihan Tidak hanya tersedia jika data sebelumnya sudah ada.',
      )
    }
    return {
      pilok,
      request: {
        kodePilok: pilok.kodePilok,
        adaPerubahan: false,
        warehouses: [],
      },
      warehouseMasters: new Map(),
    }
  }

  const parsedWarehouses = z.array(warehouseSchema).min(1).safeParse(
    envelope.data.warehouses,
  )
  if (!parsedWarehouses.success) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Data gudang tidak lengkap atau mengandung field yang tidak sesuai.',
    )
  }

  const codes = parsedWarehouses.data.map((warehouse) =>
    warehouse.kodeGudang.trim(),
  )
  if (new Set(codes).size !== codes.length) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Kode Gudang tidak boleh digunakan lebih dari satu kali.',
    )
  }

  const currentWarehouses = await getWarehousesByPilok(pilok.kodePilok)
  if (currentWarehouses.length === 0) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'PILOK ini belum memiliki gudang pada master data.',
    )
  }
  const warehouseMasters = new Map(
    currentWarehouses.map((warehouse) => [
      warehouse.kodeGudang,
      warehouse,
    ]),
  )
  if (
    codes.length !== warehouseMasters.size ||
    codes.some((code) => !warehouseMasters.has(code))
  ) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Daftar gudang harus sama dengan gudang master terkini untuk PILOK ini.',
    )
  }

  const normalizedWarehouses = await Promise.all(
    parsedWarehouses.data.map(
      async (warehouse): Promise<WarehouseSubmissionRequest> => {
        const master = warehouseMasters.get(warehouse.kodeGudang.trim())
        if (!master) {
          throw new ApiError(
            404,
            'WAREHOUSE_NOT_FOUND',
            'Kode Gudang tidak ditemukan.',
          )
        }

        if (warehouse.kepemilikan === 'Milik Sendiri') {
          const shm = await verifyDriveDocument(warehouse.shm.fileId, 'SHM')
          return {
            kodeGudang: master.kodeGudang,
            status: warehouse.status,
            kepemilikan: 'Milik Sendiri',
            shm,
          }
        }

        if (
          !validDate(warehouse.mulaiSewa) ||
          !validDate(warehouse.berakhirSewa) ||
          warehouse.berakhirSewa < warehouse.mulaiSewa
        ) {
          throw new ApiError(
            400,
            'SUBMISSION_INVALID',
            'Rentang tanggal sewa tidak valid.',
          )
        }
        const buktiSewa = await verifyDriveDocument(
          warehouse.buktiSewa.fileId,
          'BUKTI_SEWA',
        )
        return {
          kodeGudang: master.kodeGudang,
          status: warehouse.status,
          kepemilikan: 'Sewa',
          mulaiSewa: warehouse.mulaiSewa,
          berakhirSewa: warehouse.berakhirSewa,
          buktiSewa,
        }
      },
    ),
  )

  return {
    pilok,
    request: {
      kodePilok: pilok.kodePilok,
      adaPerubahan: true,
      warehouses: normalizedWarehouses,
    },
    warehouseMasters,
  }
}
