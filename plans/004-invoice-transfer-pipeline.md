# Plan 004: Introduce Invoice-Based Floras Transfer Pipeline (3 Use Cases)

> **Executor instructions**: This is a multi-day implementation plan. Read it
> entirely before starting. Each step has a verification gate — do not proceed
> until it passes. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise architectural decisions outside the scope below.
> When done, update `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat a3a4d2f..HEAD -- packages/shared/src/types.ts packages/orchestrator/src/engine.ts packages/orchestrator/src/pipeline-def.ts apps/web/app/page.tsx`
> If any of these files changed significantly, compare the "Current state"
> excerpts before proceeding.

## Status

- **Priority**: P1 (direction)
- **Effort**: L (multi-day)
- **Risk**: MED — extends the type system and engine; existing pipeline must keep working
- **Depends on**: none (can run in parallel with plans 001–003)
- **Category**: direction
- **Planned at**: commit `a3a4d2f`, 2026-06-23

## Why this matters

The three Floras operational use cases have been defined:

**Case 1 — Peruvian Oil Company (B2B multi-supplier)**: A client forces their suppliers to
buy Floras. Each supplier uploads an invoice → the platform calculates how many Floras to
transfer to the customer → deducts from supplier's pre-purchased account → logs a ledger
event → sends confirmation emails to both parties.

**Case 2 — Boggio (self-service)**: One company acts as both supplier and customer. One
person handles the entire flow. They buy Floras and use them to purchase certificates for
their own delivered products.

**Case 3 — Danone (B2C loyalty)**: One supplier, potentially millions of consumer recipients.
Supplier purchases Floras per product sold; certificates go to the supplier (not consumers).

The current orchestrator has none of these flows. It has a "discovery" pipeline that helps
*sell* Floras to corporate clients — not a "transfer" pipeline that powers the platform's
core operation. This plan adds a second pipeline mode alongside the existing one.

## Current state

### The existing discovery pipeline (must remain unchanged)

Stages: `discovering → qualifying → awaiting_approval → estimating → recommending → presenting → complete`

Defined in `packages/orchestrator/src/pipeline-def.ts` as `DEFAULT_PIPELINE`.
Triggered by `POST /api/runs` with a `prompt` field.

### `PipelineStage` type (`packages/shared/src/types.ts:8-17`)

```ts
export type PipelineStage =
  | "idle"
  | "discovering"
  | "qualifying"
  | "awaiting_approval"
  | "estimating"
  | "recommending"
  | "presenting"
  | "complete"
  | "error";
```

### `PipelineContext` (`packages/shared/src/types.ts:102-108`)

```ts
export interface PipelineContext {
  leads: Lead[];
  qualifications: Qualification[];
  estimates: CO2Estimate[];
  recommendations: ProjectRecommendation[];
  artifacts: Artifact[];
}
```

### `RunInput` (`packages/shared/src/types.ts:62-70`)

```ts
export interface RunInput {
  prompt: string;
  invoicePath?: string;
  customerName?: string;
  intake?: IntakeForm;
}
```

### `TRANSITIONS` in `engine.ts` (lines 59-70)

```ts
const TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  idle: ["discovering"],
  discovering: ["qualifying", "error"],
  qualifying: ["awaiting_approval", "error"],
  awaiting_approval: ["estimating", "error"],
  // ...
};
```

### `DEFAULT_PIPELINE` in `pipeline-def.ts` (lines 80-131)

Array of 4 steps: discover-and-qualify, estimate, recommend, present.

### Convention for new types

Match the existing naming convention: `PascalCase` for interfaces, `camelCase` for fields,
`string` for IDs, `string` (ISO 8601) for timestamps. See `Lead` and `CO2Estimate` as
patterns.

## Commands you will need

| Purpose                    | Command                                               | Expected         |
|----------------------------|-------------------------------------------------------|------------------|
| Typecheck shared           | `pnpm --filter @floras/shared exec tsc --noEmit`      | exit 0           |
| Typecheck orchestrator     | `pnpm --filter @floras/orchestrator exec tsc --noEmit`| exit 0           |
| Typecheck web              | `pnpm --filter web exec tsc --noEmit`                 | exit 0           |
| Full build                 | `pnpm build`                                          | exit 0           |
| Dev                        | `pnpm dev`                                            | starts at :3000  |

