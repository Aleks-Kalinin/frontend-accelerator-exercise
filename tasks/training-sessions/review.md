# Code Review — Training Sessions Workspace

Task: `training-sessions`
Role: `code-reviewer` (read-only)
Date: 2026-11-10

**Review surface:** the uncommitted working-tree change — `git diff HEAD`, 30 files, +3922 / −357.
**Comparison base:** `HEAD` = `b554438` (*feat: add workflow log and task description*). The whole repository was **not** reviewed; `package-lock.json` (+1588) and the generated `public/mockServiceWorker.js` (+600) were checked for provenance and version only, not line by line.
**Judged against:** `tasks/training-sessions/requirements.md` (revision 2026-11-10) and `tasks/training-sessions/implementation-plan.md`.
**Application root:** repository root — the single frontend candidate (one `package.json`, one `src/`, one `vite.config.ts`). No monorepo ambiguity.
**Rulesets:** no `rulesets/` directory and no `specs/` exist in the repository; no Common, Framework, or Project `code-reviewer` sections were available to load. Every finding below is therefore traced to the two task documents or to a demonstrable defect, not to reviewer preference.

---

## Verdict

**NEEDS-CHANGES**

No code defect blocks the required flow — list → filter → create works, and the quality gates pass (evidence below). The verdict is driven by one unmet delivery requirement (FR-12) that is also contradicted by a claim already written into the workflow log, and by three should-fix findings, one of which is a reachable behavioral hole in the create path.

### Gates actually executed during this review

| Command | Result |
| --- | --- |
| `npm test` | **pass** — 1 file, 1 test, 1.54 s, exit 0 |
| `npm run lint` | **pass** — oxlint, no diagnostics, exit 0 |
| `npm run build` | **pass** — `tsc -b` clean, 28 modules, built in 132 ms, exit 0 |
| `grep -ril "msw\|mockServiceWorker" dist/assets/` | **clean** — no mock code in the bundled assets (R-M5) |
| `npm ls vite` | **single deduped `vite@8.3.7`** across `vitest@5.1.0`, `@vitejs/plugin-react@6.3.0`, `msw@3.0.4` — B5 resolved correctly, no second Vite |

So AC-21, AC-25, and AC-26 are satisfied by observation, not by assertion.

---

## Part 1 — Blockers of the required flow

### BLOCKER-1 — FR-12 is unmet, and the log already claims the check was performed
`tasks/training-sessions/workflow-log.md:28-33`, contradicted by `tasks/training-sessions/workflow-log.md:13`

The **Manual Browser Observation** section is still entirely placeholders:

```
- Command and URL: `<actual command and discovered URL>`
- Flow exercised: `<list -> filter -> create>`
- Observed result: `<what actually happened>`
- Unverified or incomplete behavior: `<none or short list>`
```

Meanwhile line 13 of the same file states `Manual browser check performed by hand.` One of the two is wrong, and nothing in the diff resolves it.

FR-12 and AC-set aside, this is not a style point: the implementation plan's **step 2** makes the dev-browser mock path a *gating* check precisely because B8 describes an asymmetric failure — "tests green but the browser silently unmocked, or the reverse". The node path is proven (the suite passes against MSW). The browser path is proven by nothing. Static inspection says it should work — `public/mockServiceWorker.js` carries `PACKAGE_VERSION = '3.0.4'` matching the installed `msw@3.0.4`, `package.json` records `msw.workerDirectory: ["public"]`, the worker file is staged, and Vite emits it to `dist/mockServiceWorker.js` so it is served at the root scope — but "should work" is exactly what B8 warns against accepting.

*Failure scenario:* the dev server is started, service-worker registration fails (stale registration from another project on the same origin/port, or an integrity-checksum mismatch after a future MSW bump), `worker.start()` rejects, and — per SHOULD-FIX-2 — the page renders nothing at all. Nobody would know, because no one recorded ever opening it.

*Resolution:* run the flow once, record the real command, the URL Vite actually prints, and what was observed; or state plainly in the log that the manual pass was not performed and remove the line 13 claim. Per A-10 the error-state reproduction remains optional.

