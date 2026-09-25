import assert from 'node:assert/strict'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFormControl, type FieldPath } from 'react-hook-form'
import {
  getWibTimestamp,
  isSupportedStoredTimestamp,
} from '../api/_lib/dateTime.js'
import {
  normalizeWarehouseAgainstExisting,
  submissionEnvelopeSchema,
  submissionWarehouseSchema,
  validateWarehouseMembership,
} from '../api/_lib/submissionValidation.js'
import {
  PILOK_HEADERS,
  WAREHOUSE_HEADERS,
} from '../api/_lib/masterData.js'
import {
  planParentUpsert,
  planWarehouseUpserts,
  resolveExistingParentMetadata,
  resolveSubmissionTimestamps,
  SUBMISSION_HEADERS,
  SUBMISSION_WAREHOUSE_HEADERS,
  warehouseRecord,
} from '../api/_lib/submissions.js'
import { buildSubmissionPayload } from '../src/features/pilok-form/buildPayload.js'
import type {
  PilokFormValues,
  WarehouseFormValues,
} from '../src/features/pilok-form/formTypes.js'
import { mergeWarehouseFormValues } from '../src/features/pilok-form/mergeWarehouseState.js'
import { createPilokFormSchema } from '../src/features/pilok-form/schema.js'
import { uploadService } from '../src/services/uploadService.js'
import type { ExistingSubmission } from '../src/types/domain.js'
import {
  compareNativeDates,
  formatNativeDate,
  formatPersistedRentalDate,
  normalizeStoredRentalDate,
  parseNativeDate,
} from '../src/utils/date.js'
import { requiresNewOwnershipEvidence } from '../src/utils/warehouseState.js'

Object.assign(globalThis, { React })
const { PilokMainForm } = await import(
  '../src/features/pilok-form/PilokMainForm.js'
)

const schema = createPilokFormSchema()

assert.deepEqual(PILOK_HEADERS, [
  'kode_pilok',
  'nama_distributor',
  'area_name',
])
assert.deepEqual(WAREHOUSE_HEADERS, [
  'kode_pilok',
  'kode_gudang',
  'nama_gudang',
  'kapasitas_gudang',
])
assert.deepEqual(SUBMISSION_HEADERS, [
  'kode_pilok',
  'nama_distributor',
  'area_name',
  'created_at',
  'updated_at',
])
assert.deepEqual(SUBMISSION_WAREHOUSE_HEADERS, [
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
])

for (const value of ['2026-05-01', '2026-12-31', '2028-02-29']) {
  assert.notEqual(parseNativeDate(value), null, `${value} harus valid.`)
}
for (const value of [
  '2027-02-29',
  '21-09-2026',
  '21:09:2026',
  '01/05/2026',
  '2026-01-32',
]) {
  assert.equal(parseNativeDate(value), null, `${value} harus ditolak.`)
}
assert.equal(
  formatNativeDate({ day: 21, month: 9, year: 2026 }),
  '2026-09-21',
)
assert.equal(formatPersistedRentalDate('2026-09-21'), '21-09-2026')
assert.equal(compareNativeDates('2027-09-18', '2026-09-18'), 1)
assert.equal(compareNativeDates('2026-09-18', '2026-09-18'), 0)
assert.equal(compareNativeDates('2026-09-17', '2026-09-18'), -1)
assert.equal(normalizeStoredRentalDate('21-09-2026'), '2026-09-21')
assert.equal(normalizeStoredRentalDate('2026-09-21'), '2026-09-21')
assert.equal(normalizeStoredRentalDate('21:09:2026'), '2026-09-21')

const fixedUtc = new Date('2026-09-21T03:14:32.000Z')
assert.equal(getWibTimestamp(fixedUtc), '21-09-2026 10:14:32')
assert.equal(isSupportedStoredTimestamp('21-09-2026 10:14:32'), true)
assert.equal(isSupportedStoredTimestamp('2026-09-21 10:14:32'), true)
assert.equal(
  isSupportedStoredTimestamp('2026-09-21T03:14:32.000Z'),
  true,
)
assert.equal(isSupportedStoredTimestamp('21-09-2026 25:14:32'), false)
assert.deepEqual(resolveSubmissionTimestamps(null, fixedUtc), {
  createdAt: '21-09-2026 10:14:32',
  updatedAt: '21-09-2026 10:14:32',
})
assert.deepEqual(
  resolveSubmissionTimestamps(
    '2026-09-18T07:04:19.924Z',
    new Date('2026-09-21T04:15:33.000Z'),
  ),
  {
    createdAt: '2026-09-18T07:04:19.924Z',
    updatedAt: '21-09-2026 11:15:33',
  },
)
assert.deepEqual(
  resolveSubmissionTimestamps(
    '21-09-2026 10:14:32',
    new Date('2026-09-22T03:14:32.000Z'),
  ),
  {
    createdAt: '21-09-2026 10:14:32',
    updatedAt: '22-09-2026 10:14:32',
  },
)