## Scope

**In scope** (only these files):

- `packages/shared/src/types.ts` — new types + extended existing types
- `packages/shared/src/index.ts` — re-export new types
- `packages/orchestrator/src/engine.ts` — support pipeline mode selection
- `packages/orchestrator/src/pipeline-def.ts` — `TRANSFER_PIPELINE` definition
- `packages/orchestrator/src/agents/invoice-parser-stub.ts` — new stub agent (create)
- `packages/orchestrator/src/agents/co2-from-invoice-stub.ts` — new stub agent (create)
- `packages/orchestrator/src/agents/floras-transfer-stub.ts` — new stub agent (create)
- `packages/orchestrator/src/agents/index.ts` — re-export new stubs
- `apps/web/app/components/IntakeForm.tsx` — new fields for transfer mode
- `apps/web/app/page.tsx` — mode selector UI (discovery vs. transfer)
- `apps/web/app/api/runs/route.ts` — extend POST body to include `mode`

**Out of scope** (do NOT touch):

- `DEFAULT_PIPELINE` logic in `pipeline-def.ts` — must remain unchanged
- `packages/shared/src/kb/` — knowledge base is unchanged
- `packages/shared/src/schemas.ts` — Zod schemas for the discovery pipeline are unchanged
- `packages/orchestrator/src/agents/` LLM agents — add stubs only; LLM agents for the transfer pipeline are deferred

**STOP if** any step would require you to modify `DEFAULT_PIPELINE` or the existing
discovery agent implementations — that is out of scope.

## Git workflow

- Branch: `advisor/004-transfer-pipeline`
- Commit per logical unit: types → stubs → pipeline-def → engine → UI → API
- Commit message style: `feat(shared): ...`, `feat(orchestrator): ...`, `feat(web): ...`
- Do NOT push or open a PR unless explicitly asked

---

## Steps

### Step 1: Add new types to `packages/shared/src/types.ts`

Add the following type definitions at the **end** of `packages/shared/src/types.ts`,
after the existing `SSEEvent` type. Do not modify any existing type.

```ts
// ============================================================
// Transfer Pipeline — new types for invoice-based Floras transfers
// ============================================================

/** Which pipeline mode this run uses */
export type PipelineMode = "discovery" | "transfer";

/** Which of the 3 Floras operational scenarios applies */
export type TransferScenario = "b2b" | "self" | "b2c";
// b2b = Peruvian Oil (many suppliers, one client)
// self = Boggio (one company is both supplier and customer)
// b2c = Danone (one supplier, many consumer recipients)

/** How the Floras amount is calculated from an invoice */
export type CalculationMethod = "percentage" | "detailed";

export interface InvoiceLineItem {
  description: string;
  amountEUR: number;
  /** Estimated CO2 in kg for this line item — filled by CO2FromInvoice agent */
  estimatedCO2Kg?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  supplierName: string;
  customerName: string;
  totalAmountEUR: number;
  lineItems: InvoiceLineItem[];
  calculationMethod: CalculationMethod;
  /** Percentage of invoice amount allocated to Floras (0–1), used when method = 'percentage' */
  percentageRate?: number;
}

export interface TransferAmount {
  /** Number of Floras to transfer (1 Floras offsets 1 kg CO2) */
  florasCount: number;
  /** Corresponding CO2 in kg */
  co2Kg: number;
  /** Human-readable breakdown of how the amount was calculated */
  calculationBreakdown: string;
  /** Whether a human must approve before the transfer executes */
  requiresHumanApproval: boolean;
}

export interface LedgerEvent {
  id: string;
  timestamp: string;
  fromAccount: string; // supplier company name
  toAccount: string;   // customer company name (or "supplier" for Boggio/self scenario)
  florasCount: number;
  co2Kg: number;
  invoiceRef: string;
  runId: string;
}

/** Per-context data for the transfer pipeline (separate from discovery PipelineContext) */
export interface TransferContext {
  invoice: InvoiceData | null;
  transferAmount: TransferAmount | null;
  ledgerEvents: LedgerEvent[];
  confirmedAt: string | null;
}
```

