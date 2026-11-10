/**
 * Adapters between the native `datetime-local` control, the ISO strings the API
 * contract uses, and the text shown to the user. Pure — no React, no clock read
 * except where the caller asks for one.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * `'YYYY-MM-DDTHH:mm'` (local wall-clock, no offset) to an ISO 8601 string.
 * `Date` parses an offset-less date-time as local time, which is exactly what
 * the control means.
 */
export function toIso(localInputValue: string): string {
  return new Date(localInputValue).toISOString()
}

/** The inverse of {@link toIso}, for seeding a `datetime-local` control. */
export function toLocalInputValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const startFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * Human-readable start time in the browser's default locale. Localization is
 * out of scope, so no locale is pinned — and tests must not assert on the
 * output, which keeps the suite free of locale and clock dependence.
 */
export function formatSessionStart(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return isoString
  }
  return startFormatter.format(date)
}
