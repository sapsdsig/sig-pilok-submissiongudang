import assert from 'node:assert/strict'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFormControl, type FieldPath } from 'react-hook-form'
import { submissionWarehouseSchema } from '../api/_lib/submissionValidation.js'
import { buildSubmissionPayload } from '../src/features/pilok-form/buildPayload.js'
import type {
  PilokFormValues,
  WarehouseFormValues,
} from '../src/features/pilok-form/formTypes.js'
import { createPilokFormSchema } from '../src/features/pilok-form/schema.js'
import { uploadService } from '../src/services/uploadService.js'
import type { ExistingSubmission } from '../src/types/domain.js'

Object.assign(globalThis, { React })
const { PilokMainForm } = await import(
  '../src/features/pilok-form/PilokMainForm.js'
)

const schema = createPilokFormSchema(false)
const baseWarehouse: WarehouseFormValues = {
  kodeGudang: 'G001',
  namaGudang: 'Gudang QA',
  kapasitasGudang: 100,
  status: 'Aktif',
  kepemilikan: '',
}

const valuesWith = (warehouse: WarehouseFormValues): PilokFormValues => ({
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
  adaPerubahan: 'ya',
  warehouses: [warehouse],
})

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
      existingBuktiSewa: existingDocument,
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
  false,
  'Server tetap menolak gudang milik sendiri tanpa SHM.',
)
assert.equal(
  submissionWarehouseSchema.safeParse({
    kodeGudang: 'G001',
    status: 'Aktif',
    kepemilikan: 'Sewa',
  }).success,
  false,
  'Server tetap menolak gudang sewa yang tidak lengkap.',
)

const originalUploadDocument = uploadService.uploadDocument.bind(uploadService)
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

const existingInactive: ExistingSubmission = {
  kodePilok: '10001',
  namaDistributor: 'Distributor QA',
  areaName: 'Area QA',
  adaPerubahan: true,
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
assert.equal(
  initialMarkup.includes('Kepemilikan Gudang'),
  false,
  'Field kepemilikan disembunyikan untuk gudang Tidak Aktif.',
)

process.stdout.write('QA verification passed.\n')
