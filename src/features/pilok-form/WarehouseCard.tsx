import type { ChangeEvent } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { FieldError } from '../../components/FieldError'
import { ReadonlyField } from '../../components/ReadonlyField'
import type { PilokFormValues } from './formTypes'

interface WarehouseCardProps {
  index: number
  form: UseFormReturn<PilokFormValues>
}

const inputClass =
  'text-input'
const labelClass = 'field-label'

export function WarehouseCard({ index, form }: WarehouseCardProps) {
  const {
    register,
    control,
    setValue,
    getValues,
    unregister,
    clearErrors,
    trigger,
    formState: { errors },
  } = form
  const status = useWatch({
    control,
    name: `warehouses.${index}.status`,
  })
  const ownership = useWatch({
    control,
    name: `warehouses.${index}.kepemilikan`,
  })
  const existingShm = useWatch({
    control,
    name: `warehouses.${index}.existingShm`,
  })
  const existingBuktiSewa = useWatch({
    control,
    name: `warehouses.${index}.existingBuktiSewa`,
  })
  const newShm = useWatch({
    control,
    name: `warehouses.${index}.shm`,
  })
  const newBuktiSewa = useWatch({
    control,
    name: `warehouses.${index}.buktiSewa`,
  })
  const warehouseErrors = errors.warehouses?.[index]
  const shmFileName = newShm?.name ?? existingShm?.fileName
  const rentalProofFileName =
    newBuktiSewa?.name ?? existingBuktiSewa?.fileName

  const ownershipRegistration = register(
    `warehouses.${index}.kepemilikan`,
  )
  const statusRegistration = register(`warehouses.${index}.status`)

  const clearOwnershipValues = () => {
    setValue(`warehouses.${index}.kepemilikan`, '')
    setValue(`warehouses.${index}.mulaiSewa`, undefined)
    setValue(`warehouses.${index}.berakhirSewa`, undefined)
    setValue(`warehouses.${index}.shm`, undefined)
    setValue(`warehouses.${index}.buktiSewa`, undefined)
    setValue(`warehouses.${index}.existingShm`, undefined)
    setValue(`warehouses.${index}.existingBuktiSewa`, undefined)
    clearErrors([
      `warehouses.${index}.kepemilikan`,
      `warehouses.${index}.mulaiSewa`,
      `warehouses.${index}.berakhirSewa`,
      `warehouses.${index}.shm`,
      `warehouses.${index}.buktiSewa`,
    ])
  }

  const handleStatusChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    await statusRegistration.onChange(event)
    if (event.target.value === 'Tidak Aktif') {
      clearOwnershipValues()
    }
    await trigger(`warehouses.${index}`)
  }

  const handleOwnershipChange = async (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    await ownershipRegistration.onChange(event)
    const selected = event.target.value

    if (selected === 'Milik Sendiri') {
      unregister(`warehouses.${index}.mulaiSewa`)
      unregister(`warehouses.${index}.berakhirSewa`)
      unregister(`warehouses.${index}.buktiSewa`)
      setValue(`warehouses.${index}.existingBuktiSewa`, undefined)
      clearErrors([
        `warehouses.${index}.mulaiSewa`,
        `warehouses.${index}.berakhirSewa`,
        `warehouses.${index}.buktiSewa`,
      ])
    } else if (selected === 'Sewa') {
      unregister(`warehouses.${index}.shm`)
      setValue(`warehouses.${index}.existingShm`, undefined)
      clearErrors(`warehouses.${index}.shm`)
    } else {
      unregister(`warehouses.${index}.mulaiSewa`)
      unregister(`warehouses.${index}.berakhirSewa`)
      unregister(`warehouses.${index}.buktiSewa`)
      unregister(`warehouses.${index}.shm`)
      setValue(`warehouses.${index}.existingShm`, undefined)
      setValue(`warehouses.${index}.existingBuktiSewa`, undefined)
      clearErrors([
        `warehouses.${index}.mulaiSewa`,
        `warehouses.${index}.berakhirSewa`,
        `warehouses.${index}.shm`,
        `warehouses.${index}.buktiSewa`,
      ])
    }

    await trigger(`warehouses.${index}`)
  }

  const master = getValues(`warehouses.${index}`)
  const formattedCapacity = new Intl.NumberFormat('id-ID').format(
    master.kapasitasGudang,
  )

  return (
    <section className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <h3 className="font-bold text-sig-ink">Gudang {index + 1}</h3>
      </div>

      <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4 sm:col-span-2 sm:grid-cols-3">
          <ReadonlyField label="Kode Gudang" value={master.kodeGudang} />
          <ReadonlyField label="Nama Gudang" value={master.namaGudang} />
          <ReadonlyField
            label="Kapasitas Gudang"
            value={formattedCapacity}
          />
          <input type="hidden" {...register(`warehouses.${index}.kodeGudang`)} />
          <input type="hidden" {...register(`warehouses.${index}.namaGudang`)} />
          <input
            type="hidden"
            {...register(`warehouses.${index}.kapasitasGudang`, {
              valueAsNumber: true,
            })}
          />
        </div>

        <div className="min-w-0 max-w-full">
          <label htmlFor={`warehouse-${index}-status`} className={labelClass}>
            Status Gudang <span className="text-red-600">*</span>
          </label>
          <select
            id={`warehouse-${index}-status`}
            aria-invalid={Boolean(warehouseErrors?.status)}
            className={`${inputClass} ${warehouseErrors?.status ? 'border-red-500' : ''}`}
            {...statusRegistration}
            onChange={handleStatusChange}
          >
            <option value="">Pilih status</option>
            <option value="Aktif">Aktif</option>
            <option value="Tidak Aktif">Tidak Aktif</option>
          </select>
          <FieldError message={warehouseErrors?.status?.message} />
        </div>

        {status !== 'Tidak Aktif' && (
          <div className="min-w-0 max-w-full">
            <label htmlFor={`warehouse-${index}-ownership`} className={labelClass}>
              Kepemilikan Gudang <span className="text-red-600">*</span>
            </label>
            <select
              id={`warehouse-${index}-ownership`}
              aria-invalid={Boolean(warehouseErrors?.kepemilikan)}
              className={`${inputClass} ${warehouseErrors?.kepemilikan ? 'border-red-500' : ''}`}
              {...ownershipRegistration}
              onChange={handleOwnershipChange}
            >
              <option value="">Pilih kepemilikan</option>
              <option value="Milik Sendiri">Milik Sendiri</option>
              <option value="Sewa">Sewa</option>
            </select>
            <FieldError message={warehouseErrors?.kepemilikan?.message} />
          </div>
        )}

        {status === 'Aktif' && ownership === 'Milik Sendiri' && (
          <div
            className="min-w-0 max-w-full rounded-lg focus:outline-none focus:ring-3 focus:ring-red-100 sm:col-span-2"
            tabIndex={-1}
            aria-invalid={Boolean(warehouseErrors?.shm)}
          >
            <label htmlFor={`warehouse-${index}-shm`} className={labelClass}>
              {existingShm ? 'Ganti PDF SHM' : 'Upload SHM'}{' '}
              <span className="text-red-600">*</span>
            </label>
            <Controller
              control={control}
              name={`warehouses.${index}.shm`}
              render={({ field: { onChange, onBlur, name, ref } }) => {
                const input = (
                  <input
                    key={`shm-${index}-${existingShm?.fileId ?? 'new'}`}
                    id={`warehouse-${index}-shm`}
                    type="file"
                    accept="application/pdf,.pdf"
                    name={name}
                    ref={ref}
                    onBlur={onBlur}
                    onChange={(event) => onChange(event.target.files?.[0])}
                    aria-invalid={Boolean(warehouseErrors?.shm)}
                    className="sr-only"
                  />
                )
                return newShm || existingShm ? (
                  <div className="file-selected">
                    <span
                      className="block w-full min-w-0 max-w-full flex-1 truncate text-sm font-semibold text-emerald-800"
                      title={shmFileName}
                    >
                      ✓ {shmFileName}
                    </span>
                    <div className="file-actions">
                      {!newShm && existingShm && (
                        <a href={existingShm.url} target="_blank" rel="noreferrer" className="button-text">
                          Lihat Dokumen
                        </a>
                      )}
                      <label htmlFor={`warehouse-${index}-shm`} className="button-text">
                        Ganti PDF
                        {input}
                      </label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor={`warehouse-${index}-shm`} className="upload-box">
                    <span className="text-sm font-bold text-sig-ink">Pilih PDF SHM</span>
                    <span className="text-xs text-slate-500">Maksimal 10 MB</span>
                    {input}
                  </label>
                )
              }}
            />
            <FieldError message={warehouseErrors?.shm?.message} />
          </div>
        )}

        {status === 'Aktif' && ownership === 'Sewa' && (
          <>
            <div className="min-w-0 max-w-full">
              <label htmlFor={`warehouse-${index}-start`} className={labelClass}>
                Mulai Sewa <span className="text-red-600">*</span>
              </label>
              <input
                id={`warehouse-${index}-start`}
                type="date"
                aria-invalid={Boolean(warehouseErrors?.mulaiSewa)}
                className={`${inputClass} ${warehouseErrors?.mulaiSewa ? 'border-red-500' : ''}`}
                {...register(`warehouses.${index}.mulaiSewa`, {
                  deps: `warehouses.${index}.berakhirSewa`,
                })}
              />
              <FieldError message={warehouseErrors?.mulaiSewa?.message} />
            </div>

            <div className="min-w-0 max-w-full">
              <label htmlFor={`warehouse-${index}-end`} className={labelClass}>
                Berakhir Sewa <span className="text-red-600">*</span>
              </label>
              <input
                id={`warehouse-${index}-end`}
                type="date"
                min={getValues(`warehouses.${index}.mulaiSewa`) || undefined}
                aria-invalid={Boolean(warehouseErrors?.berakhirSewa)}
                className={`${inputClass} ${warehouseErrors?.berakhirSewa ? 'border-red-500' : ''}`}
                {...register(`warehouses.${index}.berakhirSewa`)}
              />
              <FieldError message={warehouseErrors?.berakhirSewa?.message} />
            </div>

            <div
              className="min-w-0 max-w-full rounded-lg focus:outline-none focus:ring-3 focus:ring-red-100 sm:col-span-2"
              tabIndex={-1}
              aria-invalid={Boolean(warehouseErrors?.buktiSewa)}
            >
              <label
                htmlFor={`warehouse-${index}-rental-proof`}
                className={labelClass}
              >
                {existingBuktiSewa
                  ? 'Ganti PDF Bukti Sewa'
                  : 'Upload Bukti Sewa'}{' '}
                <span className="text-red-600">*</span>
              </label>
              <Controller
                control={control}
                name={`warehouses.${index}.buktiSewa`}
                render={({ field: { onChange, onBlur, name, ref } }) => {
                  const input = (
                    <input
                      key={`rental-proof-${index}-${existingBuktiSewa?.fileId ?? 'new'}`}
                      id={`warehouse-${index}-rental-proof`}
                      type="file"
                      accept="application/pdf,.pdf"
                      name={name}
                      ref={ref}
                      onBlur={onBlur}
                      onChange={(event) => onChange(event.target.files?.[0])}
                      aria-invalid={Boolean(warehouseErrors?.buktiSewa)}
                      className="sr-only"
                    />
                  )
                  return newBuktiSewa || existingBuktiSewa ? (
                    <div className="file-selected">
                      <span
                        className="block w-full min-w-0 max-w-full flex-1 truncate text-sm font-semibold text-emerald-800"
                        title={rentalProofFileName}
                      >
                        ✓ {rentalProofFileName}
                      </span>
                      <div className="file-actions">
                        {!newBuktiSewa && existingBuktiSewa && (
                          <a href={existingBuktiSewa.url} target="_blank" rel="noreferrer" className="button-text">
                            Lihat Dokumen
                          </a>
                        )}
                        <label htmlFor={`warehouse-${index}-rental-proof`} className="button-text">
                          Ganti PDF
                          {input}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor={`warehouse-${index}-rental-proof`} className="upload-box">
                      <span className="text-sm font-bold text-sig-ink">Pilih PDF Bukti Sewa</span>
                      <span className="text-xs text-slate-500">Maksimal 10 MB</span>
                      {input}
                    </label>
                  )
                }}
              />
              <FieldError message={warehouseErrors?.buktiSewa?.message} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
