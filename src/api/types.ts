/**
 * Shapes of the sessions HTTP contract.
 *
 * Imported by the API client and by the mock transport, so the mock cannot
 * drift from the contract. Nothing here knows about React or about `fetch`.
 */

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'

/**
 * Every concrete status, in the order the filter should offer them.
 * A union plus a const array rather than a TS enum, which `erasableSyntaxOnly`
 * forbids.
 */
export const SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
]

export interface Session {
  /** Server-assigned, opaque, stable within a browser session. */
  id: string
  /** Trimmed, 3-80 characters. */
  title: string
  status: SessionStatus
  /** ISO 8601 with offset or `Z`. */
  startsAt: string
}

/** Request body of `POST /api/sessions`: the server assigns `id` and `status`. */
export interface CreateSessionInput {
  /** Already trimmed by the caller. */
  title: string
  /** ISO 8601 string. */
  startsAt: string
}