Also extend `RunInput` to include mode and transfer fields:

```ts
// BEFORE (lines 62-70)
export interface RunInput {
  prompt: string;
  invoicePath?: string;
  customerName?: string;
  intake?: IntakeForm;
}

// AFTER — add mode and transfer fields
export interface RunInput {
  prompt: string;
  invoicePath?: string;
  customerName?: string;
  intake?: IntakeForm;
  /** Which pipeline to run (default: "discovery") */
  mode?: PipelineMode;
  /** For transfer mode: which of the 3 scenarios */
  scenario?: TransferScenario;
  /** For transfer mode: structured invoice data from the intake form */
  invoiceData?: InvoiceData;
  /** For transfer mode: supplier company name */
  supplierName?: string;
}
```

Also extend `PipelineStage` to include transfer stages (add to the union, do NOT remove existing):

```ts
// AFTER — extend with transfer stages
export type PipelineStage =
  | "idle"
  | "discovering"
  | "qualifying"
  | "awaiting_approval"
  | "estimating"
  | "recommending"
  | "presenting"
  | "complete"
  | "error"
  // Transfer pipeline stages
  | "parsing"       // Invoice parser reads the invoice
  | "calculating"   // CO2FromInvoice calculates Floras amount
  | "transferring"  // FlorasTransfer executes the account transfer
  | "confirming";   // Confirmation emails sent to both parties
```

**Verify**: `pnpm --filter @floras/shared exec tsc --noEmit` → exit 0

### Step 2: Re-export new types from `packages/shared/src/index.ts`

Open `packages/shared/src/index.ts` and add exports for the new types:

```ts
export type {
  PipelineMode,
  TransferScenario,
  CalculationMethod,
  InvoiceLineItem,
  InvoiceData,
  TransferAmount,
  LedgerEvent,
  TransferContext,
} from "./types";
```

Place these alongside the existing type exports. If the file uses a barrel export like
`export * from "./types"` already, no change is needed for these new types — they'll be
picked up automatically.

**Verify**: `pnpm --filter @floras/shared exec tsc --noEmit` → exit 0

### Step 3: Create three stub agents for the transfer pipeline

These stubs simulate realistic behavior without calling an LLM. They follow the same
pattern as `DesignSystemStubAgent` in `packages/orchestrator/src/agents/design-system-stub.ts`.

**3a — `packages/orchestrator/src/agents/invoice-parser-stub.ts`**

```ts
import type { AgentInput, AgentOutput, InvoiceData } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

/**
 * Stub invoice parser — simulates reading an invoice and extracting line items.
 * In production, this would use OCR + LLM to parse a PDF invoice.
 */
export class InvoiceParserStubAgent extends BaseAgent {
  readonly id = "invoice-parser";
  readonly name = "Invoice Parser (Stub)";
  readonly description = "Parses supplier invoice to extract line items and totals";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Parsing invoice (stub)");
    await sleep(600);

    const supplierName = input.context.invoice?.supplierName
      ?? input.prompt
      ?? "Acme Supplier";

    const invoice: InvoiceData = input.context.invoice ?? {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      supplierName,
      customerName: "Floras Client Corp",
      totalAmountEUR: 48_500,
      lineItems: [
        { description: "Crude oil delivery — 500t", amountEUR: 35_000, estimatedCO2Kg: undefined },
        { description: "Transport & logistics", amountEUR: 8_500, estimatedCO2Kg: undefined },
        { description: "Refinery surcharge", amountEUR: 5_000, estimatedCO2Kg: undefined },
      ],
      calculationMethod: "percentage",
      percentageRate: 0.02,
    };

    logger.info(`Parsed invoice ${invoice.invoiceNumber}: €${invoice.totalAmountEUR.toLocaleString()} from ${invoice.supplierName}`);
    return { success: true, data: { invoice } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**3b — `packages/orchestrator/src/agents/co2-from-invoice-stub.ts`**

```ts
import type { AgentInput, AgentOutput, TransferAmount } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

/**
 * Stub CO2-from-invoice agent — calculates Floras transfer amount from invoice.
 * Production version would use emission factors from the Team 4 KB.
 */
