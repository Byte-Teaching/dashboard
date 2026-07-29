export const SESSION_REPEAT_VALUES = [
  'NONE',
  'WEEKLY',
  'FORTNIGHTLY',
  'MONTHLY_NTH_WEEKDAY',
] as const

export type SessionRepeat = (typeof SESSION_REPEAT_VALUES)[number]

export const MAX_SESSION_OCCURRENCES = 52

const LOCAL_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const ORDINAL_NAMES = ['first', 'second', 'third', 'fourth', 'fifth'] as const

interface LocalDateTimeParts {
  year: number
  monthIndex: number
  day: number
  time: string
}

function parseLocalDateTime(value: string): LocalDateTimeParts {
  const match = LOCAL_DATE_TIME_RE.exec(value)
  if (!match) throw new Error('Choose a valid session start date and time')

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day, 12))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Choose a valid session start date and time')
  }

  return {
    year,
    monthIndex,
    day,
    time: `${match[4]}:${match[5]}`,
  }
}

function formatLocalDateTime(
  year: number,
  monthIndex: number,
  day: number,
  time: string
): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}`
}

function addDays(parts: LocalDateTimeParts, days: number): string {
  const date = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day + days, 12))
  return formatLocalDateTime(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    parts.time
  )
}

function nthWeekdayInMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  ordinal: number
): number | null {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1, 12)).getUTCDay()
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate()
  return day <= daysInMonth ? day : null
}

/**
 * Materialise a recurrence into local wall-clock values. Each value is later
 * converted to an instant in the browser, preserving the chosen time across
 * daylight-saving changes.
 */
export function buildRecurringLocalStarts(
  firstStart: string,
  repeat: SessionRepeat,
  occurrenceCount: number
): string[] {
  const first = parseLocalDateTime(firstStart)
  if (!SESSION_REPEAT_VALUES.includes(repeat)) {
    throw new Error('Choose a valid repeat pattern')
  }

  if (repeat === 'NONE') return [firstStart]
  if (
    !Number.isInteger(occurrenceCount) ||
    occurrenceCount < 2 ||
    occurrenceCount > MAX_SESSION_OCCURRENCES
  ) {
    throw new Error(`Number of sessions must be between 2 and ${MAX_SESSION_OCCURRENCES}`)
  }

  if (repeat === 'WEEKLY' || repeat === 'FORTNIGHTLY') {
    const stepDays = repeat === 'WEEKLY' ? 7 : 14
    return Array.from({ length: occurrenceCount }, (_, index) =>
      addDays(first, index * stepDays)
    )
  }

  const weekday = new Date(
    Date.UTC(first.year, first.monthIndex, first.day, 12)
  ).getUTCDay()
  const ordinal = Math.ceil(first.day / 7)
  const starts = [firstStart]
  let monthOffset = 1

  while (starts.length < occurrenceCount) {
    const absoluteMonth = first.year * 12 + first.monthIndex + monthOffset
    const year = Math.floor(absoluteMonth / 12)
    const monthIndex = absoluteMonth % 12
    const day = nthWeekdayInMonth(year, monthIndex, weekday, ordinal)
    if (day !== null) {
      starts.push(formatLocalDateTime(year, monthIndex, day, first.time))
    }
    monthOffset += 1
  }

  return starts
}

export function monthlyRepeatLabel(firstStart: string): string {
  try {
    const first = parseLocalDateTime(firstStart)
    const weekday = new Date(
      Date.UTC(first.year, first.monthIndex, first.day, 12)
    ).getUTCDay()
    const ordinal = Math.ceil(first.day / 7)
    return `Monthly on the ${ORDINAL_NAMES[ordinal - 1]} ${WEEKDAY_NAMES[weekday]}`
  } catch {
    return 'Monthly on the same numbered weekday'
  }
}
