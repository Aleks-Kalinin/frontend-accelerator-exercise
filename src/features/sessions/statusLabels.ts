import type { SessionStatus } from '../../api/types.ts'

/** User-facing wording for each status, shared by the filter and the list. */
export const STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
