# Requirements — Training Sessions Workspace

Task: `training-sessions`
Source: `tasks/TASK.md`
Application root: repository root (`D:\Work\Internal\frontend-accelerator-exercise`) — the only frontend candidate.
Author role: `requirements-analyst`
Status: **Ready for planning.** The two previously blocking decisions (test stack, mock mechanism) are now settled by the developer — see section 2A. Three product/setup questions remain, none blocking.

Revision: 2026-11-10 — added the developer-confirmed test-runner decision (section 9), the mock-mechanism decision (section 10), and a provisional API contract (section 8). Former blockers B1 and B2 are closed.

---

## 1. Goal

A trainer can open a workspace, see the training sessions that exist, narrow the list to a single status, and add a new session through a validated form, with the new session appearing in the list without a page reload.

- **Primary user:** a trainer managing their own training sessions.
- **Problem:** there is no view of existing sessions and no way to add one.
- **Outcome:** list, filter, and create work end to end against a replaceable mock request boundary.

This is an onboarding exercise. Scope is deliberately minimal; anything not listed in sections 3, 8, 9, and 10 is out of scope.

---

## 2. Verified context (facts)

Read from the repository, not assumed.

| Fact | Evidence |
| --- | --- |
| React 19.3 + TypeScript ~7.0 + Vite 8, npm as package manager | `package.json` |
| Available scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (oxlint), `preview` | `package.json` |
| **No test runner, no assertion library, no DOM test environment installed**; no `test` script | `package.json`, `node_modules` scan |
| **No HTTP mock mechanism exists** (no MSW, no fetch wrapper, no handlers) | `node_modules` scan, `grep` over `src/` |
| No router, no state-management library, no HTTP client installed | `package.json` |
| `src/App.tsx` is still the unmodified Vite starter template; `src/` holds only `main.tsx`, `App.tsx`, two CSS files, and `assets/` | `src/` listing |
| TS config enforces `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`; `types` is `["vite/client"]` only; `include` is `["src"]` | `tsconfig.app.json` |
| oxlint enforces `react/rules-of-hooks` (error) and `react/only-export-components` (warn) | `.oxlintrc.json` |
| No living specifications (`specs/`) and no populated project rules (`rulesets/project/`) exist | directory scan |
| Browser capability is not installed; `browser-verify` is unavailable, manual check is by hand | `tasks/training-sessions/workflow-log.md` |

### 2A. Confirmed decisions (developer authority)

These were open questions in the previous revision. They are now **decided** and are treated as requirements, not assumptions.

| ID | Decision | Detail |
| --- | --- | --- |
| **D-1** | **Test runner: the standard React/Vite combination — Vitest + React Testing Library**, running in a jsdom DOM environment. | Full specification in section 9. Replaces former blocker B1. |
| **D-2** | **Mock mechanism: MSW (Mock Service Worker), v2 API** — network-level interception shared by the dev browser and the test run. | Full specification in section 10. Replaces former blocker B2. |
| **D-3** | Adding the dev dependencies required by D-1 and D-2, plus the `test` script and test configuration, is **approved**. | Installation belongs to the implementation stage, not this role. |

---

## 3. Functional requirements

### FR-1 — Load and display sessions

- The workspace loads the session list from the mock API through the request boundary (section 10) on first render.
- Each session row shows at minimum: **title**, **status**, **start date and time**.
- The start date/time is rendered in a human-readable form, not as a raw ISO string.

### FR-2 — Loading state

- While the list request is pending, a loading indication is shown in place of (or alongside) the list.
- The loading state is distinguishable from the empty state.

### FR-3 — Recoverable error state

- If the list request fails, one understandable error message is shown.
- The error state offers a recovery affordance (retry) that re-issues the request without a page reload.

### FR-4 — Status filter

- A filter control offers an `All` option plus at least one concrete status value.
- Selecting `All` shows every session; selecting a status shows only sessions with that status.
- The active filter selection is visible to the user.
- Only one status may be active at a time (no multi-select).
- Filtering is applied **client-side** over the already-loaded list; it does not re-issue a request (section 8.5).

### FR-5 — Open the create form