**No other finding blocks the required flow.** The happy path is exercised end to end by the passing test, and the filter logic is correct by inspection (`SessionsWorkspace.tsx:20-23` filters the already-loaded array; `StatusFilter.tsx:24-26` is fully controlled and issues no request).

---

## Part 2 — Should-fix (non-blocking, but real)

### SHOULD-FIX-1 — A successful create is invisible when the list is in the error state
`src/features/sessions/SessionsWorkspace.tsx:74` with `src/features/sessions/useSessions.ts:68-73`

`create` appends to `sessions` unconditionally, but the list renders only under `state === 'ready'`:

```tsx
{state === 'ready' ? <SessionList sessions={visibleSessions} /> : null}
```

`state` is never moved off `'error'` by a successful create.

*Failure scenario — fully reachable today:* `GET /api/sessions` fails, so the workspace shows the error + **Try Again** (AC-3). The **New Session** button is still rendered (`SessionsWorkspace.tsx:36-46` gates it on `isFormOpen` only), so the user opens the form, enters a valid title and a future date, and submits. The `POST` returns `201`, `useSessions.create` appends the new session, `handleCreated` closes the form and resets the filter — and the user is returned to the same error message with no sign their session was created. FR-8 ("the created session appears in the visible list") and AC-14 are violated on this path. The record exists in the mock store, so a later retry surfaces it, which makes the bug look like data loss until the user happens to retry.

The same root cause produces a narrower race during `state === 'loading'`: an in-flight `GET` that resolves after the append calls `setSessions(loaded)` at `useSessions.ts:43` and replaces the array. In practice the shared in-memory store means the late payload usually contains the created session anyway, and the 400 ms browser delays make the window very hard to hit — the error-state path is the one that matters.

*Suggested direction (not applied):* have `create` settle the list into a displayable state on success, or let the workspace render the list whenever `sessions.length > 0` regardless of `state`. One line either way.

### SHOULD-FIX-2 — A rejected `worker.start()` leaves a blank page with no diagnostic
`src/main.tsx:25-31`

```ts
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(...)
})
```

There is no `.catch`. `worker.start()` rejects on a failed service-worker registration, an integrity-checksum mismatch after an MSW upgrade (B8), or a browser/context without service-worker support. The `.then` never runs, `createRoot` is never called, and the user gets a white screen plus an unhandled promise rejection in the console — the least diagnosable failure mode for exactly the setup the plan flags as fragile.

This is development-only (the guard at `main.tsx:19-21` returns early when `!import.meta.env.DEV`), which is why it is not a blocker. It is still the failure that would make BLOCKER-1 expensive to diagnose.

*Suggested direction:* render regardless of the mock outcome and log the failure, so a broken worker degrades to the app's own error state (FR-3) instead of to nothing.

### SHOULD-FIX-3 — The filter and both error paths are verified by neither a test nor a record
`src/features/sessions/SessionsWorkspace.test.tsx:11-41`

The suite is exactly one test — which is correct: FR-11 asks for one, and plan §8 explicitly defers the rest with "**Do not implement them now**". That deferral is honored, so this is not a scope violation by the implementer.

The finding is the *combined* gap. Plan §8 defers the filter, error-and-retry, validation, double-submit, and persistence tests on the implicit assumption that the FR-12 manual pass covers the flow in the meantime. With BLOCKER-1 open, neither leg exists, and the following acceptance criteria are currently unverified by any means:

- **AC-5, AC-6, AC-7** — filter narrows, `All` restores, non-matching filter shows the empty message. The filter is *half* of the task's required flow and is not exercised anywhere.
- **AC-3, AC-4, AC-19** — list `500` → error + retry → success.
- **AC-13** — a second submit while pending issues no second request.
- **AC-15** — a create failure preserves input and allows retry.
- **AC-9 … AC-11** — validation blocks submission with no request sent.
- **AC-20** — a created session survives the next `GET`.

Closing BLOCKER-1 closes most of this. Otherwise the cheapest single addition is the filter test, since the seed at `src/mocks/store.ts:26-54` deliberately omits `cancelled` and therefore already makes AC-5, AC-6, and AC-7 reachable in one test.

