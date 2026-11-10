import { SESSION_STATUSES } from '../../api/types.ts'
import type { SessionStatus } from '../../api/types.ts'
import { STATUS_LABELS } from './statusLabels.ts'

export type StatusFilterValue = SessionStatus | 'all'

interface StatusFilterProps {
  value: StatusFilterValue
  onChange: (next: StatusFilterValue) => void
}

/**
 * Single-select status filter. Fully controlled — it owns no state and knows
 * nothing about sessions.
 */
export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="status-filter">
      <label htmlFor="session-status-filter">Status</label>
      <select
        id="session-status-filter"
        name="status"
        value={value}
        onChange={(event) => {
          onChange(event.target.value as StatusFilterValue)
        }}
      >
        <option value="all">All</option>
        {SESSION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  )
}
