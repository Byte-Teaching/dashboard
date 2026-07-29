import { Select, type SelectChangeEvent } from './Select'
import {
  FULL_DAY_SESSION_DURATION_MINS,
  formatDuration,
  listDurationOptions,
} from '@/lib/session-duration'

interface DurationSelectProps {
  name: string
  label?: string
  onChange?: (event: SelectChangeEvent) => void
  defaultMinutes?: number
  /** A legacy off-grid duration (e.g. 100 min) to surface as an extra option
   *  so editing an old session never silently shifts its end time. */
  extraOptionMinutes?: number
  allowFullDay?: boolean
  required?: boolean
}

export function DurationSelect({
  name,
  label = 'Duration',
  onChange,
  defaultMinutes = 60,
  extraOptionMinutes,
  allowFullDay = false,
  required,
}: DurationSelectProps) {
  const options = listDurationOptions(allowFullDay)
  if (
    extraOptionMinutes !== undefined &&
    extraOptionMinutes > 0 &&
    !options.includes(extraOptionMinutes)
  ) {
    options.push(extraOptionMinutes)
    options.sort((a, b) => a - b)
  }

  return (
    <Select
      label={label}
      name={name}
      defaultValue={String(defaultMinutes)}
      required={required}
      onChange={onChange}
    >
      {options.map((mins) => (
        <option key={mins} value={mins}>
          {mins === FULL_DAY_SESSION_DURATION_MINS
            ? `Full day (${formatDuration(mins)})`
            : formatDuration(mins)}
        </option>
      ))}
    </Select>
  )
}