The test itself is sound: it renders the real `App` with nothing stubbed (AC-23, R-T11), queries by role/label/text only (AC-22), awaits with `findBy*` rather than timers (R-T10), and derives the date from `Date.now()` so it cannot rot (AC-24, R-T12). The documented `fireEvent.change` fallback for the segmented `datetime-local` control (`SessionsWorkspace.test.tsx:26-33`) is exactly the deviation plan §4.6 pre-authorized, and it is commented as required.

---

## Part 3 — Specification drift (report only, no doc edits made)

### DRIFT-1 — The requirements specify "MSW v2 API"; the implementation is MSW v3, and is right to be
`tasks/training-sessions/requirements.md` §10 (D-2) and R-M7 vs `package.json:28`, `src/main.tsx:19`, `src/test/setup.ts:9`

The requirements fix the mock at "MSW (Mock Service Worker), **v2 API**" and R-M7/R-M10 name the option `onUnhandledRequest`. The installed package is `msw@3.0.4`, and the code uses `onUnhandledFrame`:

```ts
await worker.start({ onUnhandledFrame: 'warn' })      // src/main.tsx:19
server.listen({ onUnhandledFrame: 'error' })          // src/test/setup.ts:9
```

**The code is correct, the document is stale.** Verified against the installed typings — `node_modules/msw/lib/_chunks/shared-options.d.ts` declares `SharedOptions` with a single member, `onUnhandledFrame?: UnhandledFrameHandle`, documented with `server.listen({ onUnhandledFrame: 'error' })`; `onUnhandledRequest` does not appear anywhere in `msw/lib/`. Passing the name from the requirements would have been silently ignored, which is the failure R-M7 and R-M10 exist to prevent. The intent of both rules is met.

No action is requested here beyond awareness — per instruction, no document was modified. Whoever next touches `requirements.md` §10 should record v3 and the real option name so a future reader does not "correct" working code back to a no-op.

### DRIFT-2 — The plan's bundle-cleanliness check is narrower than the claim it supports
`tasks/training-sessions/implementation-plan.md` §7 vs `dist/`

Plan §7 verifies R-M5 with `grep -ril "msw\|mockServiceWorker" dist/assets/`. That grep passes — I ran it, and it is clean. But `public/mockServiceWorker.js` is a public asset, so Vite copies it verbatim to `dist/mockServiceWorker.js`, outside `dist/assets/`. The 600-line worker therefore ships in any deployed output.

This is harmless in behavior — nothing registers it in production, because the only caller is behind `import.meta.env.DEV` — and R-M5 is about the JS *bundle*, which is genuinely clean. Worth knowing before anyone reads the green grep as "no MSW in `dist/`", which is not what it checked.

---

## Part 4 — Non-blocking improvements

| # | Location | Observation |
| --- | --- | --- |
| N-1 | `src/features/sessions/SessionList.tsx:15` | The empty message is always *"No sessions match this filter."* It is also what renders when the API legitimately returns zero sessions with `All` selected — the wording then misattributes an empty backend to the user's filter. AC-7 is satisfied either way; the copy is what could mislead. |
| N-2 | `src/features/sessions/CreateSessionForm.tsx:56` | `error instanceof Error ? error.message` surfaces the message of *any* `Error`, not only `ApiError`. The API client normalizes everything it throws (`src/api/sessions.ts:67-75`), so today only `ApiError` reaches here — but an unexpected `TypeError` from a future refactor would be rendered verbatim to the trainer. Narrowing to `instanceof ApiError`, with `FALLBACK_ERROR` otherwise, matches §8.4's "UI components branch on that normalized error". |
| N-3 | `src/features/sessions/CreateSessionForm.tsx:114` | The submit-error region is `role="status"` (polite). The equivalent list-level error at `SessionsWorkspace.tsx:66` correctly uses `role="alert"`. A failed submission is the more urgent of the two; the inconsistency reads as accidental. Keeping the element permanently mounted is right — that is what makes the announcement fire. |
| N-4 | `src/features/sessions/validation.ts:48-50` | `hasErrors` enumerates `title` and `startsAt` by name. Adding a third field and forgetting this function yields a silently-submitting form. `Object.keys(errors).length > 0` is equivalent today and cannot drift. |
| N-5 | `src/mocks/store.ts:13` | `let sessions: Session[] = []` is immediately overwritten by `sessions = seed()` at line 56. `let sessions = seed()` removes a dead initializer and the explicit annotation. |
| N-6 | `public/icons.svg` | Became unreferenced when the starter markup left `src/App.tsx`. Plan §5 said to leave it alone, so this is correctly *not* a violation — noted only so it is a deliberate leftover rather than an unnoticed one. The three `src/assets/*` deletions were the sanctioned cleanup and are correct. |
| N-7 | `src/mocks/handlers.ts:75-86` | The `400` branch returns before `delay(delayMs)`, so a rejected create responds instantly while a successful one waits 400 ms in the browser. Invisible at this scope (the `400` is unreachable from the validated form) and not worth restructuring — noted for completeness. |

