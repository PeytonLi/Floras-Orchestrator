# Integrating an External Agent with Floras Orchestrator

The orchestrator supports pluggable external agents via HTTP. Any service
that implements the `AgentRequestEnvelope` / `AgentResponseEnvelope` contract
can participate in a pipeline.

## Contract

### Request (sent by the orchestrator to your agent)

```json
{
  "runId": "run_abc123",
  "context": {
    "leads": [...],
    "qualifications": [...],
    "estimates": [...],
    "recommendations": [...],
    "artifacts": [...]
  },
  "prompt": "Find leads in food & beverage",
  "intake": null
}
```

| Field | Type | Description |
|---|---|---|
| `runId` | string | Unique run identifier |
| `context` | object | Cumulative pipeline data so far |
| `prompt` | string | Original user prompt |
| `intake` | object? | Optional structured customer intake form |

### Response (your agent must return)

```json
{
  "success": true,
  "data": { "leads": [...], "qualifications": [...] },
  "error": null
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether the agent executed successfully |
| `data` | object | Agent-specific output (must match what the pipeline step expects) |
| `error` | string? | Error message if `success` is false |

## Registering your agent

```ts
import { ExternalHttpAgent } from "@floras/orchestrator";

const myAgent = new ExternalHttpAgent({
  id: "my-agent",
  name: "My Custom Agent",
  description: "Does something useful",
  endpoint: "https://my-service.com/api/execute",
  timeoutMs: 60_000,
});

engine.registerAgent(myAgent);
engine.addStep({
  id: "my-custom-step",
  agentId: "my-agent",
  stage: "presenting",
  apply: (ctx, data) => {
    // merge data into pipeline context
  },
});
```

## SSE Events

Your agent does not need to handle SSE — the orchestrator emits events
to the dashboard automatically as the pipeline progresses.

## Testing your integration

1. Start the orchestrator: `pnpm dev`
2. POST a run with your agent in the pipeline
3. Monitor the dashboard for stage transitions and results
