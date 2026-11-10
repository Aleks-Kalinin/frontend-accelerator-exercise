# Implementation Plan — Training Sessions Workspace

Task: `training-sessions`
Role: `writing-plans`
Source of truth: `tasks/training-sessions/requirements.md` (revision 2026-11-10), `tasks/TASK.md`
Application root: repository root — `D:\Work\Internal\frontend-accelerator-exercise` (single frontend candidate: one `package.json`, one `src/`, one `vite.config.ts`)
Status: **Actionable.** No specialist decision is missing. The three open questions (Q-1, Q-2, Q-3) are product/setup choices the requirements permit the implementer to settle; this plan settles them explicitly in section 2 so the implementer does not re-open them.

Scope rule for this plan: nothing outside FR-1…FR-12, AC-1…AC-26, section 8 (API contract), section 9 (test stack), section 10 (mock). No routing, no state library, no HTTP client, no design system, no CI.

---

## 1. Current behavior → intended behavior

**Current.** `src/main.tsx` mounts `src/App.tsx`, which is the unmodified Vite starter: a hero image, a counter button, and two link panels. `src/App.css` and `src/index.css` style that starter. There is no `src/api`, no `src/features`, no test runner, no test script, and no HTTP mock. `npm run build` (`tsc -b && vite build`) and `npm run lint` (oxlint) pass against the starter.

**Intended.** The app renders a single Training Sessions workspace: a status filter, a session list fed by `GET /api/sessions` through a typed client module, and a create form posting to `POST /api/sessions`. MSW intercepts both calls in the dev browser and in the Vitest/jsdom run from one handler module over one in-memory store. `npm test` runs one behavior-level test that drives creation through the real client against MSW. `npm run lint` and `npm run build` still pass, now including the new source and test files.

---

## 2. Decisions this plan fixes (closing Q-1, Q-2, Q-3)

| Ref | Decision | Rationale |
| --- | --- | --- |
| **Q-1** | After a successful create, the workspace **resets the filter to `All`**. | Satisfies A-3 with the least surprise: the user always sees the result of their action. One line of state reset; no cross-component coordination. |
| **Q-2** | `SessionStatus = 'scheduled' \| 'completed' \| 'cancelled'` (A-1). The filter offers `All` plus **all three** values from one exported `SESSION_STATUSES` array. | A `<select>` renders all three at the same cost as one, and the seed data already spans more than one status. The requirement floor (`All` + at least one) is exceeded at no extra complexity. |
| **Q-3** | **Do not add `@testing-library/jest-dom`.** Use plain Vitest `expect` plus Testing Library's throwing queries. | It is the only choice that leaves `tsconfig.app.json`'s `types: ["vite/client"]` untouched, so AC-26 is satisfied without a config change (B6). `getBy*`/`findBy*` already assert presence by throwing; absence is `expect(screen.queryBy…()).toBeNull()`. |
| **Test placement** | Test files live **under `src/`, colocated** with the feature; the Vitest setup file lives at `src/test/setup.ts`. Both are type-checked by `tsconfig.app.json` as-is. | B6's alternative (a separate tsconfig project) adds a third config file and a `tsconfig.json` reference for one test. Colocation with explicit `import { … } from 'vitest'` (R-T4) needs no config edit. `skipLibCheck: true` absorbs node-typed declarations reachable from `msw/node`. |
| **Vitest config location** | Inside the existing `vite.config.ts`, switching its import to `defineConfig` from `vitest/config`. | R-T1 is satisfied and the React plugin automatically applies to tests. A sibling `vitest.config.ts` would duplicate the plugin list and need adding to `tsconfig.node.json`'s `include`. |
| **Mock latency** | `handlers.ts` exports a **factory** `createSessionHandlers({ delayMs })`; `mocks/browser.ts` passes ~400 ms, `mocks/node.ts` passes `0`. | A-8 asks for a delay difference between environments without a logic difference. A factory keeps one handler definition (R-M1) and avoids reading `import.meta.env` inside a module that also runs in node. |

---

## 3. Data / mock boundary

Four layers, with dependency direction strictly downward. **No arrow ever points from UI into `src/mocks/`** (R-M11, AC-16).

