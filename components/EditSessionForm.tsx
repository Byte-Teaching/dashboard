'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from './Input'
import { DateTimePicker } from './DateTimePicker'
import { DurationSelect } from './DurationSelect'
import { Textarea } from './Textarea'
import { Select } from './Select'
import { Button } from './Button'
import { updateSession } from '@/app/actions/sessions'
import { assertValidSessionDates } from '@/lib/session-validation'
import { computeDateEnd, exactDurationFromDates } from '@/lib/session-duration'
import type { LocationType, Session } from '@/lib/types'

interface EditSessionFormProps {
  session: Session
  onCancel: () => void
  onSave: () => void
}

export function EditSessionForm({ session, onCancel, onSave }: EditSessionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationType, setLocationType] = useState(session.location_type)

  // Prefill with the stored duration; if it's off the 30-minute grid (legacy
  // data) it's surfaced as an extra option so saving an unrelated edit never
  // silently shifts date_end.
  const storedDuration = exactDurationFromDates(session.date_start, session.date_end)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const dateStart = new Date(formData.get('date_start') as string).toISOString()
      const dateEnd = computeDateEnd(dateStart, Number(formData.get('duration')))

      assertValidSessionDates(dateStart, dateEnd)

      await updateSession(session.id, {
        title: formData.get('title') as string,
        description: formData.get('description')?.toString() || null,
        date_start: dateStart,
        date_end: dateEnd,
        location_type: locationType,
        teams_meeting_url:
          locationType === 'MS_TEAMS' || locationType === 'HYBRID'
            ? formData.get('teams_meeting_url')?.toString() || null
            : null,
      })

      router.refresh()
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
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
        defaultValue={session.title}
        required
      />

      <Textarea
        label="Description"
        name="description"
        defaultValue={session.description || ''}
        rows={4}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePicker
          label="Start Date & Time"
          name="date_start"
          defaultValue={session.date_start}
          required
        />
        <DurationSelect
          name="duration"
          defaultMinutes={storedDuration || 60}
          extraOptionMinutes={storedDuration || undefined}
          allowFullDay
          required
        />
      </div>

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
          defaultValue={session.teams_meeting_url || ''}
          placeholder="https://teams.microsoft.com/..."
        />
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
