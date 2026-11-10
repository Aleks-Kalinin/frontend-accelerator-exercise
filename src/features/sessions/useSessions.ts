import { useCallback, useEffect, useState } from 'react'
import { ApiError, createSession, listSessions } from '../../api/sessions.ts'
import type { CreateSessionInput, Session } from '../../api/types.ts'

/**
 * The single owner of remote session-list state.
 *
 * `state` is one discriminating value rather than three booleans, so loading,
 * ready, and error cannot be shown at the same time. The empty-list case is
 * derived by the caller, never stored.
 */

export type SessionsState = 'loading' | 'ready' | 'error'

const FALLBACK_ERROR = 'Could not load sessions. Please try again.'

export interface UseSessionsResult {
  sessions: Session[]
  state: SessionsState
  errorMessage: string | null
  /** Re-issues the list request without a page reload. */
  reload: () => void
  /** Creates a session, appends it on success, and re-throws on failure. */
  create: (input: CreateSessionInput) => Promise<Session>
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([])
  const [state, setState] = useState<SessionsState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    // Aborting on cleanup means StrictMode's double-invoke cannot land a stale
    // response, and a retry cannot be overtaken by the request it replaced.
    const controller = new AbortController()

    listSessions(controller.signal).then(
      (loaded) => {
        if (controller.signal.aborted) {
          return
        }
        setSessions(loaded)
        setState('ready')
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setErrorMessage(error instanceof ApiError ? error.message : FALLBACK_ERROR)
        setState('error')
      },
    )

    return () => {
      controller.abort()
    }
  }, [reloadToken])

  // The loading reset lives here rather than in the effect: it is caused by the
  // retry event, and the mount case is already covered by the initial state.
  const reload = useCallback(() => {
    setState('loading')
    setErrorMessage(null)
    setReloadToken((token) => token + 1)
  }, [])

  const create = useCallback(async (input: CreateSessionInput) => {
    // No pending flag here: the form owns its own submit state.
    const created = await createSession(input)
    setSessions((current) => [...current, created])
    return created
  }, [])

  return { sessions, state, errorMessage, reload, create }
}
