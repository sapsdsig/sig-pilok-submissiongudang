import { z } from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const documentReferenceSchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  url: z.string().min(1),
})

export const pilokAccessSchema = z.object({
  kodePilok: z.string().trim().min(1, 'Kode PILOK wajib diisi.'),
})

const warehouseSchema = z.object({
  kodeGudang: z.string(),
  namaGudang: z.string(),
  kapasitasGudang: z.number().nonnegative(),
  status: z.union([
    z.literal(''),
    z.literal('Aktif'),
    z.literal('Tidak Aktif'),
  ]),
  kepemilikan: z.union([
    z.literal(''),
    z.literal('Milik Sendiri'),
    z.literal('Sewa'),
  ]),
  mulaiSewa: z.string().optional(),
  berakhirSewa: z.string().optional(),
  shm: z.instanceof(File).optional(),
  buktiSewa: z.instanceof(File).optional(),
  existingShm: documentReferenceSchema.optional(),
  existingBuktiSewa: documentReferenceSchema.optional(),
})

const basePilokFormSchema = z.object({
  kodePilok: z.string(),
  namaDistributor: z.string(),
  areaName: z.string(),
  adaPerubahan: z.union([z.literal('ya'), z.literal('tidak')]),
  warehouses: z.array(warehouseSchema),
})

const isValidDateInput = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === (month ?? 1) - 1 &&
    parsed.getUTCDate() === day
  )
}

const validatePdf = (
  file: File | undefined,
  hasExistingDocument: boolean,
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
) => {
  if (!file && !hasExistingDocument) {
    context.addIssue({
      code: 'custom',
      path,
      message: `${label} wajib diunggah.`,
    })
    return
  }

  if (!file) return

  if (file.size <= 0) {
    context.addIssue({
      code: 'custom',
      path,
      message: 'Dokumen PDF tidak boleh kosong.',
    })
  }

  if (file.type !== 'application/pdf') {
    context.addIssue({
      code: 'custom',
      path,
      message: 'Dokumen harus berupa file PDF.',
    })
  }

  if (file.size > MAX_FILE_SIZE) {
    context.addIssue({
      code: 'custom',
      path,
      message: 'Ukuran file maksimal 10 MB.',
    })
  }
}

export const createPilokFormSchema = (hasExistingSubmission: boolean) =>
  basePilokFormSchema.superRefine((values, context) => {
    if (values.adaPerubahan === 'tidak') {
      if (!hasExistingSubmission) {
        context.addIssue({
          code: 'custom',
          path: ['adaPerubahan'],
          message: 'Pilihan Tidak hanya tersedia jika data sebelumnya ada.',
        })
      }
      return
    }

    if (values.warehouses.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['warehouses'],
        message: 'PILOK ini belum memiliki gudang pada master data.',
      })
      return
    }

    values.warehouses.forEach((warehouse, index) => {
      if (warehouse.status === '') {
        context.addIssue({
          code: 'custom',
          path: ['warehouses', index, 'status'],
          message: 'Status Gudang wajib dipilih.',
        })
      }

      if (warehouse.kepemilikan === '') {
        context.addIssue({
          code: 'custom',
          path: ['warehouses', index, 'kepemilikan'],
          message: 'Kepemilikan Gudang wajib dipilih.',
        })
      }

      if (warehouse.kepemilikan === 'Milik Sendiri') {
        validatePdf(
          warehouse.shm,
          Boolean(warehouse.existingShm),
          ['warehouses', index, 'shm'],
          'SHM',
          context,
        )
      }

      if (warehouse.kepemilikan === 'Sewa') {
        const startDate = warehouse.mulaiSewa ?? ''
        const endDate = warehouse.berakhirSewa ?? ''

        if (!startDate) {
          context.addIssue({
            code: 'custom',
            path: ['warehouses', index, 'mulaiSewa'],
            message: 'Mulai Sewa wajib diisi.',
          })
        } else if (!isValidDateInput(startDate)) {
          context.addIssue({
            code: 'custom',
            path: ['warehouses', index, 'mulaiSewa'],
            message: 'Tanggal Mulai Sewa tidak valid.',
          })
        }

        if (!endDate) {
          context.addIssue({
            code: 'custom',
            path: ['warehouses', index, 'berakhirSewa'],
            message: 'Berakhir Sewa wajib diisi.',
          })
        } else if (!isValidDateInput(endDate)) {
          context.addIssue({
            code: 'custom',
            path: ['warehouses', index, 'berakhirSewa'],
            message: 'Tanggal Berakhir Sewa tidak valid.',
          })
        } else if (startDate && endDate < startDate) {
          context.addIssue({
            code: 'custom',
            path: ['warehouses', index, 'berakhirSewa'],
            message: 'Berakhir Sewa tidak boleh lebih awal dari Mulai Sewa.',
          })
        }

        validatePdf(
          warehouse.buktiSewa,
          Boolean(warehouse.existingBuktiSewa),
          ['warehouses', index, 'buktiSewa'],
          'Bukti Sewa',
          context,
        )
      }
    })
  })