const qaPilok = {
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
}
const existingParentRows = [
  {
    rowNumber: 2,
    values: [],
    record: {
      kode_pilok: '10001',
      created_at: '21-09-2026 10:14:32',
      updated_at: '22-09-2026 10:14:32',
    },
  },
]
assert.deepEqual(
  resolveExistingParentMetadata('10001', existingParentRows, true),
  {
    createdAt: '21-09-2026 10:14:32',
    updatedAt: '22-09-2026 10:14:32',
  },
)
assert.deepEqual(resolveExistingParentMetadata('10001', [], true), {
  createdAt: null,
  updatedAt: null,
})
assert.equal(resolveExistingParentMetadata('10001', [], false), null)

const insertedParentPlan = planParentUpsert(qaPilok, [], fixedUtc)
assert.equal(insertedParentPlan.operation, 'insert')
assert.deepEqual(insertedParentPlan.record, {
  kode_pilok: '10001',
  nama_distributor: 'Distributor QA',
  area_name: 'Area QA',
  created_at: '21-09-2026 10:14:32',
  updated_at: '21-09-2026 10:14:32',
})
const updatedParentPlan = planParentUpsert(
  qaPilok,
  [
    {
      rowNumber: 2,
      values: [],
      record: insertedParentPlan.record,
    },
  ],
  new Date('2026-09-22T03:14:32.000Z'),
)
assert.equal(updatedParentPlan.operation, 'update')
assert.equal(updatedParentPlan.createdAt, '21-09-2026 10:14:32')
assert.equal(updatedParentPlan.updatedAt, '22-09-2026 10:14:32')
if (updatedParentPlan.operation === 'update') {
  assert.equal(updatedParentPlan.rowNumber, 2)
}

const baseWarehouse: WarehouseFormValues = {
  kodeGudang: 'G001',
  namaGudang: 'Gudang QA',
  kapasitasGudang: 100,
  originalStatus: '',
  originalKepemilikan: '',
  status: 'Aktif',
  kepemilikan: '',
}

const valuesWith = (warehouse: WarehouseFormValues): PilokFormValues => ({
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
  warehouses: [warehouse],
})

assert.equal(
  submissionEnvelopeSchema.safeParse({
    kodePilok: '10001',
    warehouses: [],
  }).success,
  true,
  'Envelope submission tidak memerlukan ada_perubahan.',
)
assert.equal(
  submissionEnvelopeSchema.safeParse({
    kodePilok: '10001',
    adaPerubahan: true,
    warehouses: [],
  }).success,
  false,
  'Envelope submission menolak field ada_perubahan yang sudah usang.',
)

const membershipMasters = [
  {
    kodePilok: '10001',
    kodeGudang: 'A',
    namaGudang: 'Gudang A',
    kapasitasGudang: 100,
  },
  {
    kodePilok: '10001',
    kodeGudang: 'B',
    namaGudang: 'Gudang B',
    kapasitasGudang: 200,
  },
]
assert.equal(
  validateWarehouseMembership(['A', 'B'], membershipMasters).size,
  2,
)
assert.throws(
  () => validateWarehouseMembership(['A'], membershipMasters),
  /Daftar gudang harus sama/,
)
assert.throws(
  () => validateWarehouseMembership(['A', 'B', 'X'], membershipMasters),
  /Daftar gudang harus sama/,
)

