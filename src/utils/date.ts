export interface CalendarDateParts {
  day: number
  month: number
  year: number
}

const INDONESIAN_DATE_PATTERN = /^(\d{2}):(\d{2}):(\d{4})$/
const LEGACY_ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

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

export function parseIndonesianDate(
  value: string,
): CalendarDateParts | null {
  const match = INDONESIAN_DATE_PATTERN.exec(value)
  if (!match) return null

  const parts = {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  }
  return isValidCalendarDateParts(parts) ? parts : null
}

export function formatIndonesianDate(parts: CalendarDateParts): string {
  if (!isValidCalendarDateParts(parts)) {
    throw new RangeError('Tanggal kalender tidak valid.')
  }
  return `${String(parts.day).padStart(2, '0')}:${String(parts.month).padStart(2, '0')}:${String(parts.year).padStart(4, '0')}`
}

export function compareIndonesianDates(
  left: string,
  right: string,
): number | null {
  const leftParts = parseIndonesianDate(left)
  const rightParts = parseIndonesianDate(right)
  if (!leftParts || !rightParts) return null

  const leftKey =
    leftParts.year * 10_000 + leftParts.month * 100 + leftParts.day
  const rightKey =
    rightParts.year * 10_000 + rightParts.month * 100 + rightParts.day
  return Math.sign(leftKey - rightKey)
}

export function normalizeStoredRentalDate(value: string): string {
  const current = parseIndonesianDate(value)
  if (current) return formatIndonesianDate(current)

  const legacy = LEGACY_ISO_DATE_PATTERN.exec(value)
  if (!legacy) return value
  const legacyParts = {
    day: Number(legacy[3]),
    month: Number(legacy[2]),
    year: Number(legacy[1]),
  }
  return isValidCalendarDateParts(legacyParts)
    ? formatIndonesianDate(legacyParts)
    : value
}
