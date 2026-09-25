import { z } from 'zod'
import {
  compareNativeDates,
  parseNativeDate,
} from '../../src/utils/date.js'
import type {
  ExistingWarehouse,
  Pilok,
  PilokSubmissionRequest,
  WarehouseMaster,
  WarehouseSubmissionRequest,
} from '../../src/types/domain.js'
import { requiresNewOwnershipEvidence } from '../../src/utils/warehouseState.js'
import { verifyDriveDocument } from './drive.js'
import { ApiError } from './errors.js'
import { getPilokByCode, getWarehousesByPilok } from './masterData.js'
import { getExistingSubmission } from './submissions.js'

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
    status: z.literal('Aktif'),
    kepemilikan: z.literal('Milik Sendiri'),
    shm: documentSchema.optional(),
  })
  .strict()

const rentedWarehouseSchema = z
  .object({
    kodeGudang: z.string().trim().min(1),
    status: z.literal('Aktif'),
    kepemilikan: z.literal('Sewa'),
    mulaiSewa: z.string().refine((value) => parseNativeDate(value)).optional(),
    berakhirSewa: z.string().refine((value) => parseNativeDate(value)).optional(),
    buktiSewa: documentSchema.optional(),
  })
  .strict()
  .superRefine((warehouse, context) => {
    if (
      warehouse.mulaiSewa &&
      warehouse.berakhirSewa &&
      compareNativeDates(
        warehouse.berakhirSewa,
        warehouse.mulaiSewa,
      ) === -1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['berakhirSewa'],
        message: 'Rentang tanggal sewa tidak valid.',
      })
    }
  })

const inactiveWarehouseSchema = z
  .object({
    kodeGudang: z.string().trim().min(1),
    status: z.literal('Tidak Aktif'),
    kepemilikan: z.union([z.literal(''), z.null()]).optional(),
    mulaiSewa: z.union([z.literal(''), z.null()]).optional(),
    berakhirSewa: z.union([z.literal(''), z.null()]).optional(),
    shm: z.null().optional(),
    buktiSewa: z.null().optional(),
  })
  .strict()

export const submissionWarehouseSchema = z.union([
  inactiveWarehouseSchema,
  ownedWarehouseSchema,
  rentedWarehouseSchema,
])

export const submissionEnvelopeSchema = z
  .object({
    kodePilok: z.string().trim().min(1),
    warehouses: z.array(z.unknown()).default([]),
  })
  .strict()

export interface ValidatedSubmission {
  pilok: Pilok
  request: PilokSubmissionRequest
  warehouseMasters: ReadonlyMap<string, WarehouseMaster>
}

type ParsedSubmissionWarehouse = z.infer<typeof submissionWarehouseSchema>
type DocumentVerifier = typeof verifyDriveDocument

export async function normalizeWarehouseAgainstExisting(
  warehouse: ParsedSubmissionWarehouse,
  master: WarehouseMaster,
  existing: ExistingWarehouse | undefined,
  verifyDocument: DocumentVerifier = verifyDriveDocument,
): Promise<WarehouseSubmissionRequest> {
  if (warehouse.status === 'Tidak Aktif') {
    return {
      kodeGudang: master.kodeGudang,
      status: 'Tidak Aktif',
      kepemilikan: '',
    }
  }

  const evidenceRequired = requiresNewOwnershipEvidence({
    originalStatus: existing?.status ?? '',
    originalOwnership: existing?.kepemilikan ?? '',
    finalStatus: warehouse.status,
    finalOwnership: warehouse.kepemilikan,
  })

  if (warehouse.kepemilikan === 'Milik Sendiri') {
    if (!evidenceRequired) {
      return {
        kodeGudang: master.kodeGudang,
        status: 'Aktif',
        kepemilikan: 'Milik Sendiri',
        shm: existing?.shm,
      }
    }
    if (!warehouse.shm) {
      throw new ApiError(
        400,
        'SUBMISSION_INVALID',
        'Dokumen SHM wajib diunggah untuk perubahan kepemilikan gudang.',
      )
    }
    const shm = await verifyDocument(warehouse.shm.fileId, 'SHM')
    return {
      kodeGudang: master.kodeGudang,
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
      shm,
    }
  }

  if (!evidenceRequired) {
    return {
      kodeGudang: master.kodeGudang,
      status: 'Aktif',
      kepemilikan: 'Sewa',
      mulaiSewa: existing?.mulaiSewa,
      berakhirSewa: existing?.berakhirSewa,
      buktiSewa: existing?.buktiSewa,
    }
  }
  if (!warehouse.mulaiSewa || !warehouse.berakhirSewa || !warehouse.buktiSewa) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Tanggal dan Bukti Sewa wajib dilengkapi untuk perubahan kepemilikan gudang.',
    )
  }
  const buktiSewa = await verifyDocument(
    warehouse.buktiSewa.fileId,
    'BUKTI_SEWA',
  )
  return {
    kodeGudang: master.kodeGudang,
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: warehouse.mulaiSewa,
    berakhirSewa: warehouse.berakhirSewa,
    buktiSewa,
  }
}

export function validateWarehouseMembership(
  codes: readonly string[],
  currentWarehouses: readonly WarehouseMaster[],
): ReadonlyMap<string, WarehouseMaster> {
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
  return warehouseMasters
}

export async function validateAndNormalizeSubmission(
  rawInput: unknown,
): Promise<ValidatedSubmission> {
  const envelope = submissionEnvelopeSchema.safeParse(rawInput)
  if (!envelope.success) {
    throw new ApiError(
      400,
      'SUBMISSION_INVALID',
      'Struktur submission tidak valid.',
    )
  }

  const pilok = await getPilokByCode(envelope.data.kodePilok)
  const parsedWarehouses = z.array(submissionWarehouseSchema).min(1).safeParse(
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
  const warehouseMasters = validateWarehouseMembership(
    codes,
    currentWarehouses,
  )
  const existingSubmission = await getExistingSubmission(
    pilok,
    new Set(warehouseMasters.keys()),
  )
  const existingByCode = new Map(
    existingSubmission?.warehouses.map((warehouse) => [
      warehouse.kodeGudang,
      warehouse,
    ]) ?? [],
  )

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

        return normalizeWarehouseAgainstExisting(
          warehouse,
          master,
          existingByCode.get(master.kodeGudang),
        )
      },
    ),
  )

  return {
    pilok,
    request: {
      kodePilok: pilok.kodePilok,
      warehouses: normalizedWarehouses,
    },
    warehouseMasters,
  }
}