const validationMessages = (values: PilokFormValues) => {
  const result = schema.safeParse(values)
  assert.equal(result.success, false, 'Form seharusnya tidak valid.')
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

assert.deepEqual(
  validationMessages(valuesWith({ ...baseWarehouse, status: '' })),
  ['Status Gudang wajib dipilih.'],
)
assert.deepEqual(validationMessages(valuesWith(baseWarehouse)), [
  'Kepemilikan Gudang wajib dipilih.',
])
assert.deepEqual(
  validationMessages(
    valuesWith({ ...baseWarehouse, kepemilikan: 'Milik Sendiri' }),
  ),
  ['Dokumen SHM wajib diunggah.'],
)
assert.deepEqual(
  validationMessages(
    valuesWith({ ...baseWarehouse, kepemilikan: 'Sewa' }),
  ),
  [
    'Tanggal mulai sewa wajib diisi.',
    'Tanggal berakhir sewa wajib diisi.',
    'Bukti sewa wajib diunggah.',
  ],
)
assert.deepEqual(
  validationMessages({
    ...valuesWith({ ...baseWarehouse, status: '' }),
    warehouses: [
      { ...baseWarehouse, status: '' },
      {
        ...baseWarehouse,
        kodeGudang: 'G002',
        namaGudang: 'Gudang QA 2',
        status: '',
      },
    ],
  }),
  ['Status Gudang wajib dipilih.', 'Status Gudang wajib dipilih.'],
)

const existingDocument = {
  fileId: 'existing-file',
  fileName: 'existing.pdf',
  url: 'https://example.invalid/existing-file',
}
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      kepemilikan: 'Sewa',
      mulaiSewa: '2026-12-31',
      berakhirSewa: '2026-01-01',
      buktiSewa: new File(['pdf'], 'sewa.pdf', {
        type: 'application/pdf',
      }),
    }),
  ),
  [
    'Tanggal berakhir sewa tidak boleh lebih awal dari tanggal mulai sewa.',
  ],
)
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      kepemilikan: 'Milik Sendiri',
      shm: new File(['not-pdf'], 'shm.txt', { type: 'text/plain' }),
    }),
  ),
  ['File harus berformat PDF.'],
)
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      kepemilikan: 'Milik Sendiri',
      shm: new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'shm.pdf', {
        type: 'application/pdf',
      }),
    }),
  ),
  ['Ukuran file maksimal 10 MB.'],
)
assert.equal(
  schema.safeParse(
    valuesWith({
      ...baseWarehouse,
      originalStatus: 'Aktif',
      originalKepemilikan: 'Milik Sendiri',
      kepemilikan: 'Milik Sendiri',
    }),
  ).success,
  true,
  'Milik Sendiri existing yang tidak berubah tidak memerlukan SHM baru.',
)
assert.equal(
  schema.safeParse(
    valuesWith({
      ...baseWarehouse,
      originalStatus: 'Aktif',
      originalKepemilikan: 'Sewa',
      kepemilikan: 'Sewa',
    }),
  ).success,
  true,
  'Sewa existing yang tidak berubah tidak memerlukan evidence baru.',
)
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      originalStatus: 'Aktif',
      originalKepemilikan: 'Sewa',
      kepemilikan: 'Milik Sendiri',
    }),
  ),
  ['Dokumen SHM wajib diunggah.'],
)
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      originalStatus: 'Aktif',
      originalKepemilikan: 'Milik Sendiri',
      kepemilikan: 'Sewa',
    }),
  ),
  [
    'Tanggal mulai sewa wajib diisi.',
    'Tanggal berakhir sewa wajib diisi.',
    'Bukti sewa wajib diunggah.',
  ],
)
assert.deepEqual(
  validationMessages(
    valuesWith({
      ...baseWarehouse,
      originalStatus: 'Tidak Aktif',
      originalKepemilikan: '',
      kepemilikan: 'Milik Sendiri',
    }),
  ),
  ['Dokumen SHM wajib diunggah.'],
)

const liveForm = createFormControl<PilokFormValues>({
  resolver: zodResolver(schema),
  mode: 'onChange',
  reValidateMode: 'onChange',
  shouldUnregister: false,
  defaultValues: valuesWith({
    ...baseWarehouse,
    status: '',
    kepemilikan: '',
  }),
})
const livePaths = {
  warehouse: 'warehouses.0',
  status: 'warehouses.0.status',
  ownership: 'warehouses.0.kepemilikan',
  startDate: 'warehouses.0.mulaiSewa',
  endDate: 'warehouses.0.berakhirSewa',
  shm: 'warehouses.0.shm',
  rentalProof: 'warehouses.0.buktiSewa',
} as const satisfies Record<string, FieldPath<PilokFormValues>>

liveForm.register(livePaths.status)
liveForm.register(livePaths.ownership)

const liveError = (path: FieldPath<PilokFormValues>) =>
  liveForm.getFieldState(path).error?.message

assert.equal(liveError(livePaths.status), undefined)
assert.equal(liveError(livePaths.ownership), undefined)

liveForm.setValue(livePaths.status, 'Aktif', { shouldValidate: true })
await liveForm.trigger(livePaths.warehouse)
assert.equal(
  liveError(livePaths.ownership),
  'Kepemilikan Gudang wajib dipilih.',
)

