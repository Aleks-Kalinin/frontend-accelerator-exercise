import type { CreateSessionInput, Session } from './types.ts'

/**
 * The single request boundary for sessions.
 *
 * This is the only module that knows the URL, calls `fetch`, parses a response,
 * or sees an HTTP status. UI code imports these two functions and `ApiError`,
 * never a URL and never a status code.
 */

const SESSIONS_PATH = '/api/sessions'

const GENERIC_FAILURE =
  'Something went wrong while talking to the server. Please try again.'
const CONNECTION_FAILURE =
  'Could not reach the server. Check your connection and try again.'

/** A failure a component can show to the user as-is. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Reads `{ message }` from an error body, falling back to a generic sentence.
 * A body that is missing, empty, or not JSON is normal here, so a parse failure
 * is swallowed rather than masking the original error.
 */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string' &&
      body.message.length > 0
    ) {
      return body.message
    }
  } catch {
    // Fall through to the generic message.
  }
  return GENERIC_FAILURE
}

/**
 * Sends one request and narrows the outcome to either a parsed JSON body or a
 * thrown `ApiError`. No `Response` and no status escapes this function.
 */
async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(CONNECTION_FAILURE)
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response))
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError(GENERIC_FAILURE)
  }
}

/** `GET /api/sessions` — every session, unfiltered. Filtering is client-side. */
export function listSessions(signal?: AbortSignal): Promise<Session[]> {
  return requestJson<Session[]>(SESSIONS_PATH, { signal })
}

/**
 * `POST /api/sessions` — returns the created session as the server built it,
 * including the assigned `id` and `status`.
 */
export function createSession(input: CreateSessionInput): Promise<Session> {
  return requestJson<Session>(SESSIONS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title, startsAt: input.startsAt }),
  })
}
