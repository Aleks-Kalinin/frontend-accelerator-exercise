import type { Session } from '../../api/types.ts'
import { formatSessionStart } from './datetime.ts'
import { STATUS_LABELS } from './statusLabels.ts'

interface SessionListProps {
  sessions: Session[]
}

/**
 * Renders the sessions it is given. It does not fetch and does not filter —
 * an empty array is a result to explain, not a blank area.
 */
export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="sessions-empty">No sessions match this filter.</p>
  }

  return (
    <ul className="session-list">
      {sessions.map((session) => (
        <li key={session.id} className="session-row">
          <span className="session-title">{session.title}</span>
          <span className={`session-status session-status--${session.status}`}>
            {STATUS_LABELS[session.status]}
          </span>
          <span className="session-start">
            {formatSessionStart(session.startsAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
