# Plan 003: Add .env.example, CLAUDE.md, and Integration + Deployment Documentation

> **Executor instructions**: Follow this plan step by step. Confirm each
> verification before moving to the next step. If anything in the "STOP
> conditions" section occurs, stop and report. When done, update the status
> row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a3a4d2f..HEAD -- README.md TODOS.md`
> If the README has changed significantly, check whether the sections
> described below still apply before editing.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / docs
- **Planned at**: commit `a3a4d2f`, 2026-06-23

## Why this matters

Three problems are blocking other teams and new contributors from working with this project:

1. **No `.env.example`**: The README (line 248) instructs `cp .env.example .env`, but the file doesn't exist in the repository. Any developer cloning fresh hits an immediate dead-end.

2. **No CLAUDE.md**: Other AI agents (including Claude Code instances from team members) working in this repo have no orientation file. `CLAUDE.md` is read automatically by Claude Code and sets the context for every session — without it, agents re-derive architecture every time, wasting context.

3. **No integration guide or deployment docs**: `POST /api/recommend` is a live cross-team API, `ExternalHttpAgent` exists for plugging in other teams' agents, and the TODOS file calls out that "external agents" auto-loading is deferred. Other teams (like those building invoice extraction or sales-intel agents) can't integrate without reading all source files. There's also no documented path for deploying to a real server.

## Current state

### Files that do NOT exist but should

- `/.env.example` — missing; README:248 references it
- `/CLAUDE.md` — missing; no agent orientation
- `/docs/INTEGRATION.md` — missing; no cross-team API guide
- `/docs/DEPLOYMENT.md` — missing; no server deployment guide

### README sections that need updating

README already has "Getting Started" (line 239) and "API Endpoints" (line 288). These are mostly accurate. The deployment target section is missing.

### TODOS.md — deferred items this plan addresses

From `TODOS.md:23-32`:
> **Live external integration.** `ExternalHttpAgent` + the `external_agents` Supabase table exist, but the orchestrator does not yet auto-load remote agents at startup.

The integration guide documents how to register manually until this is auto-loaded.

### External agent contract (`packages/shared/src/agent-contract.ts`)

The wire contract for external agents:
```ts
interface AgentRequestEnvelope {
  runId: string;
  agentId: string;
  prompt: string;
  context: PipelineContext;
  intake?: IntakeForm;
  config?: Partial<AgentConfig>;
}
type AgentResponseEnvelope = AgentOutput; // { success: boolean, data: unknown, error?: string }
```

This must be documented for integrating teams.

### `POST /api/recommend` endpoint

Lives at `apps/web/app/api/recommend/route.ts`. Takes an `IntakeForm` body, returns `{ recommendations: ProjectMatch[] }`. Already documented briefly in that file; needs a standalone reference.

## Commands you will need

| Purpose                | Command                  | Expected on success |
|------------------------|--------------------------|---------------------|
| Check repo root exists | `ls`                     | should list README.md, TODOS.md, etc. |
| Verify .env.example    | `cat .env.example`       | shows env var block |
| Verify docs dir        | `ls docs/`               | lists INTEGRATION.md, DEPLOYMENT.md |

## Scope

**Files to create** (new files only):

- `.env.example`
- `CLAUDE.md`
- `docs/INTEGRATION.md`
- `docs/DEPLOYMENT.md`

**Files to update**:

- `README.md` — add a "Deployment" section and a "For other teams" callout at the top

**Out of scope** (do NOT touch):

- Source code files — this plan is documentation only
- `TODOS.md` — leave as-is; it's internal notes

## Git workflow

- Branch: `advisor/003-env-and-docs`
- Commit message: `docs: .env.example, CLAUDE.md, deployment and integration guides`
- Do NOT push or open a PR unless explicitly asked

## Steps

### Step 1: Create `.env.example`

Create `.env.example` in the repo root with every environment variable the project reads, with placeholder values and inline comments:

```bash
# Neo4j (optional — pipeline works without it, using in-memory seed catalog)
# Get a free instance at neo4j.com/aura
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Supabase (optional — durable run mirror; leave blank for in-memory only)
# Create a project at supabase.com, find keys in Project Settings > API
SUPABASE_URL=
SUPABASE_ANON_KEY=

# LLM (optional — stub agents used if disabled or no key)
# Any OpenAI-compatible provider works (DeepSeek, OpenAI, Groq)
LLM_ENABLED=true
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-your-deepseek-api-key
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=4000
```

**Verify**: `cat .env.example` → shows all 10 variables above

### Step 2: Create `CLAUDE.md`

Create `CLAUDE.md` in the repo root. This file is read automatically by Claude Code at session start. Keep it concise — it's an orientation file, not a tutorial.

```markdown
# Floras Orchestrator — Claude Code Guide

## What this project is

A Turborepo monorepo that orchestrates AI agent pipelines for the Floras climate platform.
Two primary functions:

1. **Discovery pipeline** (current): Finds corporate leads, qualifies them, estimates CO2 footprint,
   recommends climate projects, generates sales materials.
