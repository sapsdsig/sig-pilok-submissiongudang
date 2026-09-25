import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
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
import { mergeWarehouseFormValues } from './mergeWarehouseState'
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
  const schema = useMemo(() => createPilokFormSchema(), [])
  const form = useForm<PilokFormValues>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      ...pilok,
      warehouses: mergeWarehouseFormValues(
        masterWarehouses,
        existingSubmission,
      ),
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  })
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = form
  const { fields } = useFieldArray({
    control,
    name: 'warehouses',
  })
  const [processingState, setProcessingState] = useState<
    'idle' | 'uploading' | 'saving'
  >('idle')

  const submitForm = async (values: PilokFormValues) => {
    try {
      const hasNewFiles = values.warehouses.some(
        (warehouse) =>
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
    window.requestAnimationFrame(() => {
      const firstInvalidField = document
        .getElementById('pilok-main-form')
        ?.querySelector<HTMLElement>('[aria-invalid="true"]:not(.sr-only)')
      firstInvalidField?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      firstInvalidField?.focus({ preventScroll: true })
    })
  }

  return (
    <form
      id="pilok-main-form"
      onSubmit={handleSubmit(submitForm, handleInvalidSubmit)}
      noValidate
      className="w-full min-w-0 max-w-full space-y-6"
    >
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

        <input type="hidden" {...register('kodePilok')} />
        <input type="hidden" {...register('namaDistributor')} />
        <input type="hidden" {...register('areaName')} />
      </SectionCard>

      <SectionCard>
        <div className="mb-6">
          <SectionHeader
            step={2}
            title="Data Gudang"
            description="Data yang ditampilkan pada menu ini merupakan data pada database MDXL dan telah digunakan di Evaluasi HY 2026"
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
            PILOK ini belum memiliki gudang pada gudang_master. Data gudang
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
          disabled={isSubmitting || fields.length === 0}
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
