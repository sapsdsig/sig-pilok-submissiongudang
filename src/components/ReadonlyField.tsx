interface ReadonlyFieldProps {
  label: string
  value: string
}

export function ReadonlyField({ label, value }: ReadonlyFieldProps) {
  return (
    <div className="w-full min-w-0 max-w-full">
      <span className="field-label">
        {label}
      </span>
      <div
        className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 [overflow-wrap:anywhere]"
        title={value}
      >
        {value}
      </div>
    </div>
  )
}