2. **Transfer pipeline** (planned, see plans/005): Processes invoices to calculate and execute
   Floras token transfers between supplier and customer accounts.

## Package layout

| Package | Role |
|---|---|
| `apps/web` | Next.js 14 dashboard + REST API routes |
| `packages/orchestrator` | `PipelineEngine`, agent registry, agents |
| `packages/shared` | Types, Zod schemas, Neo4j client, KB match, Supabase store |
| `packages/ui` | Shared UI components (currently empty placeholder) |

## Dev setup

```bash
cp .env.example .env  # then fill in keys
pnpm install
pnpm dev              # starts at http://localhost:3000
```

All services are optional — the pipeline runs in stub mode with no API keys.

## Key design decisions

- **In-memory `Map` is runtime truth.** Supabase and Neo4j are best-effort durable mirrors.
- **Dual agent mode.** `LLM_ENABLED=true` → real LLM agents; otherwise stubs with hardcoded data.
- **No engine changes to add an agent.** Register via `engine.registerAgent()` + `engine.addStep()`.
- **Pipeline stages are validated transitions.** Adding a stage requires updating `TRANSITIONS` in `engine.ts`.

## Commands

```bash
pnpm dev         # dev server
pnpm build       # production build
pnpm lint        # lint all packages
pnpm --filter @floras/orchestrator exec tsc --noEmit  # typecheck orchestrator
pnpm --filter web exec tsc --noEmit                   # typecheck web app
```

## External agent integration

Other agents plug in via `ExternalHttpAgent` — see `docs/INTEGRATION.md`.
The `POST /api/recommend` endpoint exposes the knowledge base to other services.

## Active plans

See `plans/README.md` for prioritized improvement plans and their status.
```

**Verify**: File exists at `CLAUDE.md` root of repo.

### Step 3: Create `docs/INTEGRATION.md`

Create the `docs/` directory and `docs/INTEGRATION.md`:

```markdown
# Floras Orchestrator — Integration Guide

How other teams can integrate with the Floras Orchestrator.

## Knowledge Base API

The project catalog (12+ climate projects) is queryable over HTTP without
Neo4j credentials:

```
POST /api/recommend?limit=5
Content-Type: application/json

{
  "geographicRegions": ["Europe", "Africa"],
  "projectTypes": ["Forestry"],
  "requiredCertificates": ["Gold Standard"],
  "impactFocus": ["Biodiversity"],
  "co2TargetTonnes": 500,
  "budget": 10000,
  "budgetCurrency": "EUR"
}
```

All fields are optional — an empty body returns the full catalog ranked by
a default score. Response:

```json
{
  "recommendations": [
    {
      "project": { "id": "proj_euro_regen_ag", "name": "European Regenerative Agriculture", ... },
      "matchScore": 87,
      "factors": [
        { "name": "Impact focus", "score": 0.9, "weight": 0.4, "detail": "Covers Biodiversity" },
        ...
      ],
      "explanation": "European Regenerative Agriculture scores 87/100. Meets your filters ..."
    }
  ]
}
```

The `matchScore` is 0–100. Hard constraints (region, certificate, type) filter first;
soft scoring (impact overlap, budget fit, capacity) ranks survivors.

## Plugging in an External Agent

Your agent becomes part of the discovery pipeline with two steps:

### 1 — Implement the HTTP contract

Your server must accept `POST` requests with body `AgentRequestEnvelope` and return
`AgentResponseEnvelope`:

```ts
// Request body (from packages/shared/src/agent-contract.ts)
interface AgentRequestEnvelope {
  runId: string;
  agentId: string;
  prompt: string;
  context: PipelineContext;       // all data accumulated so far
  intake?: IntakeForm;            // structured customer preferences
  config?: Partial<AgentConfig>;  // optional timeout/retry hints
}

// Response body
interface AgentResponseEnvelope {
  success: boolean;
  data: unknown;     // validated by the orchestrator's Zod schema
  error?: string;
}
```

### 2 — Register with the orchestrator

In `apps/web/app/api/runs/route.ts` (or a startup hook), register your agent:

```ts
import { engine } from "@floras/orchestrator";
import { ExternalHttpAgent } from "@floras/orchestrator";
import { YourFallbackStubAgent } from "./your-stub";

engine.registerAgent(
  { id: "your-agent", stage: "recommending", reads: ["leads"], writes: ["recommendations"] },
  new ExternalHttpAgent(
    "your-agent",
    "https://your-service.example.com/agent",
    YourOutputSchema,   // Zod schema for response validation
    new YourFallbackStubAgent(),  // used if your endpoint is down
  ),
);

engine.addStep({
  id: "your-step",
  agentId: "your-agent",
  stage: "recommending",
  apply: (ctx, data) => { /* merge data into ctx */ },
});
```

The orchestrator validates your response against `YourOutputSchema`. If validation
fails or your endpoint is unreachable, `ExternalHttpAgent` falls back to the stub
automatically — the pipeline never hard-fails on a remote outage.

## SSE Events