```
src/features/sessions/*        UI + feature state      → imports src/api/* only
        │
src/api/sessions.ts            request boundary (FR-9) → owns URLs, fetch, parsing, error normalization
src/api/types.ts               contract shapes (§8.2)  ← also imported by src/mocks/*
        │
        │  real network calls (fetch, relative /api/sessions)
        ▼
src/mocks/handlers.ts          transport-level mock (§10) → reads/writes src/mocks/store.ts
src/mocks/browser.ts  (DEV browser only, dynamic import from main.tsx)
src/mocks/node.ts     (Vitest, started from src/test/setup.ts)
```

- The UI never sees a URL, a `fetch`, a `Response`, an HTTP status, or mock data.
- `src/api/sessions.ts` is the only module that calls `fetch`. It throws `ApiError` (a user-presentable `message`) for any non-2xx, network, or parse failure (§8.4).
- `src/mocks/*` imports types from `src/api/types.ts` so the mock cannot drift from the contract; the dependency is mock → api, never the reverse.
- Swapping the mock for a real backend means deleting the `enableMocking()` call in `main.tsx` and the `src/mocks/` directory. No UI or client file changes.

---

## 4. Files to create

### 4.1 Contract and request boundary

**`src/api/types.ts`** — pure types, no runtime beyond one const array.

```ts
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'
export const SESSION_STATUSES: readonly SessionStatus[]       // ['scheduled','completed','cancelled']
export interface Session { id: string; title: string; status: SessionStatus; startsAt: string }
export interface CreateSessionInput { title: string; startsAt: string }   // trimmed title, ISO startsAt
```

`erasableSyntaxOnly` forbids a TS enum (B6) — the union plus const array is the replacement. Consumers use `import type` for the types (`verbatimModuleSyntax`). Match the existing import convention in `src/main.tsx`, which writes explicit file extensions (`./App.tsx`).

**`src/api/sessions.ts`** — the single request boundary (FR-9, AC-16, §8.3).

```ts
export class ApiError extends Error {}                         // message is user-presentable
export function listSessions(signal?: AbortSignal): Promise<Session[]>
export function createSession(input: CreateSessionInput): Promise<Session>
```

- Base path constant `'/api/sessions'`, relative (§8.1) so MSW intercepts identically in the browser and in jsdom.
- `POST` sends `Content-Type: application/json` with `{ title, startsAt }`.
- One private helper normalizes the response: on `!response.ok` it tries to read `{ message }` from the body and throws `ApiError` with that message, falling back to a generic sentence; a thrown `fetch` or a JSON parse failure becomes `ApiError` with a generic connection message. No `status` ever escapes this module.
- `createSession` returns the parsed `201` body — the client never reconstructs the session locally (§8.3).
- Declare `ApiError` with an explicit constructor that assigns `this.name`; do **not** use parameter properties (`erasableSyntaxOnly`).

### 4.2 Mock transport

**`src/mocks/store.ts`** — in-memory state (R-M2, AC-20) and the only place seed data exists.

```ts
export function listAll(): Session[]
export function add(input: CreateSessionInput): Session       // assigns id + status 'scheduled' (A-2)
export function resetStore(): void                            // re-seeds; called between tests
```

- Seed: 4–5 sessions spanning at least two statuses, with **every date derived from `Date.now()`** (A-6, B4) — for example `+2 days`, `+9 days`, `-3 days`, `-10 days`. No literal dates anywhere.
- `id` from `crypto.randomUUID()` (available in both jsdom and the browser) or a module counter.
- `resetStore()` exists so `afterEach` isolation is real; without it a created session leaks into the next test.

**`src/mocks/handlers.ts`** — the single handler definition (R-M1), MSW v2 API.

```ts
export function createSessionHandlers(options?: { delayMs?: number }): RequestHandler[]
```

- `http.get('/api/sessions', …)` → `delay(delayMs)` then `HttpResponse.json(listAll())` (§8.3).
- `http.post('/api/sessions', …)` → read the body, mirror the FR-6 rules server-side (trimmed length 3–80, `startsAt` parseable and in the future) → `400 { message }` on violation, otherwise `delay(delayMs)` and `HttpResponse.json(created, { status: 201 })`. The `400` branch is unreachable from the UI but keeps the contract honest (§8.3).
- Handlers must not import anything from `src/features/` or from `src/api/sessions.ts` — types only.