liveForm.setValue(livePaths.ownership, 'Sewa', { shouldValidate: true })
await liveForm.trigger(livePaths.warehouse)
liveForm.register(livePaths.startDate)
liveForm.register(livePaths.endDate)
liveForm.register(livePaths.rentalProof)
assert.equal(
  liveError(livePaths.startDate),
  'Tanggal mulai sewa wajib diisi.',
)
assert.equal(
  liveError(livePaths.endDate),
  'Tanggal berakhir sewa wajib diisi.',
)
assert.equal(
  liveError(livePaths.rentalProof),
  'Bukti sewa wajib diunggah.',
)

liveForm.setValue(livePaths.startDate, '2026-12-31', {
  shouldValidate: true,
})
await liveForm.trigger(livePaths.endDate)
assert.equal(liveError(livePaths.startDate), undefined)
assert.equal(
  liveError(livePaths.endDate),
  'Tanggal berakhir sewa wajib diisi.',
)

liveForm.setValue(livePaths.endDate, '2026-01-01', { shouldValidate: true })
await liveForm.trigger(livePaths.endDate)
assert.equal(
  liveError(livePaths.endDate),
  'Tanggal berakhir sewa tidak boleh lebih awal dari tanggal mulai sewa.',
)

liveForm.setValue(livePaths.ownership, 'Milik Sendiri', {
  shouldValidate: true,
})
liveForm.unregister([
  livePaths.startDate,
  livePaths.endDate,
  livePaths.rentalProof,
])
liveForm.clearErrors([
  livePaths.startDate,
  livePaths.endDate,
  livePaths.rentalProof,
])
await liveForm.trigger(livePaths.warehouse)
liveForm.register(livePaths.shm)
assert.equal(liveError(livePaths.startDate), undefined)
assert.equal(liveError(livePaths.endDate), undefined)
assert.equal(liveError(livePaths.rentalProof), undefined)
assert.equal(liveError(livePaths.shm), 'Dokumen SHM wajib diunggah.')

liveForm.setValue(livePaths.status, 'Tidak Aktif', { shouldValidate: true })
liveForm.setValue(livePaths.ownership, '')
liveForm.setValue(livePaths.shm, undefined)
liveForm.clearErrors([
  livePaths.ownership,
  livePaths.startDate,
  livePaths.endDate,
  livePaths.shm,
  livePaths.rentalProof,
])
await liveForm.trigger(livePaths.warehouse)
assert.equal(liveError(livePaths.ownership), undefined)
assert.equal(liveError(livePaths.shm), undefined)

liveForm.setValue(livePaths.status, 'Aktif', { shouldValidate: true })
await liveForm.trigger(livePaths.warehouse)
assert.equal(
  liveError(livePaths.ownership),
  'Kepemilikan Gudang wajib dipilih.',
)

const inactiveWarehouse: WarehouseFormValues = {
  ...baseWarehouse,
  status: 'Tidak Aktif',
  kepemilikan: '',
}
assert.equal(
  schema.safeParse(valuesWith(inactiveWarehouse)).success,
  true,
  'Gudang Tidak Aktif tidak memerlukan kepemilikan atau dokumen.',
)

assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Tidak Aktif',
  }).success,
  true,
  'Server menerima gudang Tidak Aktif minimal.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Tidak Aktif',
    kepemilikan: null,
    mulaiSewa: null,
    berakhirSewa: '',
  }).success,
  true,
  'Server menerima field inactive kosong atau null.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: '',
  }).success,
  false,
  'Server tetap menolak gudang Aktif tanpa kepemilikan.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Milik Sendiri',
  }).success,
  true,
  'Schema transport menerima evidence opsional agar server dapat membandingkan state tersimpan.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
  }).success,
  true,
  'Schema transport menerima gudang sewa tanpa evidence sebelum validasi baseline server.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: '2026-05-01',
    berakhirSewa: '2026-12-31',
    buktiSewa: existingDocument,
  }).success,
  true,
  'Server menerima nilai internal native date YYYY-MM-DD.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: '01-05-2026',
    berakhirSewa: '31-12-2026',
    buktiSewa: existingDocument,
  }).success,
  false,
  'Server menolak format persistensi pada payload internal.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: '2026-12-31',
    berakhirSewa: '2026-01-01',
    buktiSewa: existingDocument,
  }).success,
  false,
  'Server menolak tanggal berakhir sebelum tanggal mulai.',
)

assert.equal(
  requiresNewOwnershipEvidence({
    originalStatus: 'Aktif',
    originalOwnership: 'Sewa',
    finalStatus: 'Aktif',
    finalOwnership: 'Sewa',
  }),
  false,
  'Nilai akhir yang kembali ke baseline tidak dianggap berubah.',
)
assert.equal(
  requiresNewOwnershipEvidence({
    originalStatus: 'Aktif',
    originalOwnership: 'Sewa',
    finalStatus: 'Aktif',
    finalOwnership: 'Milik Sendiri',
  }),
  true,
)
assert.equal(
  requiresNewOwnershipEvidence({
    originalStatus: 'Tidak Aktif',
    originalOwnership: '',
    finalStatus: 'Aktif',
    finalOwnership: 'Sewa',
  }),
  true,
)

