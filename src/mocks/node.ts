import { setupServer } from 'msw/node'
import { createSessionHandlers } from './handlers.ts'

/** Test transport. No delay, so the suite stays fast. */
export const server = setupServer(...createSessionHandlers({ delayMs: 0 }))
