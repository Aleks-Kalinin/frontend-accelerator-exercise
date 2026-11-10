import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../mocks/node.ts'
import { resetStore } from '../mocks/store.ts'

// `error` rather than `warn`: a request that bypasses the contract fails the
// test instead of quietly reaching the real network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  // Called explicitly because `globals: false` disables Testing Library's
  // automatic cleanup.
  cleanup()
  server.resetHandlers()
  resetStore()
})

afterAll(() => {
  server.close()
})