**`src/mocks/browser.ts`**

```ts
export const worker = setupWorker(...createSessionHandlers({ delayMs: 400 }))
```

**`src/mocks/node.ts`**

```ts
export const server = setupServer(...createSessionHandlers({ delayMs: 0 }))
```

Keep these two files to one statement each; all behavior lives in `handlers.ts`.

**`public/mockServiceWorker.js`** — generated, not hand-written: `npx msw init public/ --save` (R-M4, B8). It must be **committed** (`public/` is not gitignored; confirm with `git status` after generating) and regenerated on any MSW upgrade.

### 4.3 Test harness

**`src/test/setup.ts`** (R-T3, R-M8, R-M10) — explicit imports from `vitest`, no globals:

```ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => { cleanup(); server.resetHandlers(); resetStore() })
afterAll(() => server.close())
```

`cleanup` from `@testing-library/react` is called explicitly because `globals: false` disables RTL's automatic cleanup.

### 4.4 Feature: state and pure helpers

**`src/features/sessions/useSessions.ts`** — the single owner of remote list state (FR-1, FR-2, FR-3, FR-8).

```ts
type SessionsState = 'loading' | 'ready' | 'error'
export function useSessions(): {
  sessions: Session[]
  state: SessionsState
  errorMessage: string | null
  reload: () => void                                        // FR-3 / AC-4 retry
  create: (input: CreateSessionInput) => Promise<Session>   // appends on success (FR-8)
}
```

- Loads on mount via `useEffect` with an `AbortController` cleanup, so StrictMode's double-invoke cannot land a stale response.
- `state` is one discriminating value, not three booleans — loading, ready, and error are mutually exclusive (AC-2 requires loading visible with no error).
- `create` calls `createSession`, appends the returned `Session` to state, and **re-throws** on failure so the form can show its own error and preserve input (AC-15). The hook does not own the create's pending flag.
- The empty-list case is derived (`state === 'ready' && sessions.length === 0`), never stored.

**`src/features/sessions/validation.ts`** — pure, no React (FR-6, AC-9…AC-11).

```ts
export interface SessionFormErrors { title?: string; startsAt?: string }
export function validateSessionForm(values: { title: string; startsAt: string }, now: Date): SessionFormErrors
```

- Title: trim first; empty/whitespace-only and `<3` share the "at least 3 characters" message; `>80` gets its own message. Messages name the field and the rule — never "invalid form".
- `startsAt`: empty → required message; unparseable → format message; `<= now` → "must be in the future".
- `now` is a parameter, not `new Date()` read inside, so the rule is testable and B4-safe. The caller passes `new Date()` **at submit time** (A-5).
- An empty object means valid; the form submits only when there are no keys (AC-9…AC-11: no request is sent).

**`src/features/sessions/datetime.ts`** — pure date adapters (A-4).

```ts
export function toIso(localInputValue: string): string           // 'YYYY-MM-DDTHH:mm' → ISO 8601
export function toLocalInputValue(date: Date): string            // inverse; used by the test (B4)
export function formatSessionStart(isoString: string): string    // human-readable (FR-1)
```

`formatSessionStart` uses `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })` — browser default locale, since localization is out of scope. The test must not assert on its output, which keeps AC-24 free of locale and clock dependence.

### 4.5 Feature: components