Subscribe to `GET /api/runs/:id/events` with `EventSource` to receive real-time
pipeline progress. Relevant events for integrators:

| Event | Payload | Meaning |
|---|---|---|
| `agent_status` | `{ runId, agentId, status }` | Your agent started/finished/errored |
| `stage_change` | `{ runId, from, to }` | Pipeline advanced to next stage |
| `run_complete` | `{ runId }` | Full pipeline finished |
| `run_error` | `{ runId, error }` | Pipeline failed |

## Shared Types Package

Install `@floras/shared` to get the TypeScript types and Zod schemas:

```bash
# If this repo is published (currently local only):
# add "@floras/shared": "workspace:*" to your package.json
# and add this monorepo as a pnpm workspace

# Until then, copy packages/shared/src/agent-contract.ts for the wire types
```

The package is not yet published to npm — see `docs/DEPLOYMENT.md` for
deployment options that make the API publicly accessible.
```

**Verify**: `ls docs/` → shows `INTEGRATION.md`

### Step 4: Create `docs/DEPLOYMENT.md`

```markdown
# Floras Orchestrator — Deployment Guide

## Deployment options

### Option A: Vercel (recommended for demos and development)

The `apps/web` Next.js app deploys to Vercel without changes.

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set the root directory to `apps/web` (or use a Turbo-aware Vercel project).
4. Add environment variables (see `.env.example`) in Vercel project settings.
5. Deploy.

**Limitation**: The `PipelineEngine` is a singleton `Map` in process memory. On Vercel,
serverless functions are stateless and may run in multiple instances — runs created on
one instance won't be visible on another. For production use, all state must live in
Supabase (already implemented as a mirror) and the engine must be refactored to be
stateless (see `TODOS.md`).

**Current fit**: Demos, single-user dev environments, and hackathon presentations where
one Vercel function instance handles all traffic.

### Option B: Railway / Render (persistent process)

For a persistent long-lived Node process (which the singleton engine requires today):

1. Create a new service pointing to this repo.
2. Set build command: `pnpm install && pnpm build`.
3. Set start command: `node apps/web/.next/standalone/server.js`.
4. Add environment variables from `.env.example`.

This keeps the singleton engine alive across requests within one instance.

### Option C: Docker

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t floras-orchestrator .
docker run -p 3000:3000 --env-file .env floras-orchestrator
```

## Environment variables

See `.env.example` in the repo root. All are optional for stub/demo mode.

| Variable | Required for | Notes |
|---|---|---|
| `NEO4J_URI` | Graph persistence | Defaults to localhost if not set; pipeline runs without it |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` | Durable run history | In-memory fallback if not set |
| `LLM_ENABLED` + `LLM_API_KEY` | Real LLM agents | Stubs used if not set |

## Production checklist

Before a real deployment (not demo):

- [ ] Add Supabase Auth and row-level security (currently no-auth, anon access)
- [ ] Set `NEXT_PUBLIC_*` vars if the frontend needs to know the API base URL
- [ ] Configure Neo4j Aura (cloud) instead of localhost
- [ ] Add rate limiting to the API routes (no rate limiting currently)
- [ ] Review `TODOS.md` for known gaps (especially serverless durability)
```

**Verify**: `ls docs/` → shows both `INTEGRATION.md` and `DEPLOYMENT.md`

### Step 5: Add deployment callout to `README.md`

In `README.md`, after the "Tech Stack" table (around line 325), add a new section before "Design Decisions":

```markdown
## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for options (Vercel, Railway, Docker).

## For other teams

This orchestrator exposes two integration points:

- **`POST /api/recommend`** — query the Floras project catalog knowledge base over HTTP.
  No credentials needed. Returns ranked project matches with explainable scores.
- **`ExternalHttpAgent`** — plug your agent into the pipeline over HTTP using the shared
  `AgentRequestEnvelope` contract. See [`docs/INTEGRATION.md`](docs/INTEGRATION.md).
```

**Verify**: `grep -n "docs/DEPLOYMENT" README.md` → prints the new line

## Done criteria

- [ ] `ls .env.example` → file exists with all 10 variables
- [ ] `ls CLAUDE.md` → file exists
- [ ] `ls docs/INTEGRATION.md` → file exists
- [ ] `ls docs/DEPLOYMENT.md` → file exists with Options A/B/C/Docker
- [ ] `grep -n "docs/DEPLOYMENT" README.md` → finds the new section
- [ ] `pnpm build` exits 0 (doc changes don't break anything)
- [ ] No source files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- The README structure is significantly different from described (e.g., the "Tech Stack" section was moved or renamed) — adjust the insertion point manually rather than guessing.
- Any environment variable name referenced in `engine.ts`, `llm.ts`, or `supabase.ts` is not in `.env.example` — add it before committing.

## Maintenance notes

- When a new environment variable is added to any source file, add it to `.env.example` in the same PR.
- `CLAUDE.md` should be updated whenever the package layout or primary commands change.
- When the `@floras/shared` package is published to npm, update the "Install" section of `INTEGRATION.md`.