const parseServerWarehouse = (input: unknown) => {
  const result = submissionWarehouseSchema.safeParse(input)
  assert.equal(result.success, true)
  if (!result.success) throw new Error('Fixture gudang server tidak valid.')
  return result.data
}
const serverMaster = membershipMasters[0]!
const existingOwnedWithoutEvidence = {
  kodeGudang: 'A',
  namaGudang: 'Gudang A',
  kapasitasGudang: 100,
  status: 'Aktif' as const,
  kepemilikan: 'Milik Sendiri' as const,
  updatedAt: '21-09-2026 10:14:32',
}
const existingRentalWithoutEvidence = {
  ...existingOwnedWithoutEvidence,
  kepemilikan: 'Sewa' as const,
}
const fakeDocumentVerifier = async (fileId: string) => ({
  fileId,
  fileName: `${fileId}.pdf`,
  url: `https://example.invalid/${fileId}`,
})

assert.deepEqual(
  await normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
    }),
    serverMaster,
    existingOwnedWithoutEvidence,
    fakeDocumentVerifier,
  ),
  {
    kodeGudang: 'A',
    status: 'Aktif',
    kepemilikan: 'Milik Sendiri',
    shm: undefined,
  },
  'Kepemilikan existing yang sama tidak memerlukan SHM lama.',
)
assert.deepEqual(
  await normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Sewa',
    }),
    serverMaster,
    existingRentalWithoutEvidence,
    fakeDocumentVerifier,
  ),
  {
    kodeGudang: 'A',
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: undefined,
    berakhirSewa: undefined,
    buktiSewa: undefined,
  },
  'Kepemilikan Sewa existing yang sama tidak memerlukan backfill evidence.',
)
await assert.rejects(
  normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
    }),
    serverMaster,
    existingRentalWithoutEvidence,
    fakeDocumentVerifier,
  ),
  /Dokumen SHM wajib diunggah/,
)
await assert.rejects(
  normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Sewa',
    }),
    serverMaster,
    existingOwnedWithoutEvidence,
    fakeDocumentVerifier,
  ),
  /Tanggal dan Bukti Sewa wajib dilengkapi/,
)
assert.deepEqual(
  await normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
      shm: { fileId: 'new-shm' },
    }),
    serverMaster,
    existingRentalWithoutEvidence,
    fakeDocumentVerifier,
  ),
  {
    kodeGudang: 'A',
    status: 'Aktif',
    kepemilikan: 'Milik Sendiri',
    shm: {
      fileId: 'new-shm',
      fileName: 'new-shm.pdf',
      url: 'https://example.invalid/new-shm',
    },
  },
)
assert.deepEqual(
  await normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Aktif',
      kepemilikan: 'Sewa',
      mulaiSewa: '2026-09-21',
      berakhirSewa: '2027-09-21',
      buktiSewa: { fileId: 'new-sewa' },
    }),
    serverMaster,
    existingOwnedWithoutEvidence,
    fakeDocumentVerifier,
  ),
  {
    kodeGudang: 'A',
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: '2026-09-21',
    berakhirSewa: '2027-09-21',
    buktiSewa: {
      fileId: 'new-sewa',
      fileName: 'new-sewa.pdf',
      url: 'https://example.invalid/new-sewa',
    },
  },
)
assert.deepEqual(
  await normalizeWarehouseAgainstExisting(
    parseServerWarehouse({
      kodeGudang: 'A',
      status: 'Tidak Aktif',
      kepemilikan: '',
    }),
    serverMaster,
    existingOwnedWithoutEvidence,
    fakeDocumentVerifier,
  ),
  { kodeGudang: 'A', status: 'Tidak Aktif', kepemilikan: '' },
)

