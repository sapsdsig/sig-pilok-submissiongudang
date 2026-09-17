interface ReadonlyFieldProps {
  label: string
  value: string
}

export function ReadonlyField({ label, value }: ReadonlyFieldProps) {
  return (
    <div>
      <span className="field-label">
        {label}
      </span>
      <div className="min-h-11 rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  )
}
