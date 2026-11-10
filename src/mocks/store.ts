import type { CreateSessionInput, Session } from '../api/types.ts'

/**
 * In-memory state behind the mock transport.
 *
 * This is the only place seed data exists. `POST` appends here, so a created
 * session is returned by the next `GET` within the same session — the mock
 * keeps state rather than replaying a static fixture.
 */

const DAY_MS = 24 * 60 * 60 * 1000

let sessions: Session[] = []
let nextId = 0

function createId(): string {
  nextId += 1
  return `session-${nextId}`
}

/**
 * Seeds spanning two statuses, with every date derived from `Date.now()` so
 * the data cannot rot. `cancelled` is deliberately absent, which keeps the
 * "no session matches this filter" state reachable.
 */
function seed(): Session[] {
  const now = Date.now()
  return [
    {
      id: createId(),
      title: 'React Fundamentals',
      status: 'scheduled',
      startsAt: new Date(now + 2 * DAY_MS).toISOString(),
    },
    {
      id: createId(),
      title: 'TypeScript Deep Dive',
      status: 'scheduled',
      startsAt: new Date(now + 9 * DAY_MS).toISOString(),
    },
    {
      id: createId(),
      title: 'Accessibility Workshop',
      status: 'completed',
      startsAt: new Date(now - 3 * DAY_MS).toISOString(),
    },
    {
      id: createId(),
      title: 'Testing with Vitest',
      status: 'completed',
      startsAt: new Date(now - 10 * DAY_MS).toISOString(),
    },
  ]
}

sessions = seed()

export function listAll(): Session[] {
  return sessions
}

/** Appends one session, assigning the server-owned `id` and `status`. */
export function add(input: CreateSessionInput): Session {
  const created: Session = {
    id: createId(),
    title: input.title,
    status: 'scheduled',
    startsAt: input.startsAt,
  }
  sessions = [...sessions, created]
  return created
}

/** Re-seeds the store. Called between tests so one test cannot leak into the next. */
export function resetStore(): void {
  nextId = 0
  sessions = seed()
}
