/**
 * Create-form validation. Pure and clock-free: `now` is a parameter so the
 * "must be in the future" rule is testable and cannot rot.
 */

export const TITLE_MIN_LENGTH = 3
export const TITLE_MAX_LENGTH = 80

export interface SessionFormValues {
  title: string
  startsAt: string
}

/** A field is listed only when it is invalid; an empty object means valid. */
export interface SessionFormErrors {
  title?: string
  startsAt?: string
}

export function validateSessionForm(
  values: SessionFormValues,
  now: Date,
): SessionFormErrors {
  const errors: SessionFormErrors = {}

  // Whitespace-only and too-short share one message: both describe the same fix.
  const title = values.title.trim()
  if (title.length < TITLE_MIN_LENGTH) {
    errors.title = `Enter a title of at least ${TITLE_MIN_LENGTH} characters.`
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Shorten the title to ${TITLE_MAX_LENGTH} characters or fewer.`
  }

  if (values.startsAt.trim().length === 0) {
    errors.startsAt = 'Enter a start date and time.'
  } else {
    const startsAt = new Date(values.startsAt)
    if (Number.isNaN(startsAt.getTime())) {
      errors.startsAt = 'Enter a valid start date and time.'
    } else if (startsAt.getTime() <= now.getTime()) {
      errors.startsAt = 'Choose a start date and time in the future.'
    }
  }

  return errors
}

export function hasErrors(errors: SessionFormErrors): boolean {
  return errors.title !== undefined || errors.startsAt !== undefined
}
