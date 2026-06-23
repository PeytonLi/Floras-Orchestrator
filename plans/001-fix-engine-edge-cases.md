# Plan 001: Fix Two Engine Edge Cases — Gate Timeout and getRun Cache Miss

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a3a4d2f..HEAD -- packages/orchestrator/src/engine.ts apps/web/app/api/runs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a3a4d2f`, 2026-06-23

## Why this matters

Two independent defects in `PipelineEngine` can silently break the dashboard:

1. **Gate timeout**: `waitForGate()` resolves only when the browser calls `POST /api/runs/:id/approve`. If the user closes the tab, network drops, or the SSE connection dies, the promise never resolves. The pipeline run hangs in memory indefinitely, holding the Node.js event loop and leaking the `gateResolvers` Map entry.

2. **getRun cache miss**: `getRun(runId)` checks the in-memory `Map`, fires an async Neo4j read-through, and immediately returns `undefined`. Any synchronous caller — including the `GET /api/runs/:id` route — sees a 404 on the first request, even for runs that exist in Neo4j. The async fetch populates the cache, but only in time for a *subsequent* request. After any server restart all runs produce one spurious 404.

## Current state

### File roles

- `packages/orchestrator/src/engine.ts` — the `PipelineEngine` class; contains both defects
- `apps/web/app/api/runs/[id]/route.ts` — the GET route that calls `engine.getRun()` synchronously

### Bug 1 — waitForGate, no timeout (`engine.ts:634-638`)

```ts
// engine.ts:634-638 (CURRENT — no timeout)
private waitForGate(runId: string): Promise<GateDecision> {
  return new Promise((resolve) => {
    this.gateResolvers.set(runId, resolve);
  });
}
```

### Bug 2 — getRun fires async but returns undefined (`engine.ts:232-253`)

```ts
// engine.ts:232-239 (CURRENT — fires async, returns undefined immediately)
getRun(runId: string): PipelineRun | undefined {
  const cached = this.runs.get(runId);
  if (cached) return cached;

  // Trigger async read-through from Neo4j (available on next call)
  this.fetchAndCacheRun(runId);
  return undefined;
}
```

### API route that exposes the 404 (`apps/web/app/api/runs/[id]/route.ts:11-15`)

```ts
// route.ts:11-15 (CURRENT — no await, returns 404 on cache miss)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = engine.getRun(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
```

### Existing patterns to match

- All engine methods that need Neo4j use `await` internally and `catch` to fall back gracefully. Match that pattern.
- `DEFAULT_AGENT_CONFIG` defines `timeoutMs: 30_000`. Use the same constant name convention when defining the gate timeout default.
- The `engine` singleton is exported at the bottom of `engine.ts`. Do not change that export.

## Commands you will need

| Purpose    | Command                          | Expected on success       |
|------------|----------------------------------|---------------------------|
| Typecheck  | `pnpm --filter @floras/orchestrator exec tsc --noEmit` | exit 0, no errors |
| Typecheck web | `pnpm --filter web exec tsc --noEmit` | exit 0, no errors |
| Build (verify compilation) | `pnpm build` | exit 0 |
| Dev (manual smoke test) | `pnpm dev` | server starts at :3000 |

## Scope

**In scope** (the only files you should modify):

- `packages/orchestrator/src/engine.ts`
- `apps/web/app/api/runs/[id]/route.ts`

**Out of scope** (do NOT touch):

- `packages/shared/src/types.ts` — no type changes needed
- `apps/web/app/api/runs/route.ts` (the list route) — different code path
- `apps/web/app/api/runs/[id]/approve/route.ts` — approval path works correctly

## Git workflow

- Branch: `advisor/001-engine-edge-cases`
- Commit message style: `fix(engine): <what>` — match the repo's conventional-commit style seen in `git log`
- Do NOT push or open a PR unless explicitly asked

## Steps

### Step 1: Add a configurable gate timeout constant to `engine.ts`

At the top of `engine.ts`, immediately after the existing `DEFAULT_AGENT_CONFIG` constant (around line 52), add:

```ts
/** Maximum time (ms) a pipeline run may wait at a human gate before auto-rejecting */
const GATE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
```

This keeps the magic number named and in one place. Do not hardcode `30 * 60 * 1000` inline in the method.

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 2: Replace `waitForGate` with a timeout-aware version

Find `waitForGate` at the bottom of `engine.ts` (around line 634). Replace the entire method:

```ts
// BEFORE
private waitForGate(runId: string): Promise<GateDecision> {
  return new Promise((resolve) => {
    this.gateResolvers.set(runId, resolve);
  });
}