- The create form is reachable from the workspace through a visible control.
- The form may be inline, a panel, or a separate view — deep-linking to it is explicitly out of scope (section 5), so no routing is required by these requirements.

### FR-6 — Create-form validation

- **Title:** required; validated after trimming; between 3 and 80 characters inclusive.
- **Start date/time:** required; strictly in the future relative to the moment of validation.
- Invalid input produces a specific, human-readable message identifying what is wrong — not a generic "invalid form".
- Submission is blocked while any field is invalid; no request reaches the API boundary.

### FR-7 — Duplicate-submission protection

- While a create request is pending, the submit control cannot trigger a second request (disabled, or an equivalent guard).
- The pending state is visible to the user.

### FR-8 — Successful creation

- On success the created session appears in the visible list without a full page reload.
- The create form is dismissed or reset after success.

### FR-9 — Request boundary

- All session reads and writes go through a **single typed API-client module** (for example `src/api/sessions.ts`) that owns URLs, the `fetch` call, response parsing, and error normalization.
- UI components call that module. No component contains a URL, a direct `fetch`, or mock data.
- The module is written against the HTTP contract in section 8, so swapping the mock for a real backend requires no UI change.
- No backend service is implemented.

### FR-10 — Mock transport

- The mock is implemented with **MSW** per section 10 and intercepts the same `fetch` calls the production client makes.
- The same handler definitions serve the dev browser and the automated test run.

### FR-11 — Essential automated test

- At least one behavior-level automated test covers the main flow — filtering or successful creation — asserting on user-visible behavior rather than internal implementation detail.
- The test runs under the stack in section 9 via a repeatable `npm` script.

### FR-12 — Manual verification

- The application is started and list → filter → create is exercised once in a real browser.
- What was actually observed is recorded in `tasks/training-sessions/workflow-log.md`.
- Screenshots and the `browser-verify` role are optional (and currently unavailable — see B3).

---

## 4. Acceptance criteria

Each criterion is independently verifiable.

**List**

- **AC-1** Given the mock API returns sessions, when the workspace opens, then each returned session is displayed with its title, status, and start date/time.
- **AC-2** Given the list request is pending, when the workspace opens, then a loading indication is visible and no error is shown.
- **AC-3** Given the list request fails, then an error message and a retry control are visible.
- **AC-4** Given the error state is visible, when retry is activated and the request succeeds, then the sessions are displayed and the error message is gone.

**Filter**

- **AC-5** Given sessions with mixed statuses, when a specific status is selected, then only sessions with that status remain visible.
- **AC-6** Given a status filter is active, when `All` is selected, then every session is visible again.
- **AC-7** Given a status filter is active and no session matches it, then an empty-result message is shown instead of an unexplained blank area, and the filter control remains usable.

**Create**

- **AC-8** Given the workspace is open, when the create control is activated, then the create form becomes visible with empty title and date/time fields.
- **AC-9** Given a title of fewer than 3 characters after trimming (including a whitespace-only title), when submission is attempted, then a title-specific validation message is shown and no request is sent.
- **AC-10** Given a title longer than 80 characters after trimming, when submission is attempted, then a title-specific validation message is shown and no request is sent.
- **AC-11** Given a start date/time in the past or equal to the current moment, when submission is attempted, then a date-specific validation message is shown and no request is sent.
- **AC-12** Given a valid title and a future date/time, when the form is submitted, then exactly one `POST /api/sessions` request is issued.
- **AC-13** Given a create request is pending, when submit is activated again, then no second request is issued.
- **AC-14** Given the create request succeeds, then the new session is present in the list and the form is dismissed or cleared.
- **AC-15** Given the create request fails, then an understandable error is shown, the entered values are preserved, and submission can be retried.

**Boundary and API**

- **AC-16** All session reads and writes go through the single API-client module; no UI component contains mock data, a URL, or a direct inline `fetch` call.
- **AC-17** `GET /api/sessions` returns the shape defined in section 8, and every field the UI renders comes from that payload.
- **AC-18** `POST /api/sessions` with a valid body returns `201` and the created session, including a server-assigned `id` and `status`.
- **AC-19** A forced `500` from the list handler produces AC-3's error state, and a forced `500` from the create handler produces AC-15's error state. Both are reachable in the test suite by overriding the handler at runtime.
- **AC-20** A created session is returned by the next `GET /api/sessions` in the same browser session — the mock keeps in-memory state rather than replaying a static fixture.