export class CO2FromInvoiceStubAgent extends BaseAgent {
  readonly id = "co2-from-invoice";
  readonly name = "CO2 From Invoice (Stub)";
  readonly description = "Calculates required Floras transfer amount from invoice data";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Calculating Floras transfer amount (stub)");
    await sleep(800);

    const invoice = input.context.invoice;
    if (!invoice) {
      return { success: false, data: null, error: "No invoice in context" };
    }

    let florasCount: number;
    let breakdown: string;

    if (invoice.calculationMethod === "percentage" && invoice.percentageRate) {
      const allocationEUR = invoice.totalAmountEUR * invoice.percentageRate;
      // Assume €10/Floras (1 Floras = 1 kg CO2)
      florasCount = Math.round(allocationEUR / 10);
      breakdown = `${(invoice.percentageRate * 100).toFixed(1)}% of €${invoice.totalAmountEUR.toLocaleString()} = €${allocationEUR.toLocaleString()} → ${florasCount} Floras at €10/unit`;
    } else {
      // Detailed calculation: sum line-item CO2 estimates
      florasCount = 3500;
      breakdown = "Detailed calculation based on emission factors per line item (stub)";
    }

    const transfer: TransferAmount = {
      florasCount,
      co2Kg: florasCount,
      calculationBreakdown: breakdown,
      requiresHumanApproval: invoice.calculationMethod === "detailed",
    };