---

## What the diff gets right

Called out because these are the parts a later change is most likely to erode:

- **The boundary holds (FR-9, AC-16, R-M11).** `src/api/sessions.ts` is the only module that calls `fetch`, owns the only URL constant, and is the only place a `Response` or a status code exists — `requestJson` at `src/api/sessions.ts:53-76` narrows every outcome to a parsed body or an `ApiError`. No component imports anything from `src/mocks/`; the mock imports *down* into `src/api/types.ts` only, so it cannot drift from the contract. Deleting `src/mocks/` and the `enableMocking()` call is genuinely the whole swap.
- **One handler definition, two environments (R-M1, R-M3, A-8).** The `createSessionHandlers({ delayMs })` factory gives the browser its observable 400 ms and the tests their 0 ms with *identical logic*, and avoids reading `import.meta.env` inside a module that also runs under Node — the trap the plan predicted.
- **Time dependence is genuinely eliminated (B4, AC-24).** Every seed date derives from `Date.now()` (`store.ts:26-54`), `validateSessionForm` takes `now` as a parameter rather than reading the clock (`validation.ts:20-23`), the test computes its input from `Date.now()`, and nothing asserts on `Intl` output. The suite has no date on which it starts failing.
- **`resetStore()` is wired into `afterEach` (`src/test/setup.ts:12-18`)**, so test isolation is real rather than nominal — without it the first created session leaks into every later test.
- **StrictMode is handled correctly.** The `AbortController` in `useSessions.ts:33-58` plus the `signal.aborted` guard in *both* settle paths means the double-invoke cannot land a stale response, and the re-thrown `AbortError` is consumed rather than escaping as an unhandled rejection.
- **The accessibility floor (A-9) is met**, which is what makes AC-22's accessible queries possible: every control has a real `<label htmlFor>`, field errors are wired through `aria-describedby` with matching ids, `aria-invalid` is set, and retry is a real `<button>`.
- **B6's strict-compiler constraints are respected throughout** — `import type` everywhere, union + const array instead of an enum, an explicit `ApiError` constructor instead of parameter properties, explicit `vitest` imports instead of `globals: true`, and no `tsconfig` change needed. `tsc -b` type-checks the test file under `include: ["src"]` and passes.

---

## Recommended follow-up

1. Close **BLOCKER-1** — perform the manual pass and record it, or withdraw the claim at `workflow-log.md:13`. This is a `/verify` or developer action, not a code change.
2. Address **SHOULD-FIX-1** and **SHOULD-FIX-2** — two small, bounded edits. Appropriate role: `/coder`, scoped to `SessionsWorkspace.tsx`/`useSessions.ts` and `main.tsx`.
3. **SHOULD-FIX-3** — if the manual pass does not cover the filter, add the filter test; appropriate role: `/test-generator` against plan §8's table, which already lists it first.
4. **DRIFT-1** — when `requirements.md` §10 is next revised, record MSW v3 and `onUnhandledFrame`.

Residual gap on any future PASS: the acceptance criteria listed under SHOULD-FIX-3 remain unproven by automation. That is a consequence of FR-11 asking for one test, not a defect in this change — but it should be stated rather than implied.

---

*Read-only review. No code, test, configuration, documentation, or ruleset file was modified. The commands in the gates table were executed for evidence; `npm run build` regenerated the git-ignored `dist/` directory, which is not part of the reviewed change. This role does not invoke the follow-up commands it recommends.*
