import { useState } from 'react'
import { CreateSessionForm } from './CreateSessionForm.tsx'
import { SessionList } from './SessionList.tsx'
import { StatusFilter } from './StatusFilter.tsx'
import type { StatusFilterValue } from './StatusFilter.tsx'
import { useSessions } from './useSessions.ts'

/**
 * Composition root of the feature. It owns the two pieces of purely local UI
 * state — the active filter and whether the create form is open — and leaves
 * remote state to `useSessions`.
 */
export function SessionsWorkspace() {
  const { sessions, state, errorMessage, reload, create } = useSessions()
  const [filter, setFilter] = useState<StatusFilterValue>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Derived, not stored: filtering happens over the already-loaded list and
  // never re-issues a request.
  const visibleSessions =
    filter === 'all'
      ? sessions
      : sessions.filter((session) => session.status === filter)

  function handleCreated() {
    setIsFormOpen(false)
    // Reset to All so the user always sees the result of their action, even if
    // the active filter would have hidden the new session.
    setFilter('all')
  }

  return (
    <section className="sessions-workspace">
      <div className="workspace-toolbar">
        <StatusFilter value={filter} onChange={setFilter} />
        {isFormOpen ? null : (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setIsFormOpen(true)
            }}
          >
            New Session
          </button>
        )}
      </div>

      {isFormOpen ? (
        <CreateSessionForm
          onSubmit={create}
          onSuccess={handleCreated}
          onCancel={() => {
            setIsFormOpen(false)
          }}
        />
      ) : null}

      {state === 'loading' ? (
        <p className="sessions-loading" role="status">
          Loading sessions…
        </p>
      ) : null}

      {state === 'error' ? (
        <div className="sessions-error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={reload}>
            Try Again
          </button>
        </div>
      ) : null}

      {/*
        Also rendered in the error state once there is something to show: a
        session created while the last load was failing must stay visible, and
        the error plus its retry stay on screen because the list is still
        incomplete.
      */}
      {state === 'ready' || (state === 'error' && sessions.length > 0) ? (
        <SessionList sessions={visibleSessions} />
      ) : null}
    </section>
  )
}