const originalUploadDocument = uploadService.uploadDocument.bind(uploadService)
const retriedOwnedValues = valuesWith({
  ...baseWarehouse,
  kepemilikan: 'Milik Sendiri',
  existingShm: existingDocument,
})
assert.equal(
  schema.safeParse(retriedOwnedValues).success,
  true,
  'Referensi upload baru harus dapat dipakai kembali setelah Save sebelumnya gagal.',
)
assert.deepEqual(
  (await buildSubmissionPayload(retriedOwnedValues, () => undefined))
    .warehouses,
  [
    {
      kodeGudang: 'G001',
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
      shm: existingDocument,
    },
  ],
)
const persistedRentalPayload = await buildSubmissionPayload(
  valuesWith({
    ...baseWarehouse,
    originalStatus: 'Aktif',
    originalKepemilikan: 'Sewa',
    kepemilikan: 'Sewa',
    mulaiSewa: '2026-05-01',
    berakhirSewa: '2026-12-31',
    existingBuktiSewa: existingDocument,
  }),
  () => undefined,
)
assert.deepEqual(persistedRentalPayload.warehouses, [
  {
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
  },
])
assert.equal('adaPerubahan' in persistedRentalPayload, false)
const persistedWarehouseRecord = warehouseRecord(
  {
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
  },
  {
    kodeGudang: 'G001',
    namaGudang: 'Gudang QA',
    kapasitasGudang: 100,
    status: 'Aktif',
    kepemilikan: 'Sewa',
    mulaiSewa: '2026-09-21',
    berakhirSewa: '2027-09-21',
    buktiSewa: existingDocument,
  },
  '21-09-2026 10:14:32',
)
assert.equal(persistedWarehouseRecord.mulai_sewa, '21-09-2026')
assert.equal(persistedWarehouseRecord.berakhir_sewa, '21-09-2027')
assert.equal(persistedWarehouseRecord.updated_at, '21-09-2026 10:14:32')
const inactiveWarehouseRecord = warehouseRecord(
  {
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
  },
  {
    kodeGudang: 'G001',
    namaGudang: 'Gudang QA',
    kapasitasGudang: 100,
    status: 'Tidak Aktif',
    kepemilikan: '',
  },
  '21-09-2026 10:14:32',
)
for (const header of [
  'kepemilikan',
  'mulai_sewa',
  'berakhir_sewa',
  'shm_file_id',
  'shm_file_name',
  'shm_url',
  'bukti_sewa_file_id',
  'bukti_sewa_file_name',
  'bukti_sewa_url',
]) {
  assert.equal(inactiveWarehouseRecord[header], '')
}

const storedWarehouseRows = [
  {
    rowNumber: 2,
    values: [],
    record: { kode_pilok: '10001', kode_gudang: 'A' },
  },
  {
    rowNumber: 3,
    values: [],
    record: { kode_pilok: '10001', kode_gudang: 'B' },
  },
  {
    rowNumber: 4,
    values: [],
    record: { kode_pilok: '10001', kode_gudang: 'OLD' },
  },
]
const warehouseUpsertPlan = planWarehouseUpserts(
  '10001',
  storedWarehouseRows,
  [
    { kode_pilok: '10001', kode_gudang: 'A', status_gudang: 'Aktif' },
    { kode_pilok: '10001', kode_gudang: 'B', status_gudang: 'Tidak Aktif' },
    { kode_pilok: '10001', kode_gudang: 'C', status_gudang: 'Aktif' },
  ],
)
assert.deepEqual(
  warehouseUpsertPlan.updates.map((update) => update.rowNumber),
  [2, 3],
)
assert.deepEqual(
  warehouseUpsertPlan.inserts.map((record) => record.kode_gudang),
  ['C'],
)
assert.equal(
  warehouseUpsertPlan.updates.some((update) => update.rowNumber === 4),
  false,
  'Gudang OLD yang tidak lagi ada di master harus tetap tidak disentuh.',
)
assert.throws(
  () =>
    planWarehouseUpserts(
      '10001',
      [...storedWarehouseRows, { ...storedWarehouseRows[0]!, rowNumber: 5 }],
      [],
    ),
  /duplikat submission_gudang/,
)

let uploadCount = 0
uploadService.uploadDocument = async () => {
  uploadCount += 1
  return {
    fileId: 'unexpected-upload',
    fileName: 'unexpected.pdf',
    url: 'https://example.invalid/unexpected-upload',
  }
}

try {
  const staleRental = {
    ...inactiveWarehouse,
    kepemilikan: 'Sewa' as const,
    mulaiSewa: '2026-01-01',
    berakhirSewa: '2026-12-31',
    buktiSewa: new File(['pdf'], 'sewa.pdf', { type: 'application/pdf' }),
  }
  const rentalPayload = await buildSubmissionPayload(
    valuesWith(staleRental),
    () => undefined,
  )
  assert.deepEqual(rentalPayload.warehouses, [
    { kodeGudang: 'G001', status: 'Tidak Aktif', kepemilikan: '' },
  ])

  const staleOwned = {
    ...inactiveWarehouse,
    kepemilikan: 'Milik Sendiri' as const,
    shm: new File(['pdf'], 'shm.pdf', { type: 'application/pdf' }),
  }
  const ownedPayload = await buildSubmissionPayload(
    valuesWith(staleOwned),
    () => undefined,
  )
  assert.deepEqual(ownedPayload.warehouses, [
    { kodeGudang: 'G001', status: 'Tidak Aktif', kepemilikan: '' },
  ])
  assert.equal(uploadCount, 0, 'Gudang Tidak Aktif tidak boleh memulai upload.')
} finally {
  uploadService.uploadDocument = originalUploadDocument
}

