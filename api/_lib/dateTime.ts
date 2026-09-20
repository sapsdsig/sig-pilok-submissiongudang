const WIB_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const WIB_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
const LEGACY_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/

const formatterPart = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => {
  const value = parts.find((part) => part.type === type)?.value
  if (!value) throw new Error(`Komponen waktu ${type} tidak tersedia.`)
  return value
}

export function getWibTimestamp(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Waktu tidak valid.')

  const parts = WIB_FORMATTER.formatToParts(now)
  const year = formatterPart(parts, 'year')
  const month = formatterPart(parts, 'month')
  const day = formatterPart(parts, 'day')
  const hour = formatterPart(parts, 'hour')
  const minute = formatterPart(parts, 'minute')
  const second = formatterPart(parts, 'second')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function isValidWibTimestamp(value: string): boolean {
  const match = WIB_TIMESTAMP_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  )
}

export function isSupportedStoredTimestamp(value: string): boolean {
  if (isValidWibTimestamp(value)) return true
  return (
    LEGACY_UTC_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}
