import { setupWorker } from 'msw/browser'
import { createSessionHandlers } from './handlers.ts'

/** Dev-browser transport. A visible delay makes loading states observable. */
export const worker = setupWorker(...createSessionHandlers({ delayMs: 400 }))