// AFTER
private waitForGate(runId: string): Promise<GateDecision> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      this.gateResolvers.delete(runId);
      reject(new Error(`Gate for run ${runId} timed out after ${GATE_TIMEOUT_MS / 1000}s`));
    }, GATE_TIMEOUT_MS);

    this.gateResolvers.set(runId, (decision: GateDecision) => {
      clearTimeout(timer);
      resolve(decision);
    });
  });
}
```

Important: the resolver stored in `gateResolvers` must now clear the timer before resolving. This is already handled by wrapping the original resolver in the lambda above. `resolveGate()` calls `this.gateResolvers.get(runId)` — that now calls this wrapper, which clears the timer and resolves. No change to `resolveGate` needed.

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 3: Add an async `getRunAsync` method to the engine

Below the existing `getRun` method in `engine.ts` (around line 253), add a new async method that awaits the Neo4j read-through:

```ts
/**
 * Async variant of getRun — awaits the Neo4j read-through on a cache miss.
 * Use this from API routes where an await is possible.
 */
async getRunAsync(runId: string): Promise<PipelineRun | undefined> {
  const cached = this.runs.get(runId);
  if (cached) return cached;
  await this.fetchAndCacheRun(runId);
  return this.runs.get(runId);
}
```

Keep the existing synchronous `getRun` unchanged — it's called from `executeRun`'s internal state checks where the run is always in-memory.

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 4: Update the GET /api/runs/:id route to use `getRunAsync`

In `apps/web/app/api/runs/[id]/route.ts`, replace the synchronous `engine.getRun` call with `await engine.getRunAsync`:

```ts
// BEFORE
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = engine.getRun(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}

// AFTER
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = await engine.getRunAsync(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
```

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 5: Final build verification

```
pnpm build
```

Expected: exit 0, no TypeScript errors, no import errors.

## Test plan

No automated test infrastructure exists (that's a separate plan). Manual smoke-test:

1. Start `pnpm dev`.
2. Create a run via `POST /api/runs`.
3. Copy the `run.id` from the response.
4. Kill and restart the dev server.
5. `GET /api/runs/:id` — should return 200 with the run (if Neo4j is configured) instead of 404.
6. Create another run and let it reach `awaiting_approval`.
7. Do not approve it. Wait 30 minutes (or temporarily set `GATE_TIMEOUT_MS = 5000` for the smoke test).
8. The run should transition to `error` stage and emit a `run_error` SSE event.

## Done criteria

- [ ] `pnpm --filter @floras/orchestrator exec tsc --noEmit` exits 0
- [ ] `pnpm --filter web exec tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `waitForGate` method has a `setTimeout` that rejects after `GATE_TIMEOUT_MS`
- [ ] `getRunAsync` method exists on `PipelineEngine` and is used by the GET route
- [ ] No files outside the in-scope list are modified (`git diff --name-only`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- The code at the locations in "Current state" doesn't match the excerpts (codebase drifted).
- `pnpm build` fails with an error not caused by this plan's changes.
- `resolveGate` calls the resolver in a way that the timer-clear path isn't hit (check carefully — the wrapper pattern must intercept it).
- The `fetchAndCacheRun` method signature changes in a way that makes `getRunAsync` incorrect.

## Maintenance notes

- If `PipelineEngine` becomes a serverless function (called per-request), the in-memory `Map` and `gateResolvers` won't survive across invocations — the TODOS file already flags this. The `getRunAsync` fix only helps within a single long-lived process.
- `GATE_TIMEOUT_MS` should eventually be configurable per-run via `setAgentConfig` or a run-level override. The constant is a reasonable default for now.
- If a gate times out, the `run_error` SSE event will surface the timeout message to the dashboard — no extra UI work needed.