const mergeMasters = [
  ...membershipMasters,
  {
    kodePilok: '10001',
    kodeGudang: 'C',
    namaGudang: 'Gudang C',
    kapasitasGudang: 300,
  },
]
const existingCurrentState: ExistingSubmission = {
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
  createdAt: '21-09-2026 10:14:32',
  updatedAt: '22-09-2026 10:14:32',
  warehouses: [
    {
      kodeGudang: 'A',
      namaGudang: 'Nama snapshot lama A',
      kapasitasGudang: 1,
      status: 'Aktif',
      kepemilikan: 'Sewa',
      mulaiSewa: '2026-01-01',
      berakhirSewa: '2026-12-31',
      buktiSewa: existingDocument,
      updatedAt: '21-09-2026 10:14:32',
    },
    {
      kodeGudang: 'B',
      namaGudang: 'Nama snapshot lama B',
      kapasitasGudang: 2,
      status: 'Aktif',
      kepemilikan: 'Milik Sendiri',
      shm: existingDocument,
      updatedAt: '21-09-2026 10:14:32',
    },
    {
      kodeGudang: 'OLD',
      namaGudang: 'Gudang Lama',
      kapasitasGudang: 50,
      status: 'Tidak Aktif',
      kepemilikan: '',
      updatedAt: '21-09-2026 10:14:32',
    },
  ],
}
const mergedWarehouses = mergeWarehouseFormValues(
  mergeMasters,
  existingCurrentState,
)
const orphanCurrentState: ExistingSubmission = {
  ...existingCurrentState,
  createdAt: null,
  updatedAt: null,
}
const orphanMergedWarehouses = mergeWarehouseFormValues(
  mergeMasters.slice(0, 2),
  orphanCurrentState,
)
assert.deepEqual(
  orphanMergedWarehouses.map((warehouse) => ({
    kodeGudang: warehouse.kodeGudang,
    status: warehouse.status,
    kepemilikan: warehouse.kepemilikan,
  })),
  [
    { kodeGudang: 'A', status: 'Aktif', kepemilikan: 'Sewa' },
    { kodeGudang: 'B', status: 'Aktif', kepemilikan: 'Milik Sendiri' },
  ],
  'State gudang tanpa parent harus tetap menjadi prefill untuk master terkini.',
)
assert.equal(
  orphanMergedWarehouses.some(
    (warehouse) => warehouse.kodeGudang === 'OLD',
  ),
  false,
  'Gudang di luar master tetap tersembunyi walaupun parent belum ada.',
)
assert.deepEqual(
  mergedWarehouses.map((warehouse) => warehouse.kodeGudang),
  ['A', 'B', 'C'],
  'UI hanya boleh mengikuti gudang_master terkini.',
)
assert.deepEqual(
  {
    namaGudang: mergedWarehouses[0]?.namaGudang,
    kapasitasGudang: mergedWarehouses[0]?.kapasitasGudang,
    status: mergedWarehouses[0]?.status,
    kepemilikan: mergedWarehouses[0]?.kepemilikan,
    buktiSewa: mergedWarehouses[0]?.existingBuktiSewa,
  },
  {
    namaGudang: 'Gudang A',
    kapasitasGudang: 100,
    status: 'Aktif',
    kepemilikan: 'Sewa',
    buktiSewa: existingDocument,
  },
)
assert.equal(mergedWarehouses[1]?.existingShm, existingDocument)
assert.deepEqual(
  {
    status: mergedWarehouses[2]?.status,
    kepemilikan: mergedWarehouses[2]?.kepemilikan,
  },
  { status: '', kepemilikan: '' },
  'Gudang master baru harus tampil dengan state survei kosong.',
)
assert.deepEqual(
  validationMessages({
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
    warehouses: mergedWarehouses,
  }),
  ['Status Gudang wajib dipilih.'],
)
assert.equal(
  schema.safeParse({
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
    warehouses: mergedWarehouses.slice(0, 2),
  }).success,
  true,
  'Dokumen existing yang valid harus dapat digunakan kembali.',
)

