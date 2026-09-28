import { SectionCard } from '../../components/FormLayout'
import type { PilokSubmission } from '../../types/domain'

interface SubmissionSuccessProps {
  payload: PilokSubmission
  onRestart: () => void
}

export function SubmissionSuccess({
  payload,
  onRestart,
}: SubmissionSuccessProps) {
  return (
    <SectionCard className="mx-auto flex min-h-[26rem] max-w-4xl flex-col items-center justify-center px-5 py-12 text-center sm:px-10 sm:py-16">
      <div className="success-icon-wrap">
        <div className="success-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m7.5 12.5 3 3 6-7"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <p className="text-xs font-bold tracking-[0.18em] text-sig-red uppercase">
        Penyimpanan selesai
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-sig-ink sm:text-3xl">
        Data berhasil disimpan
      </h2>
      <div className="mx-auto mt-5 max-w-2xl">
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          Data status dan kepemilikan gudang untuk:
        </p>
        <p className="mt-2 text-base font-bold leading-6 text-sig-ink [overflow-wrap:anywhere] sm:text-lg">
          {payload.namaDistributor}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          telah berhasil disimpan.
        </p>
      </div>

      <dl className="mt-6 grid w-full max-w-lg grid-cols-[minmax(0,1fr)] gap-3 text-left sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
          <dt className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Kode PILOK
          </dt>
          <dd className="mt-1 truncate text-base font-bold text-sig-ink" title={payload.kodePilok}>
            {payload.kodePilok}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <dt className="text-xs font-semibold tracking-[0.08em] text-emerald-700 uppercase">
            Gudang tersimpan
          </dt>
          <dd className="mt-1 flex min-w-0 items-baseline gap-1.5 text-emerald-900">
            <span className="text-2xl font-bold leading-none">
              {payload.warehouses.length}
            </span>
            <span className="text-sm font-semibold">gudang</span>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onRestart}
        className="button-primary mt-7 w-full sm:w-auto"
      >
        Kembali ke Form
      </button>
    </SectionCard>
  )
}