**Test stack**

- **AC-21** `npm test` runs the suite once, non-interactively, and exits with a non-zero code when a test fails.
- **AC-22** At least one test renders the application through React Testing Library, drives it with `user-event`, and asserts using accessible queries (role, label, text) — not CSS classes, internal test IDs, or component internals.
- **AC-23** The test run uses the MSW handlers from section 10; no component, hook, API-client module, or `fetch` is stubbed or monkey-patched to make the test pass.
- **AC-24** The suite passes on a clean checkout after `npm install`, with no reliance on a running dev server, a pre-seeded browser, or a specific wall-clock date.

**Quality gates**

- **AC-25** `npm run lint` passes with no new errors.
- **AC-26** `npm run build` (which runs `tsc -b`) completes successfully, including type-checking any test files picked up by `tsconfig.app.json`'s `include`.

---

## 5. Non-goals (explicit)

Taken directly from `tasks/TASK.md` — these must **not** be built during onboarding:

- session details, drawers, or deep links;
- search, or more than one filter dimension;
- pagination;
- a complete API contract or scenario matrix;
- desktop/mobile screenshot sets;
- exhaustive responsive and accessibility validation;
- full test coverage;
- CI, deployment, or a public URL;
- strict TypeScript migration or unrelated refactoring.

Additionally derived:

- **No persistence across reloads.** Mock state is in-memory; a created session is expected to disappear on refresh. This is acceptable and should not be "fixed".
- **No authentication, permissions, or multi-user behavior.**
- **No localization.** Dates may be formatted with the browser default locale.
- **No editing or deleting sessions.**

Specific to the API and test decisions:

- **No OpenAPI/Swagger document, no Postman collection, no contract-test layer.** Section 8 is a provisional in-repo contract, deliberately smaller than a full API specification.
- **No server-side filtering, sorting, pagination, or search parameters.**
- **No coverage thresholds, no CI wiring, no reporters beyond the Vitest default.**
- **No end-to-end/browser-driver tests** (Playwright, Cypress). The required test is a component-level behavior test.
- **No MSW in the production build.** The browser worker starts in development only.

---

## 6. Assumptions

Safe to implement under, but **not** confirmed truth. Flag in review if wrong.

- **A-1 — Status vocabulary.** `tasks/TASK.md` never enumerates statuses. Assumed `scheduled | completed | cancelled`, declared once as a union string-literal type (`erasableSyntaxOnly` forbids a TS enum). The requirement is only that `All` plus at least one concrete status is filterable.
- **A-2 — Status of a newly created session.** The create form collects only title and date/time, so the mock assigns `scheduled`.
- **A-3 — Interaction between create and an active filter.** Assumed: after a successful create, the new session is visible to the user. If a non-matching filter is active, the implementation either resets the filter to `All` or otherwise surfaces the new item — it must not silently appear to do nothing. See Q-1.
- **A-4 — Date/time input.** Assumed a native `datetime-local` input, which yields local wall-clock time without an offset; the client converts it to an ISO 8601 string before sending (section 8.2).
- **A-5 — "Future" is evaluated at submit time**, against the current clock, not at page load.
- **A-6 — Seed data.** The mock starts with a handful of sessions spanning at least two statuses so the filter is demonstrable; seed dates are **computed relative to `Date.now()`**, never hard-coded, so they cannot rot (B4).
- **A-7 — Single workspace view.** No router is needed; the create form is shown within the same view.
- **A-8 — Artificial latency.** MSW handlers apply a short delay (roughly 300–600 ms) in the browser so loading and pending states are observable. In tests the delay is zero or minimal so the suite stays fast — a configuration difference between the browser and node setups, not a difference in handler logic.
- **A-9 — Accessibility floor.** No exhaustive a11y validation is required, but every form control has an associated label and the filter is a labelled control, because AC-22 requires addressing them by accessible name.
- **A-10 — Manual error-state check.** FR-3 and AC-15 are proven automatically by AC-19. Reproducing the error state by hand in the browser requires temporarily forcing a handler to fail and is **optional** for the manual check.
- **A-11 — Mock scope.** MSW intercepts only `/api/sessions`; `onUnhandledRequest` is configured so an unmocked call is visible rather than silently hitting the network.

