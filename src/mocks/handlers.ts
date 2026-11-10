import { HttpResponse, delay, http } from 'msw'
import type { HttpHandler } from 'msw'
import type { Session } from '../api/types.ts'
import { add, listAll } from './store.ts'

/**
 * The single definition of mock behavior, shared by the dev browser and the
 * test run. Nothing here imports from `src/features/` or from the API client —
 * this is a transport-level mock, not a substitute for the API boundary.
 */

const SESSIONS_PATH = '/api/sessions'

const TITLE_MIN = 3
const TITLE_MAX = 80

interface CreateSessionBody {
  title: string
  startsAt: string
}

/**
 * Server-side mirror of the create rules. Client-side validation makes this
 * unreachable in normal use; the handler enforces it anyway so the contract
 * stays honest.
 */
function rejectCreateBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return 'The request body must be a JSON object.'
  }

  const { title, startsAt } = body as Partial<CreateSessionBody>

  if (typeof title !== 'string') {
    return 'Title is required.'
  }
  const trimmed = title.trim()
  if (trimmed.length < TITLE_MIN) {
    return `Title must be at least ${TITLE_MIN} characters.`
  }
  if (trimmed.length > TITLE_MAX) {
    return `Title must be at most ${TITLE_MAX} characters.`
  }

  if (typeof startsAt !== 'string') {
    return 'Start date and time is required.'
  }
  const startsAtMs = Date.parse(startsAt)
  if (Number.isNaN(startsAtMs)) {
    return 'Start date and time is not a valid date.'
  }
  if (startsAtMs <= Date.now()) {
    return 'Start date and time must be in the future.'
  }

  return null
}

/**
 * Builds the handlers with an environment-specific latency. The browser passes
 * a visible delay so loading and pending states can be observed; the test setup
 * passes 0 so the suite stays fast. The logic is identical either way.
 */
export function createSessionHandlers(
  options?: { delayMs?: number },
): HttpHandler[] {
  const delayMs = options?.delayMs ?? 0

  return [
    http.get(SESSIONS_PATH, async () => {
      await delay(delayMs)
      return HttpResponse.json<Session[]>(listAll())
    }),

    http.post(SESSIONS_PATH, async ({ request }) => {
      const body: unknown = await request.json()
      const rejection = rejectCreateBody(body)

      if (rejection !== null) {
        return HttpResponse.json({ message: rejection }, { status: 400 })
      }

      const { title, startsAt } = body as CreateSessionBody
      await delay(delayMs)
      const created = add({ title: title.trim(), startsAt })
      return HttpResponse.json<Session>(created, { status: 201 })
    }),
  ]
}
