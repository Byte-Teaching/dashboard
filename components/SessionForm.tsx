'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from './Input'
import { DateTimePicker } from './DateTimePicker'
import { Textarea } from './Textarea'
import { Select } from './Select'
import { Button } from './Button'
import { DurationSelect } from './DurationSelect'
import { createSession } from '@/app/actions/sessions'
import type { LocationType } from '@/lib/types'
import { computeDateEnd } from '@/lib/session-duration'
import {
  buildRecurringLocalStarts,
  monthlyRepeatLabel,
  type SessionRepeat,
} from '@/lib/session-recurrence'
import { assertValidSessionDates } from '@/lib/session-validation'

interface SessionFormProps {
  departmentId: string
  departmentName: string
}

export function SessionForm({ departmentId, departmentName }: SessionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationType, setLocationType] = useState<LocationType>('JITSI')
  const [repeat, setRepeat] = useState<SessionRepeat>('NONE')
  const [occurrenceCount, setOccurrenceCount] = useState(6)
  const [localStart, setLocalStart] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const durationMins = Number(formData.get('duration'))
      const localStarts = buildRecurringLocalStarts(
        formData.get('date_start') as string,
        repeat,
        occurrenceCount
      )
      const dateStarts = localStarts.map((value) => {
        const dateStart = new Date(value).toISOString()
        assertValidSessionDates(dateStart, computeDateEnd(dateStart, durationMins))
        return dateStart
      })

      const result = await createSession({
        department_id: departmentId,
        title: formData.get('title') as string,
        description: formData.get('description')?.toString() || undefined,
        date_starts: dateStarts,
        duration_mins: durationMins,
        location_type: locationType,
        teams_meeting_url:
          formData.get('teams_meeting_url')?.toString() || null,
      })

      router.push(
        `/departments/${departmentId}/sessions?created=${result.created}`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 border border-red-500 bg-red-50">
          <p className="font-mono text-sm text-red-800">{error}</p>
        </div>
      )}

      <Input
        label="Title"
        name="title"
        required
      />

      <Textarea
        label="Description"
        name="description"
        rows={4}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePicker
          label="Start Date & Time"
          name="date_start"
          onChange={setLocalStart}
          required
        />
        <DurationSelect name="duration" allowFullDay required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Repeat"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value as SessionRepeat)}
          required
        >
          <option value="NONE">Does not repeat</option>
          <option value="WEEKLY">Every week</option>
          <option value="FORTNIGHTLY">Every 2 weeks</option>
          <option value="MONTHLY_NTH_WEEKDAY">
            {monthlyRepeatLabel(localStart)}
          </option>
        </Select>
        {repeat !== 'NONE' ? (
          <Input
            label="Number of sessions"
            name="occurrence_count"
            type="number"
            min={2}
            max={52}
            value={occurrenceCount}
            onChange={(event) => setOccurrenceCount(Number(event.target.value))}
            required
          />
        ) : null}
      </div>
      {repeat !== 'NONE' ? (
        <p className="font-mono text-xs text-gray-500">
          Repeats create separate draft sessions. Each one can be edited or
          published independently.
        </p>
      ) : null}

      <Select
        label="Location Type"
        value={locationType}
        onChange={(event) =>
          setLocationType(event.target.value as LocationType)
        }
        required
      >
        <option value="JITSI">Petrios Meet (Video)</option>
        <option value="MS_TEAMS">MS Teams</option>
        <option value="IN_PERSON">In Person</option>
        <option value="HYBRID">Hybrid</option>
      </Select>

      {locationType === 'MS_TEAMS' || locationType === 'HYBRID' ? (
        <Input
          label="MS Teams Meeting URL"
          name="teams_meeting_url"
          type="url"
          placeholder="https://teams.microsoft.com/..."
        />
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading
            ? 'Creating...'
            : repeat === 'NONE'
              ? 'Create Session'
              : `Create ${occurrenceCount || ''} Sessions`}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