---

## 7. Risks for the implementation stage

Former blockers **B1 (no test stack)** and **B2 (no mock mechanism)** are closed by D-1, D-2, and D-3.

### B3 — Browser capability unavailable (non-blocking)

`capability:browser` is not installed, so `browser-verify` cannot run. FR-12 is still satisfiable by starting the dev server and exercising the flow by hand. Screenshots are optional.

### B4 — Time-dependent logic makes tests fragile

"Future date" validation (FR-6) and seeded future sessions (A-6) depend on the wall clock. Mitigation: derive every seed date from `Date.now()`, and in tests either use fake timers with a fixed system time or compute the `datetime-local` input value relative to the current clock. AC-24 forbids a suite that passes only on a given date.

### B5 — Version matching across a very new toolchain

Vite 8, React 19.3, and TypeScript ~7.0 are recent. Vitest shares Vite's internals, so the installed Vitest major must be the one that peers with Vite 8 — an older Vitest pulls a second, conflicting Vite. Likewise `@testing-library/react` must be the release supporting React 19, and `@testing-library/dom` is a required peer. Resolve actual versions at install time rather than pinning from memory, and treat unresolved peer warnings as something to investigate, not noise.

### B6 — Strict compiler settings constrain code and tests

- `verbatimModuleSyntax` → type-only imports need `import type`.
- `erasableSyntaxOnly` → no enums, no parameter properties; use union string-literal types for `SessionStatus`.
- `noUnusedLocals` / `noUnusedParameters` → leftovers fail the build.
- `tsconfig.app.json` has `include: ["src"]` and `types: ["vite/client"]`. Test files placed under `src/` **are type-checked by `tsc -b`**, so either the Vitest/jest-dom types are added to `types` (or imported explicitly), or the tests live outside `src/` under their own tsconfig reference. Decide this deliberately — AC-26 depends on it.
- Prefer explicit `import { describe, it, expect } from 'vitest'` over `globals: true`; it avoids a `types` change and keeps the lint clean.

### B7 — `src/App.tsx` is still the Vite starter

The starter markup, counter, and hero/logo assets must be replaced by the workspace UI. "Do not rewrite unrelated code" does not protect the template, but `src/index.css` and `src/App.css` should be touched only as far as the new UI requires.

### B8 — MSW setup has moving parts beyond `npm install`

The browser worker needs a generated `public/mockServiceWorker.js` (`npx msw init public/`), which must be committed and kept in step with the installed MSW version. The worker must start **before** React renders and **only** in development. The node setup is a separate entry point with its own lifecycle hooks. A half-done setup fails asymmetrically — tests green but the browser silently unmocked, or the reverse. Verify both paths.

### B9 — Unspecified visual direction

No design or project UI rules exist. Layout, states, and component structure are undefined. Low risk at this scope; `ui-designer` owns it if consistency matters.

---

## 8. API contract (provisional)

Owner for confirmation: `api-integration`. Intentionally minimal — a full contract is an explicit non-goal. It exists so the client module (FR-9) and the mock (FR-10) are written against one shape.

### 8.1 Base

- Base path: `/api` — a **relative** URL, so MSW intercepts it in both the browser and jsdom with no host configuration and no CORS concerns.
- Transport: `fetch`, JSON request and response bodies, `Content-Type: application/json`.
- No authentication headers.

### 8.2 Resource

```ts
type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

interface Session {
  id: string;          // server-assigned, opaque, stable within a browser session
  title: string;       // trimmed, 3–80 characters
  status: SessionStatus;
  startsAt: string;    // ISO 8601 with offset or Z, e.g. "2026-12-01T09:30:00.000Z"
}
```

