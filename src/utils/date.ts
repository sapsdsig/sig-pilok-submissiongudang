export interface CalendarDateParts {
  day: number
  month: number
  year: number
}

const NATIVE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PERSISTED_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/
const LEGACY_COLON_DATE_PATTERN = /^(\d{2}):(\d{2}):(\d{4})$/

const isLeapYear = (year: number) =>
  year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)

const daysInMonth = (month: number, year: number) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function isValidCalendarDateParts({
  day,
  month,
  year,
}: CalendarDateParts): boolean {
  return (
    Number.isInteger(day) &&
    Number.isInteger(month) &&
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(month, year)
  )
}

function parseDateParts(
  value: string,
  pattern: RegExp,
  indexes: { day: number; month: number; year: number },
): CalendarDateParts | null {
  const match = pattern.exec(value)
  if (!match) return null

  const parts = {
    day: Number(match[indexes.day]),
    month: Number(match[indexes.month]),
    year: Number(match[indexes.year]),
  }
  return isValidCalendarDateParts(parts) ? parts : null
}

export function parseNativeDate(value: string): CalendarDateParts | null {
  return parseDateParts(value, NATIVE_DATE_PATTERN, {
    day: 3,
    month: 2,
    year: 1,
  })
}

export function formatNativeDate(parts: CalendarDateParts): string {
  if (!isValidCalendarDateParts(parts)) {
    throw new RangeError('Tanggal kalender tidak valid.')
  }
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function compareNativeDates(
  left: string,
  right: string,
): number | null {
  const leftParts = parseNativeDate(left)
  const rightParts = parseNativeDate(right)
  if (!leftParts || !rightParts) return null

  const leftKey =
    leftParts.year * 10_000 + leftParts.month * 100 + leftParts.day
  const rightKey =
    rightParts.year * 10_000 + rightParts.month * 100 + rightParts.day
  return Math.sign(leftKey - rightKey)
}

export function formatPersistedRentalDate(value: string): string {
  const parts = parseNativeDate(value)
  if (!parts) throw new RangeError('Tanggal sewa internal tidak valid.')
  return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.year).padStart(4, '0')}`
}

export function normalizeStoredRentalDate(value: string): string {
  const persisted = parseDateParts(value, PERSISTED_DATE_PATTERN, {
    day: 1,
    month: 2,
    year: 3,
  })
  if (persisted) return formatNativeDate(persisted)

  const native = parseNativeDate(value)
  if (native) return formatNativeDate(native)

  const legacyColon = parseDateParts(value, LEGACY_COLON_DATE_PATTERN, {
    day: 1,
    month: 2,
    year: 3,
  })
  return legacyColon ? formatNativeDate(legacyColon) : value
}