| File | Responsibility | Must not |
| --- | --- | --- |
| **`SessionsWorkspace.tsx`** | Composition root of the feature. Calls `useSessions()`. Owns the two pieces of local UI state: the active filter (`SessionStatus \| 'all'`) and whether the create form is open (FR-5, A-7). Derives the filtered list inline from `sessions` + filter (FR-4 — client-side, no refetch, no duplicated state). Renders `<StatusFilter>`, the create control / `<CreateSessionForm>`, and the loading / error+retry / empty / list branches. On successful create: closes the form and resets the filter to `'all'` (Q-1 decision). | call `fetch`, import `src/mocks/*`, or re-request on filter change |
| **`StatusFilter.tsx`** | A labelled `<select>` ("Status") with an `All` option plus one `<option>` per `SESSION_STATUSES` entry; fully controlled by `value` + `onChange` props (FR-4: single-select, active selection visible, AC-6). | own filter state or know about sessions |
| **`SessionList.tsx`** | Renders the given `Session[]` as a `<ul>` of rows showing title, status, and `formatSessionStart(startsAt)` (FR-1, AC-1), keyed by `id`. Renders the filter-empty message when the array is empty (AC-7). | fetch, filter, or format dates beyond calling the helper |
| **`CreateSessionForm.tsx`** | Owns title/`startsAt` field state, `errors` from `validateSessionForm`, `isSubmitting`, and `submitError`. On submit: validate against `new Date()`; if invalid, render field-specific messages and **return without calling `onSubmit`** (AC-9…AC-11). If valid, set `isSubmitting`, `await props.onSubmit({ title: title.trim(), startsAt: toIso(startsAt) })`; on rejection show `submitError` and keep the entered values (AC-15); always clear `isSubmitting` in a `finally`. The submit button is `disabled` while submitting and shows the pending state in its label (FR-7, AC-13). | import the API client or MSW, reset the parent's list, or know about the filter |

Accessibility floor (A-9, required by AC-22): every input has a real `<label htmlFor>`, the filter has a label, the error region is readable text, and the retry control is a `<button>`. Field error messages are associated with their input via `aria-describedby` so the accessible name/description path is testable.

Props contracts, fixed here so steps 4 and 5 can proceed in parallel:

```ts
StatusFilter:      { value: SessionStatus | 'all'; onChange: (next: SessionStatus | 'all') => void }
SessionList:       { sessions: Session[] }
CreateSessionForm: { onSubmit: (input: CreateSessionInput) => Promise<unknown>; onSuccess: () => void; onCancel: () => void }
```

### 4.6 The one behavior-level test

**`src/features/sessions/SessionsWorkspace.test.tsx`** — exactly one test (FR-11, R-T8…R-T12, AC-22, AC-23).

Name: `creating a session adds it to the visible list`.

Steps:

1. `render(<App />)` — through the real component tree, with nothing stubbed (AC-23, R-T11).
2. `await screen.findByText(<a seeded session title>)` — proves the MSW-backed load completed (R-T10; no fixed `setTimeout`).
3. `await user.click(screen.getByRole('button', { name: /new session/i }))` (AC-8).
4. `await user.type(screen.getByLabelText(/title/i), 'Advanced TypeScript Workshop')`.
5. Fill the start field with `toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000))` — relative to the clock, so the suite cannot rot (B4, AC-24, R-T12).
6. `await user.click(screen.getByRole('button', { name: /create session/i }))`.
7. `expect(await screen.findByText('Advanced TypeScript Workshop')).toBeDefined()` and `expect(screen.queryByLabelText(/title/i)).toBeNull()` — the session is visible and the form is dismissed (AC-14).

Queries are role/label/text only — no `data-testid`, no CSS class, no component internals (AC-22). `describe`/`it`/`expect` are imported explicitly from `vitest` (R-T4).

**Known friction, to resolve while implementing rather than design around in advance:** `user-event`'s `type()` on a native `datetime-local` input can be rejected in jsdom because the control is segmented. If `user.type` fails to set the value, fall back to `fireEvent.change(input, { target: { value } })` for that one field and keep every other interaction on `user-event`. R-T9's intent — accessible queries, realistic interaction — is preserved; note the fallback in a code comment if used.

---

## 5. Files to modify

