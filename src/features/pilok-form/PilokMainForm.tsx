import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { FieldError } from '../../components/FieldError'
import {
  ActionBar,
  SectionCard,
  SectionHeader,
  StatusBanner,
} from '../../components/FormLayout'
import { ReadonlyField } from '../../components/ReadonlyField'
import { submissionService } from '../../services/submissionService'
import type {
  ExistingSubmission,
  Pilok,
  PilokSubmission,
  WarehouseMaster,
} from '../../types/domain'
import { buildSubmissionPayload } from './buildPayload'
import type { PilokFormValues } from './formTypes'
import { createPilokFormSchema } from './schema'
import { WarehouseCard } from './WarehouseCard'

interface PilokMainFormProps {
  pilok: Pilok
  existingSubmission: ExistingSubmission | null
  masterWarehouses: WarehouseMaster[]
  onBack: () => void
  onSuccess: (payload: PilokSubmission) => void
}

export function PilokMainForm({
  pilok,
  existingSubmission,
  masterWarehouses,
  onBack,
  onSuccess,
}: PilokMainFormProps) {
  const existingByCode = useMemo(
    () =>
      new Map(
        existingSubmission?.warehouses.map((warehouse) => [
          warehouse.kodeGudang,
          warehouse,
        ]) ?? [],
      ),
    [existingSubmission],
  )
  const schema = useMemo(
    () => createPilokFormSchema(existingSubmission !== null),
    [existingSubmission],
  )
  const form = useForm<PilokFormValues>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      ...pilok,
      adaPerubahan: 'ya',
      warehouses: masterWarehouses.map((master) => {
        const existing = existingByCode.get(master.kodeGudang)
        const isInactive = existing?.status === 'Tidak Aktif'
        return {
          kodeGudang: master.kodeGudang,
          namaGudang: master.namaGudang,
          kapasitasGudang: master.kapasitasGudang,
          status: existing?.status ?? '',
          kepemilikan: isInactive ? '' : (existing?.kepemilikan ?? ''),
          mulaiSewa: isInactive ? undefined : existing?.mulaiSewa,
          berakhirSewa: isInactive ? undefined : existing?.berakhirSewa,
          existingShm: isInactive ? undefined : existing?.shm,
          existingBuktiSewa: isInactive ? undefined : existing?.buktiSewa,
        }
      }),
    },
    reValidateMode: 'onChange',
    shouldFocusError: false,
  })
  const {
    register,
    control,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = form
  const { fields } = useFieldArray({
    control,
    name: 'warehouses',
  })
  const [processingState, setProcessingState] = useState<
    'idle' | 'uploading' | 'saving'
  >('idle')
  const [showValidationSummary, setShowValidationSummary] = useState(false)

  const selectChangeAnswer = (answer: 'ya' | 'tidak') => {
    if (answer === 'tidak') clearErrors('warehouses')
  }

  const submitForm = async (values: PilokFormValues) => {
    setShowValidationSummary(false)
    try {
      const hasNewFiles =
        values.adaPerubahan === 'ya' &&
        values.warehouses.some((warehouse) =>
          warehouse.status === 'Aktif' &&
          Boolean(warehouse.shm || warehouse.buktiSewa),
        )
      setProcessingState(hasNewFiles ? 'uploading' : 'saving')
      const payload = await buildSubmissionPayload(values, (update) => {
        setValue(`warehouses.${update.index}.${update.field}`, update.reference)
        const fileField =
          update.field === 'existingShm' ? 'shm' : 'buktiSewa'
        setValue(`warehouses.${update.index}.${fileField}`, undefined)
      })
      setProcessingState('saving')
      const submission = await submissionService.submit(payload)
      onSuccess(submission)
    } catch (error) {
      setError('root', {
        type: 'submit',
        message:
          error instanceof Error
            ? error.message
            : 'Formulir gagal diproses. Data Anda tetap tersimpan di halaman ini.',
      })
    } finally {
      setProcessingState('idle')
    }
  }

  const handleInvalidSubmit = () => {
    setShowValidationSummary(true)
    window.requestAnimationFrame(() => {
      document.getElementById('form-validation-summary')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      const firstInvalidField = document
        .getElementById('pilok-main-form')
        ?.querySelector<HTMLElement>('[aria-invalid="true"]:not(.sr-only)')
      firstInvalidField?.focus({ preventScroll: true })
    })
  }

  const adaPerubahan = useWatch({ control, name: 'adaPerubahan' })

  return (
    <form
      id="pilok-main-form"
      onSubmit={handleSubmit(submitForm, handleInvalidSubmit)}
      noValidate
      className="w-full min-w-0 max-w-full space-y-6"
    >
      {showValidationSummary && !isValid && (
        <div id="form-validation-summary">
          <StatusBanner variant="error" title="Data belum lengkap">
            Masih ada data wajib yang belum lengkap. Silakan periksa kembali
            field yang ditandai.
          </StatusBanner>
        </div>
      )}

      <SectionCard>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            step={1}
            title="Informasi PILOK"
            description="Master distributor dan area untuk formulir ini."
          />
          <button
            type="button"
            onClick={onBack}
            className="button-secondary"
          >
            Ganti PILOK
          </button>
        </div>

        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
          <ReadonlyField label="Kode PILOK" value={pilok.kodePilok} />
          <ReadonlyField
            label="Distributor Group"
            value={pilok.namaDistributor}
          />
          <ReadonlyField label="Area Name" value={pilok.areaName} />
        </div>

        {existingSubmission && (
          <div className="mt-5">
            <StatusBanner variant="info" compact>
              Data sebelumnya ditemukan. Pilih &ldquo;Tidak&rdquo; jika data
              gudang masih sama, atau &ldquo;Ya&rdquo; untuk melakukan
              perubahan.
            </StatusBanner>
          </div>
        )}

        <input type="hidden" {...register('kodePilok')} />
        <input type="hidden" {...register('namaDistributor')} />
        <input type="hidden" {...register('areaName')} />

        <fieldset className="mt-7 min-w-0 max-w-full border-t border-slate-200 pt-6">
          <legend className="text-sm font-semibold text-slate-900">
            Apakah Ada Perubahan? <span className="text-red-600">*</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['ya', 'tidak'] as const).map((answer) => (
              <label
                key={answer}
                className={`flex min-w-28 cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  adaPerubahan === answer
                    ? 'border-sig-red bg-red-50 text-sig-ink ring-1 ring-sig-red'
                    : answer === 'tidak' && !existingSubmission
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-sig-red'
                }`}
              >
                <input
                  type="radio"
                  value={answer}
                  disabled={answer === 'tidak' && !existingSubmission}
                  className="size-4 accent-sig-red"
                  {...register('adaPerubahan', {
                    onChange: () => selectChangeAnswer(answer),
                  })}
                />
                {answer === 'ya' ? 'Ya' : 'Tidak'}
              </label>
            ))}
          </div>
          {!existingSubmission && (
            <p className="mt-2 text-sm text-slate-500">
              Pilihan &ldquo;Tidak&rdquo; tersedia setelah kode PILOK memiliki data
              submission sebelumnya.
            </p>
          )}
          <FieldError message={errors.adaPerubahan?.message} />
        </fieldset>
      </SectionCard>

      {adaPerubahan === 'ya' && (
        <SectionCard>
          <div className="mb-6">
            <SectionHeader
              step={2}
              title="Data Gudang"
              description="Lengkapi data survei untuk seluruh gudang. Daftar gudang yang ditampilkan secara otomatis mengacu pada data gudang yang terdaftar di MDXL."
            />
            <FieldError
              message={
                typeof errors.warehouses?.message === 'string'
                  ? errors.warehouses.message
                  : undefined
              }
            />
          </div>

          {fields.length === 0 ? (
            <StatusBanner variant="error" title="Master gudang belum tersedia">
              PILOK ini belum memiliki gudang pada gudang_master. Data perubahan
              belum dapat dikirim.
            </StatusBanner>
          ) : (
            <div className="w-full min-w-0 max-w-full space-y-5">
              {fields.map((field, index) => (
                <WarehouseCard key={field.id} index={index} form={form} />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {errors.root?.message && (
        <StatusBanner variant="error">{errors.root.message}</StatusBanner>
      )}

      <ActionBar
        feedback={
          isSubmitting ? (
            <StatusBanner variant="info" compact>
              {processingState === 'uploading'
                ? 'Mengunggah dokumen PDF...'
                : 'Menyimpan data ke Google Sheets...'}
            </StatusBanner>
          ) : undefined
        }
      >
        <button
          type="submit"
          disabled={
            isSubmitting || (adaPerubahan === 'ya' && fields.length === 0)
          }
          className="button-primary"
        >
          {isSubmitting ? (
            <>
              <span
                className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              {processingState === 'uploading'
                ? 'Mengunggah PDF...'
                : 'Menyimpan...'}
            </>
          ) : (
            'Kirim Formulir'
          )}
        </button>
      </ActionBar>
    </form>
  )
}