const incompleteRental = mergeWarehouseFormValues(
  [membershipMasters[0]!],
  {
    ...existingCurrentState,
    warehouses: [
      {
        kodeGudang: 'A',
        namaGudang: 'Nama snapshot lama A',
        status: 'Aktif',
        kepemilikan: 'Sewa',
        updatedAt: '21-09-2026 10:14:32',
      },
    ],
  },
)
assert.equal(
  schema.safeParse({
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
    warehouses: incompleteRental,
  }).success,
  true,
  'Kepemilikan Sewa tersimpan tidak memaksa backfill bukti lama.',
)

const incompleteOwnership = mergeWarehouseFormValues(
  [membershipMasters[0]!],
  {
    ...existingCurrentState,
    warehouses: [
      {
        kodeGudang: 'A',
        namaGudang: 'Nama snapshot lama A',
        status: 'Aktif',
        kepemilikan: '',
        updatedAt: '21-09-2026 10:14:32',
      },
    ],
  },
)
assert.deepEqual(
  validationMessages({
    kodePilok: '10001',
    namaDistributor: 'Distributor QA',
    areaName: 'Area QA',
    warehouses: incompleteOwnership,
  }),
  ['Kepemilikan Gudang wajib dipilih.'],
)

const existingInactive: ExistingSubmission = {
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  warehouses: [
    {
      kodeGudang: 'G001',
      namaGudang: 'Gudang QA',
      kapasitasGudang: 100,
      status: 'Tidak Aktif',
      kepemilikan: '',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}
const initialMarkup = renderToStaticMarkup(
  createElement(PilokMainForm, {
    pilok: {
      kodePilok: '10001',
      namaDistributor: 'Distributor QA',
      areaName: 'Area QA',
    },
    existingSubmission: existingInactive,
    masterWarehouses: [
      {
        kodePilok: '10001',
        kodeGudang: 'G001',
        namaGudang: 'Gudang QA',
        kapasitasGudang: 100,
      },
    ],
    onBack: () => undefined,
    onSuccess: () => undefined,
  }),
)
assert.equal(
  initialMarkup.includes('role="alert"'),
  false,
  'Error validasi tidak boleh tampil pada render awal.',
)
assert.equal(initialMarkup.includes('Masih ada data wajib'), false)
assert.equal(initialMarkup.includes('Apakah Ada Perubahan'), false)
assert.equal(initialMarkup.includes('Ganti Kode PILOK'), true)
assert.equal(initialMarkup.includes('>Ganti PILOK<'), false)
assert.equal(
  initialMarkup.includes(
    'Data yang ditampilkan pada menu ini merupakan data pada database MDXL dan telah digunakan di Evaluasi HY 2026',
  ),
  true,
)
assert.equal(
  initialMarkup.includes('Kepemilikan Gudang'),
  false,
  'Field kepemilikan disembunyikan untuk gudang Tidak Aktif.',
)

const activeRentalMarkup = renderToStaticMarkup(
  createElement(PilokMainForm, {
    pilok: {
      kodePilok: '10001',
      namaDistributor: 'Distributor QA',
      areaName: 'Area QA',
    },
    existingSubmission: {
      ...existingInactive,
      warehouses: [
        {
          kodeGudang: 'G001',
          namaGudang: 'Gudang QA',
          kapasitasGudang: 100,
          status: 'Aktif',
          kepemilikan: 'Sewa',
          mulaiSewa: normalizeStoredRentalDate('21-09-2026'),
          berakhirSewa: normalizeStoredRentalDate('21-09-2027'),
          buktiSewa: existingDocument,
          updatedAt: '21-09-2026 10:14:32',
        },
      ],
    },
    masterWarehouses: [
      {
        kodePilok: '10001',
        kodeGudang: 'G001',
        namaGudang: 'Gudang QA',
        kapasitasGudang: 100,
      },
    ],
    onBack: () => undefined,
    onSuccess: () => undefined,
  }),
)
assert.equal(
  (activeRentalMarkup.match(/type="date"/g) ?? []).length,
  0,
  'Evidence sewa tidak ditampilkan untuk kepemilikan tersimpan yang tidak berubah.',
)
assert.equal(
  (activeRentalMarkup.match(/>Ubah<\/button>/g) ?? []).length,
  2,
  'Status dan kepemilikan tersimpan masing-masing memiliki aksi Ubah.',
)
assert.equal(
  (activeRentalMarkup.match(/aria-readonly="true"/g) ?? []).length,
  2,
  'Status dan kepemilikan tersimpan tampil sebagai field readonly.',
)
assert.equal(activeRentalMarkup.includes('Upload Bukti Sewa'), false)

process.stdout.write('QA verification passed.\n')
