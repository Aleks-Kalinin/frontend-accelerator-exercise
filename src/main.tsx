import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Starts the mock transport in development only. The dynamic import keeps MSW
 * out of the production bundle, and awaiting it means the first list request
 * is never missed.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import('./mocks/browser.ts')
  // `warn` rather than `bypass`: an unmocked call stays visible in the console
  // instead of silently hitting the network.
  await worker.start({ onUnhandledFrame: 'warn' })
}

function renderApp(): void {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

enableMocking()
  .catch((error: unknown) => {
    // A failed service-worker registration must not cost the whole page. Log it
    // and render anyway, so a broken mock degrades to the app's own error state
    // instead of a blank screen with only an unhandled rejection to go on.
    console.error('Mock transport failed to start; rendering without it.', error)
  })
  .then(renderApp)