| File | Change | Why |
| --- | --- | --- |
| **`package.json`** | Add devDependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `msw`. Add `"test": "vitest run"` (R-T6, AC-21); optionally `"test:watch": "vitest"` (R-T7). Leave `dev`, `build`, `lint`, `preview` untouched. | D-1, D-3, §9.1, §9.3 |
| **`vite.config.ts`** | Import `defineConfig` from `vitest/config` instead of `vite`; add `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: false, css: false }`. Keep `plugins: [react()]` unchanged. | R-T1, R-T2, R-T3, R-T4 |
| **`src/main.tsx`** | Wrap the render in an async `enableMocking()` that returns early unless `import.meta.env.DEV`, then `await import('./mocks/browser.ts')` and `await worker.start({ onUnhandledRequest: 'warn' })`; render only after it resolves. | R-M5 (dev-only and dynamic, so MSW stays out of the production bundle), R-M6 (started before first render), R-M7 / A-11 (unmocked requests stay visible) |
| **`src/App.tsx`** | Replace the entire starter body (counter, hero, link panels) with the app shell: an `<h1>` and a `<main>` wrapping `<SessionsWorkspace />`. Keep the `import './App.css'` line and the default export. | B7 — the starter is exactly what is being replaced; FR-1…FR-8 need the surface |
| **`src/App.css`** | Replace the starter rules (`.counter`, `.hero`, `#next-steps`, `#social`, `#docs`, tick decorations) with workspace styles: list rows, status pill, filter row, form layout, loading/error text. Reuse the existing `--text`, `--border`, `--accent`, `--accent-bg`, `--shadow` custom properties from `index.css` rather than inventing colors. | B7, B9; preserves the file's existing token-based convention |
| **`src/index.css`** | Touch only if the layout requires it: `#root` currently sets `width: 1126px` and `text-align: center`, which fight a left-aligned list and form. Prefer overriding inside `App.css`; if `index.css` must change, change those two declarations and nothing else. | B7 ("touched only as far as the new UI requires") |
| **`index.html`** | Optional one-line change: `<title>viteapp</title>` → `<title>Training Sessions</title>`. | Cosmetic; not required by any acceptance criterion |
| **`tasks/training-sessions/workflow-log.md`** | After implementation: add the role row, and fill the **Manual Browser Observation** section with the real command, the discovered URL, the flow exercised, and what was actually observed. | FR-12 — record observations; never claim an unperformed check |

**Optional deletion:** `src/assets/hero.png`, `src/assets/react.svg`, and `src/assets/vite.svg` become unreferenced once `App.tsx` is rewritten, and `src/assets/` may then be removed entirely. This is cleanup of the replaced starter, not unrelated refactoring. Leave `public/favicon.svg` (referenced by `index.html`) and `public/icons.svg` alone.

---

## 6. Ordered steps

Steps 0–3 are strictly sequential. Steps 4 and 5 may proceed independently once step 2 lands. Step 6 depends on 3, 4, and 5.

**Step 0 — Toolchain (blocking for everything).**
Install the six devDependencies in one `npm install -D` so npm resolves a single consistent tree. **Resolve versions at install time; do not pin from memory (B5):** the Vitest major must be the one that peers with Vite 8 — check `npm ls vite` afterwards, since a second Vite in the tree means the wrong Vitest major — and `@testing-library/react` must be the React 19 release. Treat unresolved peer warnings as findings, not noise. Then run `npx msw init public/ --save` and confirm `public/mockServiceWorker.js` shows up as a new untracked file rather than being ignored. Add the `test` script and the `vite.config.ts` test block.
*Done when:* `npm test` runs and reports "no test files found" rather than a configuration error, and `npm run build` still passes.

**Step 1 — Contract and client.** `src/api/types.ts`, then `src/api/sessions.ts`.
*Contract published to later steps:* the `Session` shape, `CreateSessionInput`, `SESSION_STATUSES`, `ApiError`, and the two function signatures. Nothing downstream may re-declare these.

**Step 2 — Mock transport.** `src/mocks/store.ts` → `src/mocks/handlers.ts` → `src/mocks/browser.ts` and `src/mocks/node.ts` → wire `enableMocking()` into `src/main.tsx`.
*Done when:* `npm run dev` is running, the app is open, and the browser shows `GET /api/sessions` served by the worker (MSW logs the interception to the console). B8's asymmetric-failure trap — tests green but the browser silently unmocked, or the reverse — is only avoided by checking this path **now**, before the test path exists.

**Step 3 — Test harness.** `src/test/setup.ts`. Depends on `src/mocks/node.ts` and `src/mocks/store.ts`.
*Done when:* a throwaway smoke assertion runs green under `npm test`. Delete it before the real test lands.

**Step 4 — Feature state and helpers** (parallel with step 5). `datetime.ts`, `validation.ts`, `useSessions.ts`. Depends on step 1 only.