- `startsAt` is the single time field. The client converts the `datetime-local` value to an ISO string on send and formats it for display on receive (A-4).
- The UI renders nothing that is not in this shape (AC-17).

### 8.3 Operations

**`GET /api/sessions`** — list all sessions.

- Request: no query parameters. Filtering is client-side (FR-4).
- `200` → `Session[]` (a bare array; no envelope at this scope).
- `500` → `{ "message": string }` — drives FR-3.

**`POST /api/sessions`** — create one session.

- Request body: `{ "title": string, "startsAt": string }` — the trimmed title and the ISO string.
- `201` → the created `Session`. The server assigns `id` and `status` (`scheduled`, per A-2); the client uses the returned object rather than reconstructing it locally.
- `400` → `{ "message": string }` — server-side mirror of the FR-6 rules. Client-side validation makes this unreachable in normal use; the handler still enforces it so the contract is honest.
- `500` → `{ "message": string }` — drives AC-15.

### 8.4 Error handling at the boundary

- Any non-2xx response, and any network or parse failure, is normalized by the API-client module into one error type carrying a user-presentable message.
- UI components branch on that normalized error, never on `response.status` or a raw `fetch` rejection.

### 8.5 Explicitly not in the contract

No `?status=` filter, no pagination or sorting parameters, no `PATCH`/`PUT`/`DELETE`, no single-session `GET /api/sessions/:id`, no response envelope or metadata, no OpenAPI document.

---

## 9. Test-runner requirements (D-1)

**Decision: Vitest + React Testing Library + jsdom** — the standard React testing combination for a Vite project. Vitest reuses the existing Vite 8 config and TypeScript handling, so no second build pipeline appears; React Testing Library supplies the behavior-level, accessibility-oriented queries AC-22 requires.

### 9.1 Dependencies to add (devDependencies)

| Package | Purpose |
| --- | --- |
| `vitest` | Test runner; must be the major that peers with Vite 8 (B5) |
| `jsdom` | DOM environment for component rendering |
| `@testing-library/react` | React 19-compatible render and queries |
| `@testing-library/dom` | Peer of the above; install explicitly if not hoisted |
| `@testing-library/user-event` | Realistic user interaction (typing, clicking, selecting) |
| `@testing-library/jest-dom` | Optional, recommended: readable DOM matchers. If added, register it in the setup file and account for its types (B6, Q-3) |

`msw` is listed in section 10.

### 9.2 Configuration

- **R-T1** Vitest configuration lives in the project's Vite config (with the Vitest config type reference) or in a sibling `vitest.config.ts` reusing the same plugins. The React plugin must apply to tests.
- **R-T2** `environment: 'jsdom'`.
- **R-T3** A setup file runs before each test file and is responsible for: starting the MSW node server, resetting handlers between tests, closing the server afterwards, cleaning the DOM between tests, and registering jest-dom matchers if used.
- **R-T4** Prefer explicit imports from `vitest` over `globals: true` (B6).
- **R-T5** Test files are colocated with the code they exercise or placed in a dedicated test directory — either way their type-checking under `tsc -b` is resolved deliberately (B6, AC-26).

### 9.3 Scripts

- **R-T6** `"test": "vitest run"` — single, non-interactive run; non-zero exit on failure (AC-21). This is the repeatable command FR-11 refers to.
- **R-T7** `"test:watch": "vitest"` — optional convenience; must not become the meaning of `npm test`.

### 9.4 What the essential test must do

- **R-T8** At least one test covers filtering or successful creation end to end: render the app, let the MSW-backed list load, interact as a user, assert on what the user sees.
- **R-T9** Queries use accessible roles, labels, and text (AC-22); `user-event` drives interaction rather than raw events.
- **R-T10** Asynchronous results are awaited with Testing Library's `findBy*` / `waitFor`; no fixed `setTimeout` waits.
- **R-T11** The test does not stub the API-client module, React hooks, or `fetch` — behavior is exercised through the real client against MSW (AC-23).
- **R-T12** Any wall-clock dependency is controlled (fake timers or relative dates), per B4 and AC-24.

---

## 10. Mock-mechanism requirements (D-2)

