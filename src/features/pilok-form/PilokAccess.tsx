import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Pilok } from '../../types/domain'
import { FieldError } from '../../components/FieldError'
import {
  SectionCard,
  SectionHeader,
  StatusBanner,
} from '../../components/FormLayout'
import { pilokService } from '../../services/pilokService'
import { pilokAccessSchema } from './schema'

interface AccessValues {
  kodePilok: string
}

interface PilokAccessProps {
  onResolved: (pilok: Pilok) => Promise<void>
}

export function PilokAccess({ onResolved }: PilokAccessProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccessValues>({
    resolver: zodResolver(pilokAccessSchema),
    defaultValues: { kodePilok: '' },
  })

  const resolvePilok = async ({ kodePilok }: AccessValues) => {
    try {
      const pilok = await pilokService.getByCode(kodePilok)
      if (!pilok) {
        setError('kodePilok', {
          type: 'validate',
          message:
            'Kode PILOK tidak ditemukan. Periksa kembali kode yang dimasukkan.',
        })
        return
      }
      await onResolved(pilok)
    } catch (error) {
      setError('root', {
        type: 'server',
        message:
          error instanceof Error
            ? error.message
            : 'Data submission sebelumnya gagal dimuat.',
      })
    }
  }

  return (
    <SectionCard>
      <div className="mb-7">
        <SectionHeader
          step={1}
          title="Masukkan Kode PILOK"
          description="Kode digunakan untuk memuat distributor, area, gudang master, dan data sebelumnya."
        />
      </div>

      <form onSubmit={handleSubmit(resolvePilok)} noValidate>
        <label
          htmlFor="kodePilok"
          className="field-label"
        >
          Kode PILOK <span className="text-red-600">*</span>
        </label>
        <input
          id="kodePilok"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Contoh: 0001"
          aria-invalid={Boolean(errors.kodePilok)}
          aria-describedby={errors.kodePilok ? 'kodePilok-error' : undefined}
          className={`text-input ${errors.kodePilok ? 'input-error' : ''}`}
          {...register('kodePilok')}
        />
        <FieldError id="kodePilok-error" message={errors.kodePilok?.message} />
        {errors.root?.message && (
          <div className="mt-4">
            <StatusBanner variant="error">{errors.root.message}</StatusBanner>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary mt-6 w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <span
                className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Memuat...
            </>
          ) : (
            'Lanjutkan'
          )}
        </button>
      </form>
    </SectionCard>
  )
}