**Step 5 — UI** (parallel with step 4, converging at `SessionsWorkspace.tsx`). `StatusFilter.tsx`, `SessionList.tsx`, `CreateSessionForm.tsx`, `SessionsWorkspace.tsx`, `App.tsx`, `App.css`.
Both steps consume the props contracts in §4.5 and the hook signature in §4.4, so either side can be written against those signatures before the other compiles.

**Step 6 — The essential test.** `src/features/sessions/SessionsWorkspace.test.tsx`.

**Step 7 — Verify and record.** Section 7's commands, then the manual browser pass (FR-12) and the workflow-log entry.

---

## 7. Verification

Existing commands, discovered from `package.json` at the application root:

```
npm run lint      # oxlint                  → AC-25: no new errors
npm run build     # tsc -b && vite build    → AC-26: type-checks src/ incl. tests, then builds
npm run dev       # vite dev server         → FR-12 manual check; use the URL Vite prints
npm run preview   # production preview
```

Added by this work (R-T6):

```
npm test          # vitest run → AC-21: one non-interactive run, non-zero exit on failure
```

`npm install` is a prerequisite of all of them on a clean checkout (AC-24). No command above is invented, and none is run by this role.

**Checks no command covers — do these by hand:**

- **Production bundle is mock-free (R-M5).** After `npm run build`: `grep -ril "msw\|mockServiceWorker" dist/assets/ || echo clean`.
- **Both mock paths work (B8).** The browser path is verified in step 2; the node path is verified by step 6 passing. A green test with a silently unmocked browser — or the reverse — is the specific failure this guards against.
- **Manual flow (FR-12).** Start `npm run dev`, use the URL Vite actually prints (do not assume a port), and exercise list → filter → create once. Record the real command, URL, and observations in `tasks/training-sessions/workflow-log.md`. Reproducing the error state by hand requires temporarily breaking a handler and is optional (A-10); the error path is proven automatically only if the section 8 tests below are added, so if they are not, say so in the log rather than implying the error state was verified.

---

## 8. Test coverage beyond the essential test (not in this scope)

FR-11 requires one test and this plan delivers one. The following are the highest-value additions for a later `test-generator` pass, listed so the gap stays visible. **Do not implement them now.**

| Candidate | Covers | Mechanism |
| --- | --- | --- |
| Filter narrows the list, then `All` restores it | AC-5, AC-6 | select interaction over seeded mixed statuses |
| Filter matching nothing shows the empty message | AC-7 | filter to a status absent from the seed |
| List `500` → error + retry → success | AC-3, AC-4, AC-19 | `server.use()` one-shot failing handler (R-M9) |
| Create `500` preserves input and allows retry | AC-15, AC-19 | `server.use()` override on the POST |
| Validation blocks submission and sends no request | AC-9…AC-11 | `onUnhandledRequest: 'error'` plus a request spy |
| A second submit while pending issues no second request | AC-12, AC-13 | request counter on the POST handler |
| A created session survives the next `GET` | AC-20 | create, then remount and assert presence |

---

## 9. Rollback

No feature flag or staged rollout is warranted: the work is additive on a branch, there is no backend, no persistence, and no deployed surface. The only production-facing risk is MSW leaking into the build; the `import.meta.env.DEV` guard plus the dynamic import (R-M5) is the mitigation, checked by the `dist/` grep in section 7. Reverting the branch restores the starter.

---

## 10. Assumptions carried into implementation

Flag in review if any is wrong; none blocks the work.

- A-1 / A-2 — status vocabulary, and `scheduled` assigned on create (fixed in §2).
- A-3 — a successful create resets the filter to `All` (fixed in §2 as the Q-1 answer).
- A-4 / A-5 — native `datetime-local`, converted to ISO on send; "future" evaluated at submit time.
- A-6 — seed dates derived from `Date.now()`.
- A-7 — no router; the create form lives in the same view.
- A-8 — ~400 ms mock delay in the browser, 0 in tests, via the handler factory.
- A-9 — labelled controls as the accessibility floor.
- A-11 — MSW covers `/api/sessions` only; anything else surfaces through `onUnhandledRequest`.
- B9 — no visual direction exists; styling reuses the existing CSS custom properties and stays plain. If visual consistency later matters, that is `ui-designer`'s call and not a reason to delay this.

---

No production code, dependencies, configuration, rulesets, or living specifications were modified by this role.
