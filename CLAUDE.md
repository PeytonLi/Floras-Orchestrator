# Floras Orchestrator — Claude Code Guide

## What this project is

A Turborepo monorepo that orchestrates AI agent pipelines for the Floras climate platform.
Two primary functions:

1. **Discovery pipeline** (current): Finds corporate leads, qualifies them, estimates CO2 footprint,
   recommends climate projects, generates sales materials.
2. **Transfer pipeline** (planned, see plans/004): Processes invoices to calculate and execute
   Floras token transfers between supplier and customer accounts.

## Package layout

| Package | Role |
|---|---|
| `apps/web` | Next.js 14 dashboard + REST API routes |
| `packages/orchestrator` | `PipelineEngine`, agent registry, agents |
| `packages/shared` | Types, Zod schemas, Neo4j client, KB match, Supabase store |
| `packages/ui` | Shared UI components |

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