**Decision: MSW (Mock Service Worker), v2 API.** It is the optimal option here because it intercepts at the network layer: the production code path calls real `fetch` against the real contract, one handler file serves both the dev browser and the Vitest run, and no production module is replaced or injected to make tests pass. A hand-rolled module seam would need a second swap mechanism for tests and would leave the real `fetch` path unexercised; MSW removes both costs for one dev dependency plus a generated worker file.

### 10.1 Structure

- **R-M1** One handler module defines `GET /api/sessions` and `POST /api/sessions` exactly as in section 8, and is the single source of mock behavior for every environment.
- **R-M2** Mock state is a module-level in-memory store seeded per A-6 (relative dates, at least two statuses, at least one future session). `POST` appends to it so AC-20 holds.
- **R-M3** A browser entry point starts the service worker and a node entry point creates the server for tests. Both consume the same handlers from R-M1.

### 10.2 Browser integration

- **R-M4** `npx msw init public/` generates `public/mockServiceWorker.js`; the file is committed and regenerated whenever MSW is upgraded (B8).
- **R-M5** The worker starts in development only — guarded by `import.meta.env.DEV` and dynamically imported so MSW is not pulled into the production bundle.
- **R-M6** Startup is awaited before React renders, so the first list request is never missed.
- **R-M7** `onUnhandledRequest` is configured so an unmocked request is visible rather than silently passing through (A-11).

### 10.3 Test integration

- **R-M8** The node server starts once per test file lifecycle, handlers reset after each test, and the server closes at the end (R-T3).
- **R-M9** Failure scenarios are produced by overriding a handler at runtime for the duration of one test — not by editing the default handlers (AC-19).
- **R-M10** `onUnhandledRequest` is `'error'` in tests, so a request that bypasses the contract fails the test.

### 10.4 Boundary rule

- **R-M11** MSW is a transport-level mock only. It never substitutes for the API-client module of FR-9, and no UI component imports anything from the mock directory.

---

## 11. Open questions

- **Q-1** After a successful create while a non-matching status filter is active, should the filter reset to `All`, or should the new session simply not be visible until the filter changes? (Working assumption A-3: the user must be able to see the result of their action.)
- **Q-2** Which concrete status vocabulary should be used, and which single status must the filter offer? (Working assumption A-1.)
- **Q-3** Should `@testing-library/jest-dom` be included, or are plain Vitest assertions preferred? (Affects the setup file and the `types` question in B6. Either satisfies the acceptance criteria.)

Resolved since the previous revision:

- ~~Is adding a test stack approved?~~ → **D-1 / D-3**: yes, Vitest + React Testing Library + jsdom.
- ~~MSW or a dependency-free module seam?~~ → **D-2**: MSW.

None of the remaining questions block implementation. Q-1 and Q-2 are product choices the implementer may settle by documenting the choice.

---

## 12. Readiness

| Area | State |
| --- | --- |
| Product behavior | **Clear.** `tasks/TASK.md` is specific; remaining gaps are covered by assumptions A-1 to A-11. |
| Acceptance criteria | **Ready.** AC-1 to AC-26 are independently verifiable. |
| Test stack | **Decided (D-1).** Vitest + React Testing Library + jsdom; requirements in section 9. Exact versions resolved at install time (B5). |
| Mock mechanism | **Decided (D-2).** MSW v2; requirements in section 10. |
| API contract | **Provisional and sufficient.** Section 8 covers the two operations; `api-integration` confirms or adjusts. |
| Architecture | **Narrow.** Remaining choices — where the API client lives, where list state is held, test-file placement under `tsc -b` (B6) — are file-level and belong to `writing-plans`, with `architect` only if the state/boundary layout proves contentious. |
| Visual direction | **Unspecified, low risk** — `ui-designer` only if consistency matters. |

**Recommended next step:** `writing-plans` — a file-level implementation plan covering the API client, the MSW handlers and both entry points, the test setup and script, and the workspace UI. Run `api-integration` first only if the section 8 contract should be confirmed as living-spec truth before coding.

No production code, dependencies, rulesets, or living specifications were modified by this role.
