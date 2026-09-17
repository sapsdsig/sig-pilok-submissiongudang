import type { PilokSubmission } from '../../types/domain'
import { SectionCard, StatusBanner } from '../../components/FormLayout'

interface SubmissionSuccessProps {
  payload: PilokSubmission
  onRestart: () => void
}

export function SubmissionSuccess({
  payload,
  onRestart,
}: SubmissionSuccessProps) {
  return (
    <SectionCard className="mx-auto max-w-2xl py-10 text-center sm:py-12">
      <div className="success-icon">
        <span aria-hidden="true">✓</span>
      </div>
      <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
        Berhasil
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        Formulir berhasil diproses
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
        Pengajuan untuk PILOK <strong>{payload.kodePilok}</strong> telah diterima
        dan disimpan melalui integrasi Google.
      </p>

      <div className="mx-auto mt-5 max-w-lg text-left">
        <StatusBanner variant="success" compact>
          Data berhasil disimpan melalui integrasi Google.
        </StatusBanner>
      </div>

      <dl className="mx-auto mt-6 grid max-w-lg gap-3 rounded-xl bg-slate-50 p-4 text-left text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Ada Perubahan</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {payload.adaPerubahan ? 'Ya' : 'Tidak'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Jumlah Gudang</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {payload.adaPerubahan
              ? payload.warehouses.length
              : 'Tidak diubah'}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onRestart}
        className="button-primary mt-7"
      >
        Isi Formulir Lain
      </button>
    </SectionCard>
  )
}
