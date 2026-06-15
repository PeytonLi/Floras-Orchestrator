# TODOS — deferred scope

Items intentionally left out of the orchestrator upgrade (registry + KB + intake +
Supabase mirror), with enough context to pick up later.

## Knowledge bases (other teams)
- **CO2 emission-factor KB + invoice extraction (Team 4).** Schema already leaves room
  (`RunInput.invoicePath`, Supabase `artifacts` + storage). Add an extraction agent that
  reads an uploaded invoice, classifies line items, and estimates footprint with
  confidence levels, grounded in an emission-factor KB. Wire it as a registry agent + one
  pipeline step — no engine edits.
- **Sales/ICP signals KB (Team 2).** Qualification is currently LLM-only. Ground it with
  ICP definitions + company/news/social signals so scores cite real evidence.

## Retrieval
- **Pinecone vector RAG (cut for the hackathon).** Re-add behind the existing
  `recommendProjects()` interface (`packages/shared/src/kb/match.ts`) if the catalog grows
  or you want semantic matching on free-text intake notes. Keep Neo4j as the hard-constraint
  filter; layer vector ranking on the survivors.

## External agents
- **Live external integration.** `ExternalHttpAgent` + the `external_agents` Supabase table
  exist, but the orchestrator does not yet auto-load remote agents at startup. Add a loader
  that reads `external_agents` and registers each as a registry agent with its internal twin
  as fallback. Today they're registered manually via `engine.registerAgent(...)`.

## Platform
- **Production auth + RLS.** Demo uses anon Supabase access with no row-level security.
  Add Supabase Auth, run ownership, and RLS policies before any real deployment.
- **Serverless durability.** The engine is an in-process singleton holding state in a Map.
  On a serverless host that won't survive across instances/requests; revisit if deploying
  beyond a single long-lived Node process.