    logger.info(`Calculated ${florasCount} Floras to transfer`, { breakdown });
    return { success: true, data: { transferAmount: transfer } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**3c — `packages/orchestrator/src/agents/floras-transfer-stub.ts`**

```ts
import type { AgentInput, AgentOutput, LedgerEvent } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

/**
 * Stub transfer agent — simulates deducting from supplier account and crediting customer.
 * Production version would call the Floras ledger API.
 */
export class FlorasTransferStubAgent extends BaseAgent {
  readonly id = "floras-transfer";
  readonly name = "Floras Transfer (Stub)";
  readonly description = "Executes Floras token transfer and records ledger event";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Executing Floras transfer (stub)");
    await sleep(700);

    const { invoice, transferAmount } = input.context;
    if (!invoice || !transferAmount) {
      return { success: false, data: null, error: "Missing invoice or transferAmount in context" };
    }

    const ledgerEvent: LedgerEvent = {
      id: `ledger_${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromAccount: invoice.supplierName,
      toAccount: invoice.customerName,
      florasCount: transferAmount.florasCount,
      co2Kg: transferAmount.co2Kg,
      invoiceRef: invoice.invoiceNumber,
      runId: input.runId,
    };

    logger.info(
      `Transferred ${transferAmount.florasCount} Floras from ${invoice.supplierName} → ${invoice.customerName}`,
      { ledgerEvent },
    );

    return { success: true, data: { ledgerEvent } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 4: Export new stubs from `packages/orchestrator/src/agents/index.ts`

Open `packages/orchestrator/src/agents/index.ts` and add:

```ts
export { InvoiceParserStubAgent } from "./invoice-parser-stub";
export { CO2FromInvoiceStubAgent } from "./co2-from-invoice-stub";
export { FlorasTransferStubAgent } from "./floras-transfer-stub";
```

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 5: Extend `PipelineContext` and define `TRANSFER_PIPELINE` in `pipeline-def.ts`

**5a — Extend `PipelineContext` in `packages/shared/src/types.ts`**

Add two new optional fields to `PipelineContext` (do NOT change existing fields):

```ts
export interface PipelineContext {
  leads: Lead[];
  qualifications: Qualification[];
  estimates: CO2Estimate[];
  recommendations: ProjectRecommendation[];
  artifacts: Artifact[];
  // Transfer pipeline fields (undefined in discovery mode)
  invoice?: import("./types").InvoiceData;
  transferAmount?: import("./types").TransferAmount;
  ledgerEvents?: import("./types").LedgerEvent[];
}
```

Wait — since `InvoiceData`, `TransferAmount`, `LedgerEvent` are already in the same file
(`types.ts`), use direct references without `import()`:

```ts
export interface PipelineContext {
  leads: Lead[];
  qualifications: Qualification[];
  estimates: CO2Estimate[];
  recommendations: ProjectRecommendation[];
  artifacts: Artifact[];
  invoice?: InvoiceData;
  transferAmount?: TransferAmount;
  ledgerEvents?: LedgerEvent[];
}
```

**5b — Define `TRANSFER_PIPELINE` in `packages/orchestrator/src/pipeline-def.ts`**

Import the new types and stubs at the top of `pipeline-def.ts`:

```ts
import type {
  PipelineContext,
  PipelineStage,
  Lead,
  Qualification,
  CO2Estimate,
  ProjectRecommendation,
  Artifact,
  InvoiceData,
  TransferAmount,
  LedgerEvent,
} from "@floras/shared";
```

Then add `TRANSFER_PIPELINE` after `DEFAULT_PIPELINE`:

```ts
/** The Floras invoice-transfer pipeline (Cases 1, 2, 3) */
export const TRANSFER_PIPELINE: PipelineStep[] = [
  {
    id: "parse-invoice",
    agentId: "invoice-parser",
    stage: "parsing",
    apply: (ctx, data) => {
      const d = data as { invoice: InvoiceData };
      ctx.invoice = d.invoice;
    },
  },
  {
    id: "calculate-floras",
    agentId: "co2-from-invoice",
    stage: "calculating",
    apply: (ctx, data) => {
      const d = data as { transferAmount: TransferAmount };
      ctx.transferAmount = d.transferAmount;
    },
    // Gate required only when calculation is detailed (human must review)
    gate: {
      stage: "awaiting_approval",
      summarize: (ctx) => {
        if (!ctx.transferAmount) return "Review calculated Floras transfer amount";
        return (
          `Transfer ${ctx.transferAmount.florasCount} Floras ` +
          `(${ctx.transferAmount.co2Kg} kg CO2) — ` +
          ctx.transferAmount.calculationBreakdown
        );
      },
      rejectionReason: "Human reviewer rejected the calculated transfer amount",
    },
  },
  {
    id: "execute-transfer",
    agentId: "floras-transfer",
    stage: "transferring",
    apply: (ctx, data) => {
      const d = data as { ledgerEvent: LedgerEvent };
      ctx.ledgerEvents = [...(ctx.ledgerEvents ?? []), d.ledgerEvent];
    },
  },
];
```

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 6: Extend `PipelineEngine` to support pipeline mode selection

**6a — Register transfer agents in `engine.ts`**

In the `PipelineEngine` constructor, after the existing `builtins` registration loop
(around line 138), add registration of the transfer pipeline stubs (always use stubs
for transfer agents until LLM versions are built):

```ts
import { InvoiceParserStubAgent } from "./agents/invoice-parser-stub";
import { CO2FromInvoiceStubAgent } from "./agents/co2-from-invoice-stub";
import { FlorasTransferStubAgent } from "./agents/floras-transfer-stub";
```

Add to the imports block at the top of `engine.ts`, then in the constructor:

```ts
// Always register transfer pipeline stubs (LLM versions deferred)
const transferStubs: Array<[string, FlorasAgent]> = [
  ["invoice-parser", new InvoiceParserStubAgent()],
  ["co2-from-invoice", new CO2FromInvoiceStubAgent()],
  ["floras-transfer", new FlorasTransferStubAgent()],
];
const transferMeta: Record<string, AgentMeta> = {
  "invoice-parser": { id: "invoice-parser", stage: "parsing", reads: [], writes: ["invoice"] },
  "co2-from-invoice": { id: "co2-from-invoice", stage: "calculating", reads: ["invoice"], writes: ["transferAmount"] },
  "floras-transfer": { id: "floras-transfer", stage: "transferring", reads: ["invoice", "transferAmount"], writes: ["ledgerEvents"] },
};
for (const [id, agent] of transferStubs) {
  this.registry.register(transferMeta[id], agent);
}
```

**6b — Add transfer stages to `TRANSITIONS` in `engine.ts`**

Find `TRANSITIONS` (around line 59) and add transfer stages:

```ts
const TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  idle: ["discovering"],
  discovering: ["qualifying", "error"],
  qualifying: ["awaiting_approval", "error"],
  awaiting_approval: ["estimating", "transferring", "error"], // allow jump to transferring
  estimating: ["recommending", "error"],
  recommending: ["presenting", "error"],
  presenting: ["complete", "error"],
  // Transfer pipeline stages
  parsing: ["calculating", "error"],
  calculating: ["awaiting_approval", "transferring", "error"],
  transferring: ["confirming", "error"],
  confirming: ["complete", "error"],
  complete: [],
  error: ["idle", "discovering", "estimating", "recommending", "presenting", "parsing", "calculating"],
};
```

**6c — Update `executeRun` to choose the pipeline based on `input.mode`**

In `executeRun` (around line 391), change the pipeline selection:

```ts
// BEFORE (implicit DEFAULT_PIPELINE)
for (const step of this.pipeline) {
  // ...
}

// AFTER — select pipeline based on mode
import { TRANSFER_PIPELINE } from "./pipeline-def";

const activePipeline =
  run.input.mode === "transfer" ? TRANSFER_PIPELINE : this.pipeline;

for (const step of activePipeline) {
  // ... (unchanged body)
}
```

Also update `STAGE_ORDER` and `WORK_STAGES` to include transfer stages:

```ts
const STAGE_ORDER: PipelineStage[] = [
  "discovering",
  "qualifying",
  "awaiting_approval",
  "estimating",
  "recommending",
  "presenting",
  // Transfer stages
  "parsing",
  "calculating",
  "transferring",
  "confirming",
];

const WORK_STAGES = new Set<PipelineStage>([
  "discovering",
  "estimating",
  "recommending",
  "presenting",
  "parsing",
  "calculating",
  "transferring",
  "confirming",
]);
```

**Verify**: `pnpm --filter @floras/orchestrator exec tsc --noEmit` → exit 0

### Step 7: Add scenario selector and invoice fields to the UI

**7a — Add scenario selector to `apps/web/app/page.tsx`**

Add state for pipeline mode:

```tsx
const [pipelineMode, setPipelineMode] = useState<"discovery" | "transfer">("discovery");
const [scenario, setScenario] = useState<"b2b" | "self" | "b2c">("b2b");
```

In the "Start New Pipeline Run" card, before the prompt input, add a mode toggle:

```tsx
{/* Mode selector */}
<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
  {(["discovery", "transfer"] as const).map((mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => setPipelineMode(mode)}
      style={{
        padding: "6px 16px",
        borderRadius: 6,
        border: pipelineMode === mode ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: pipelineMode === mode ? "rgba(99,102,241,0.12)" : "transparent",
        color: pipelineMode === mode ? "var(--accent)" : "var(--text-muted)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {mode === "discovery" ? "Lead Discovery" : "Invoice Transfer"}
    </button>
  ))}
</div>

{/* Scenario selector (transfer mode only) */}
{pipelineMode === "transfer" && (
  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    {(["b2b", "self", "b2c"] as const).map((s) => {
      const labels = { b2b: "B2B (Peruvian Oil)", self: "Self-Service (Boggio)", b2c: "B2C (Danone)" };
      return (
        <button
          key={s}
          type="button"
          onClick={() => setScenario(s)}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: scenario === s ? "1px solid var(--green)" : "1px solid var(--border)",
            background: scenario === s ? "rgba(34,197,94,0.08)" : "transparent",
            color: scenario === s ? "var(--green)" : "var(--text-muted)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {labels[s]}
        </button>
      );
    })}
  </div>
)}
```

**7b — Update the prompt label based on mode**

Change the prompt input placeholder:

```tsx
placeholder={
  pipelineMode === "transfer"
    ? "Supplier name or describe the invoice context..."
    : "Describe target leads or paste a customer brief..."
}
```

**7c — Update `startRun` to include mode and scenario**

```tsx
body: JSON.stringify({ prompt, intake, mode: pipelineMode, scenario }),
```

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 8: Extend `RunInputSchema` in `packages/shared/src/schemas.ts`

Add mode and scenario to the Zod schema that validates the API body:

```ts
import { z } from "zod";

// Add to existing RunInputSchema
export const RunInputSchema = z.object({
  prompt: z.string().min(1),
  invoicePath: z.string().optional(),
  customerName: z.string().optional(),
  intake: IntakeFormSchema.optional(),
  mode: z.enum(["discovery", "transfer"]).optional().default("discovery"),
  scenario: z.enum(["b2b", "self", "b2c"]).optional().default("b2b"),
  supplierName: z.string().optional(),
});
```

Find the existing `RunInputSchema` in `packages/shared/src/schemas.ts` and add the new fields. Do not replace existing fields.

**Verify**: `pnpm --filter @floras/shared exec tsc --noEmit` → exit 0

### Step 9: Final full-build verification

```bash
pnpm build
```

Expected: exit 0, no TypeScript errors across all packages.

Then `pnpm dev` and manually:
1. Verify the mode toggle appears on the dashboard.
2. Select "Invoice Transfer" and "B2B (Peruvian Oil)".
3. Click "Run Pipeline".
4. Watch the stages: `parsing → calculating → awaiting_approval → transferring → complete`.
5. At the gate, confirm the summary shows the Floras count and calculation breakdown.
6. Click Approve. Pipeline should complete.
7. Switch back to "Lead Discovery" and confirm the original pipeline still runs correctly.

## Test plan

No automated tests exist (separate plan). Manual test:

- Discovery mode: original pipeline runs unchanged end-to-end.
- Transfer mode (b2b): stub parser creates invoice, CO2 calculator computes Floras, human gate shows calculation breakdown, transfer stub records ledger event, pipeline reaches `complete`.
- Transfer mode (self): same as b2b but note that `fromAccount === toAccount` in the ledger event.
- Transfer mode (b2c): same as b2b; the B2C scenario differentiation is in the type metadata for now (full consumer-fan-out implementation is out of scope for this plan).

## Done criteria

- [ ] `pnpm --filter @floras/shared exec tsc --noEmit` exits 0
- [ ] `pnpm --filter @floras/orchestrator exec tsc --noEmit` exits 0
- [ ] `pnpm --filter web exec tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `PipelineStage` union includes `parsing`, `calculating`, `transferring`, `confirming`
- [ ] `PipelineContext` has optional `invoice`, `transferAmount`, `ledgerEvents` fields
- [ ] Three new stub agents exist and are exported from `agents/index.ts`
- [ ] `TRANSFER_PIPELINE` is defined in `pipeline-def.ts`
- [ ] Engine chooses between `DEFAULT_PIPELINE` and `TRANSFER_PIPELINE` based on `input.mode`
- [ ] Mode toggle and scenario selector appear on the dashboard
- [ ] Discovery pipeline still works (no regression)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- Adding `parsing`/`calculating`/`transferring`/`confirming` to `PipelineStage` causes TypeScript to require exhaustive handling in switch statements you weren't asked to modify — report the specific files and let the plan author decide.
- `TRANSITIONS` conflicts with the new stages in a way that breaks the existing discovery pipeline's transitions.
- The `gate` on the `calculate-floras` step needs to be conditional (only for `detailed` calculation), but the current `GateSpec` doesn't support dynamic skipping — report this and await guidance; do not improvise a workaround.

## Maintenance notes

- The `confirming` stage (sending emails) has no agent yet — the pipeline will skip from `transferring` to `complete` directly. A `ConfirmationEmailAgent` can be added as a registry agent + step without touching this plan's work.
- The B2C scenario (Danone, 1 supplier → many consumers) eventually needs a fan-out mechanism (one invoice → N mini-transfers). That requires engine-level parallelism which is out of scope here. For now, B2C runs as a single transfer to a single customer account.
- LLM agents for invoice parsing (OCR + structured extraction) and CO2-from-invoice (emission factor KB lookup) are deferred. The stub data is realistic enough for demos. Wire them in by replacing the stub registrations with LLM agents — no pipeline-def changes needed.
- The `calculateFloras` step gate should eventually be conditional: skip the gate if `calculationMethod === "percentage"` (automated) and require it only for `detailed`. The `GateSpec` interface would need a `shouldGate: (ctx) => boolean` field.
