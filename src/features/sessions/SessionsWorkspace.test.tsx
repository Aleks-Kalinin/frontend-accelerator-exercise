import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import App from '../../App.tsx'
import { server } from '../../mocks/node.ts'
import { toLocalInputValue } from './datetime.ts'

const SESSIONS_PATH = '/api/sessions'

/** Makes every list request fail for the rest of the test. */
function failTheListRequest(options?: { once?: boolean }) {
  server.use(
    http.get(SESSIONS_PATH, () => new HttpResponse(null, { status: 500 }), {
      once: options?.once ?? false,
    }),
  )
}

/**
 * Opens the create form, fills it with a valid title and a start time one day
 * from now, and submits.
 *
 * The date is derived from the clock, so the suite cannot rot. `user-event`'s
 * `type()` does not reliably drive a segmented `datetime-local` control in
 * jsdom, so this one field is set with a change event; every other interaction
 * stays on `user-event`.
 */
async function submitNewSession(user: UserEvent, title: string) {
  await user.click(screen.getByRole('button', { name: /new session/i }))
  await user.type(screen.getByLabelText(/title/i), title)

  const tomorrow = toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  fireEvent.change(screen.getByLabelText(/start date and time/i), {
    target: { value: tomorrow },
  })

  await user.click(screen.getByRole('button', { name: /create session/i }))
}

/**
 * The main flow, end to end: the real component tree, the real API client, and
 * the real `fetch` against the MSW handlers. Nothing is stubbed.
 */
describe('sessions workspace', () => {
  it('creating a session adds it to the visible list', async () => {
    const user = userEvent.setup()
    render(<App />)

    // The MSW-backed load has completed once a seeded session is on screen.
    await screen.findByText('React Fundamentals')

    await submitNewSession(user, 'Advanced TypeScript Workshop')

    expect(
      await screen.findByText('Advanced TypeScript Workshop'),
    ).toBeDefined()
    expect(screen.queryByLabelText(/title/i)).toBeNull()
  })

  it('the status filter narrows the list and All restores it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('React Fundamentals')
    const filter = screen.getByLabelText(/status/i)

    await user.selectOptions(filter, 'completed')
    expect(screen.getByText('Accessibility Workshop')).toBeDefined()
    expect(screen.queryByText('React Fundamentals')).toBeNull()

    // The seed deliberately contains no cancelled session, so this is the
    // reachable "nothing matches" case.
    await user.selectOptions(filter, 'cancelled')
    expect(screen.getByText(/no sessions match this filter/i)).toBeDefined()

    await user.selectOptions(filter, 'all')
    expect(screen.getByText('React Fundamentals')).toBeDefined()
    expect(screen.getByText('Accessibility Workshop')).toBeDefined()
  })

  it('a session created while the list is in the error state is still shown', async () => {
    const user = userEvent.setup()
    failTheListRequest()
    render(<App />)

    await screen.findByRole('button', { name: /try again/i })

    await submitNewSession(user, 'Created While Offline')

    expect(await screen.findByText('Created While Offline')).toBeDefined()
    // The list is still incomplete, so the failure and its retry stay on screen.
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined()
  })

  it('retrying after a failed list request recovers the list', async () => {
    const user = userEvent.setup()
    failTheListRequest({ once: true })
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /try again/i }))

    expect(await screen.findByText('React Fundamentals')).toBeDefined()
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })
})
