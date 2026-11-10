import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CreateSessionInput } from '../../api/types.ts'
import { toIso } from './datetime.ts'
import { hasErrors, validateSessionForm } from './validation.ts'
import type { SessionFormErrors } from './validation.ts'

interface CreateSessionFormProps {
  onSubmit: (input: CreateSessionInput) => Promise<unknown>
  onSuccess: () => void
  onCancel: () => void
}

const FALLBACK_ERROR = 'Could not create the session. Please try again.'

/**
 * Owns the field values, their validation messages, and the submit lifecycle.
 * It does not know about the API client, the mock, or the active filter — it
 * only reports a validated input to its parent.
 */
export function CreateSessionForm({
  onSubmit,
  onSuccess,
  onCancel,
}: CreateSessionFormProps) {
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [errors, setErrors] = useState<SessionFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    // "Future" is judged at submit time, against the clock as it is now.
    const nextErrors = validateSessionForm({ title, startsAt }, new Date())
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      // No request leaves the form while any field is invalid.
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    let succeeded = false
    try {
      await onSubmit({ title: title.trim(), startsAt: toIso(startsAt) })
      succeeded = true
    } catch (error: unknown) {
      // The entered values stay put so the submission can be retried.
      setSubmitError(error instanceof Error ? error.message : FALLBACK_ERROR)
    } finally {
      setIsSubmitting(false)
    }

    if (succeeded) {
      onSuccess()
    }
  }

  return (
    <form className="session-form" onSubmit={handleSubmit} noValidate>
      <h2>New Session</h2>

      <div className="field">
        <label htmlFor="session-title">Title</label>
        <input
          id="session-title"
          name="title"
          type="text"
          value={title}
          autoComplete="off"
          placeholder="Advanced TypeScript Workshop…"
          aria-describedby={errors.title ? 'session-title-error' : undefined}
          aria-invalid={errors.title ? true : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
        />
        {errors.title ? (
          <p className="field-error" id="session-title-error">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="session-starts-at">Start Date and Time</label>
        <input
          id="session-starts-at"
          name="startsAt"
          type="datetime-local"
          value={startsAt}
          aria-describedby={
            errors.startsAt ? 'session-starts-at-error' : undefined
          }
          aria-invalid={errors.startsAt ? true : undefined}
          onChange={(event) => {
            setStartsAt(event.target.value)
          }}
        />
        {errors.startsAt ? (
          <p className="field-error" id="session-starts-at-error">
            {errors.startsAt}
          </p>
        ) : null}
      </div>

      <p className="form-error" role="status">
        {submitError}
      </p>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Session'}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
