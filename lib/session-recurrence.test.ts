import { describe, expect, it } from 'vitest'
import {
  MAX_SESSION_OCCURRENCES,
  buildRecurringLocalStarts,
  monthlyRepeatLabel,
} from './session-recurrence'

describe('buildRecurringLocalStarts', () => {
  it('returns one start when a session does not repeat', () => {
    expect(buildRecurringLocalStarts('2026-08-07T09:00', 'NONE', 99)).toEqual([
      '2026-08-07T09:00',
    ])
  })

  it('builds weekly and alternate-week recurrences at the same wall time', () => {
    expect(buildRecurringLocalStarts('2026-08-07T09:00', 'WEEKLY', 3)).toEqual([
      '2026-08-07T09:00',
      '2026-08-14T09:00',
      '2026-08-21T09:00',
    ])
    expect(
      buildRecurringLocalStarts('2026-08-07T09:00', 'FORTNIGHTLY', 3)
    ).toEqual([
      '2026-08-07T09:00',
      '2026-08-21T09:00',
      '2026-09-04T09:00',
    ])
  })

  it('builds the same ordinal weekday in following months', () => {
    expect(
      buildRecurringLocalStarts('2026-07-17T13:30', 'MONTHLY_NTH_WEEKDAY', 4)
    ).toEqual([
      '2026-07-17T13:30',
      '2026-08-21T13:30',
      '2026-09-18T13:30',
      '2026-10-16T13:30',
    ])
  })

  it('skips months that do not contain a fifth matching weekday', () => {
    expect(
      buildRecurringLocalStarts('2026-07-31T13:30', 'MONTHLY_NTH_WEEKDAY', 3)
    ).toEqual([
      '2026-07-31T13:30',
      '2026-10-30T13:30',
      '2027-01-29T13:30',
    ])
  })

  it('rejects invalid inputs and excessive batches', () => {
    expect(() =>
      buildRecurringLocalStarts('not-a-date', 'WEEKLY', 3)
    ).toThrow('valid session start')
    expect(() =>
      buildRecurringLocalStarts('2026-08-07T09:00', 'WEEKLY', 1)
    ).toThrow('between 2')
    expect(() =>
      buildRecurringLocalStarts(
        '2026-08-07T09:00',
        'WEEKLY',
        MAX_SESSION_OCCURRENCES + 1
      )
    ).toThrow(String(MAX_SESSION_OCCURRENCES))
  })
})

describe('monthlyRepeatLabel', () => {
  it('describes the selected ordinal weekday', () => {
    expect(monthlyRepeatLabel('2026-07-17T13:30')).toBe(
      'Monthly on the third Friday'
    )
    expect(monthlyRepeatLabel('')).toBe('Monthly on the same numbered weekday')
  })
})
