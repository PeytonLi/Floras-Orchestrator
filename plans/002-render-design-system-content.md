# Plan 002: Render DesignSystem Generated Content in the UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving to the next step. If anything in the
> "STOP conditions" section occurs, stop and report — do not improvise.
> When done, update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a3a4d2f..HEAD -- apps/web/app/components/ResultsPanel.tsx packages/orchestrator/src/agents/design-system.ts`
> If either file changed since this plan was written, compare the "Current state"
> excerpts before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / ux
- **Planned at**: commit `a3a4d2f`, 2026-06-23

## Why this matters

When LLM mode is enabled, `DesignSystemAgent.execute()` calls `super.execute()` (the LLM), validates the response against `DesignSystemOutputSchema`, wraps the content into `Artifact` records, and returns:

```ts
{ success: true, data: { artifacts: Artifact[], content: { presentation, emailTemplate, onePager } } }
```

The `content` field holds the full generated text: slide titles and bullets, email subject/body/CTA, one-pager headline/metrics/narrative. After the pipeline step completes, `engine.ts` stores `result.data` verbatim into `run.agents["design-system"].output`.

But `ResultsPanel.tsx` casts that output as `{ artifacts?: Artifact[] }` and only reads the artifact filenames. The `content` field is silently ignored. Users see:

> ✓ Floras_Proposal_Nestlé.pptx (presentation)

…but never the actual slides or email copy. This makes the most valuable pipeline output invisible.

## Current state

### File roles

- `packages/orchestrator/src/agents/design-system.ts` — LLM agent; returns `{ artifacts, content }` at line 122
- `packages/orchestrator/src/agents/design-system-stub.ts` — stub agent; returns `{ artifacts }` only (no content)
- `apps/web/app/components/ResultsPanel.tsx` — renders pipeline results; only reads `artifacts`

### What the LLM agent returns (`design-system.ts:82-122`)

```ts
// data from LLM (after Zod validation) is: { presentation, emailTemplate, onePager }
return { success: true, data: { artifacts, content: data } };
// → data = { artifacts: Artifact[], content: { presentation, emailTemplate, onePager } }
```

The `content` shape (from `DesignSystemOutputSchema` in `packages/orchestrator/src/agents/schemas.ts:73-98`):

```ts
{
  presentation: {
    titleSlide: string,
    sections: Array<{ heading: string, bullets: string[] }>
  },
  emailTemplate: {
    subject: string,
    body: string,
    callToAction: string
  },
  onePager: {
    headline: string,
    keyMetrics: Array<{ label: string, value: string }>,
    narrative: string
  }
}
```

### Current ResultsPanel cast (ResultsPanel.tsx:24-33)

```tsx
const designData = run.agents["design-system"]?.output as {
  artifacts?: Artifact[];
} | null;
// ...
const artifacts = designData?.artifacts ?? [];
```

Only `artifacts` is used. `content` is never read.

### CSS variables in `apps/web/app/globals.css` (for styling the new section)

```css
--bg: #0a0a0f;
--bg-card: #12121a;
--border: #2a2a3a;
--text: #e8e8f0;
--text-secondary: #9898b0;
--text-muted: #5a5a70;
--accent: #6366f1;
--green: #22c55e;
--mono: "SF Mono", "Cascadia Code", "Fira Code", monospace;
```

Match the inline style pattern used elsewhere in `ResultsPanel.tsx` — no new CSS classes.

## Commands you will need

| Purpose       | Command                           | Expected on success     |
|---------------|-----------------------------------|-------------------------|
| Typecheck web | `pnpm --filter web exec tsc --noEmit` | exit 0, no errors   |
| Build         | `pnpm build`                      | exit 0                  |
| Dev           | `pnpm dev`                        | server starts at :3000  |

## Scope

**In scope** (the only file you should modify):

- `apps/web/app/components/ResultsPanel.tsx`

**Out of scope** (do NOT touch):

- `packages/orchestrator/src/agents/design-system.ts` — already returns the right data
- `packages/orchestrator/src/agents/design-system-stub.ts` — stubs don't generate content; the empty-content case must be handled gracefully in the UI
- `packages/shared/src/types.ts` — no type changes needed
- `packages/orchestrator/src/agents/schemas.ts` — schema is correct

## Git workflow

- Branch: `advisor/002-design-system-content`
- Commit message: `feat(web): render design system content in ResultsPanel`
- Do NOT push or open a PR unless explicitly asked

## Steps

### Step 1: Extend the `designData` cast in `ResultsPanel.tsx`

The type of `run.agents["design-system"]?.output` is `unknown` (defined in `AgentState`).

Replace the existing cast (around lines 24-26) with one that includes the `content` field:

```tsx
// BEFORE
const designData = run.agents["design-system"]?.output as {
  artifacts?: Artifact[];
} | null;

// AFTER
type DesignContent = {
  presentation?: {
    titleSlide: string;
    sections: Array<{ heading: string; bullets: string[] }>;
  };
  emailTemplate?: {
    subject: string;
    body: string;
    callToAction: string;
  };
  onePager?: {
    headline: string;
    keyMetrics: Array<{ label: string; value: string }>;
    narrative: string;
  };
};

const designData = run.agents["design-system"]?.output as {
  artifacts?: Artifact[];
  content?: DesignContent;
} | null;
```

Add the `type DesignContent = ...` declaration at the top of the component, before the function body, right after the existing `interface ResultsPanelProps` declaration.

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 2: Extract the content from `designData`

After the existing `const artifacts = designData?.artifacts ?? [];` line (around line 33), add:

```tsx
const designContent = designData?.content ?? null;
```

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 3: Add a "Generated Content" section to the JSX

In `ResultsPanel.tsx`, after the `{/* Generated Artifacts */}` block (around line 136), add a new section that renders the content. This section should only render when `designContent` is non-null.

The section uses the same inline style conventions as the rest of `ResultsPanel.tsx` — `background: "var(--bg-card)"`, `border: "1px solid var(--border)"`, etc. Use expand/collapse state for each sub-section to avoid overwhelming the UI.

Add a `useState` for expand state at the top of the component:

```tsx
const [expanded, setExpanded] = useState<{ pres: boolean; email: boolean; onepager: boolean }>({
  pres: false,
  email: false,
  onepager: false,
});
```

Then add this JSX block after the artifacts block:

```tsx
{designContent && (
  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Generated Content</div>

    {/* Presentation */}
    {designContent.presentation && (
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setExpanded((e) => ({ ...e, pres: !e.pres }))}
          style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 4 }}
        >
          {expanded.pres ? "▾" : "▸"} Presentation — {designContent.presentation.titleSlide}
        </button>
        {expanded.pres && (
          <div style={{ marginLeft: 16, marginTop: 8 }}>
            {designContent.presentation.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{s.heading}</div>
                <ul style={{ marginLeft: 16, marginTop: 4 }}>
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Email */}
    {designContent.emailTemplate && (
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setExpanded((e) => ({ ...e, email: !e.email }))}
          style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 4 }}
        >
          {expanded.email ? "▾" : "▸"} Email — {designContent.emailTemplate.subject}
        </button>
        {expanded.email && (
          <div style={{ marginLeft: 16, marginTop: 8, padding: 12, background: "var(--bg)", borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Subject: <span style={{ color: "var(--text)" }}>{designContent.emailTemplate.subject}</span></div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginBottom: 8 }}>{designContent.emailTemplate.body}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--green)" }}>{designContent.emailTemplate.callToAction}</div>
          </div>
        )}
      </div>
    )}

    {/* One-Pager */}
    {designContent.onePager && (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((e) => ({ ...e, onepager: !e.onepager }))}
          style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 4 }}
        >
          {expanded.onepager ? "▾" : "▸"} One-Pager — {designContent.onePager.headline}
        </button>
        {expanded.onepager && (
          <div style={{ marginLeft: 16, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              {designContent.onePager.keyMetrics.map((m, i) => (
                <div key={i} style={{ padding: "6px 12px", background: "var(--bg)", borderRadius: 6, fontSize: 11 }}>
                  <div style={{ color: "var(--text-muted)" }}>{m.label}</div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{designContent.onePager.narrative}</div>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 4: Final build check

```
pnpm build
```

Expected: exit 0.

## Test plan

Manual test (no automated tests exist yet):

1. `pnpm dev`
2. Load the demo: click "Load Demo" on the dashboard (or start a real run with LLM enabled).
3. Navigate to the results section.
4. The "Generated Content" section should appear (it only shows when `designContent` is non-null; with stub agents it will NOT appear since stubs return `{ artifacts }` without `content` — this is correct behavior).
5. With LLM enabled: start a real run; after "presenting" stage completes, click the ▸ toggles to expand each section and verify the slide, email, and one-pager content renders.
6. Confirm the "Generated Assets" section (filenames) still renders above the new section.

## Done criteria

- [ ] `pnpm --filter web exec tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `ResultsPanel.tsx` casts `designData` to include `content?: DesignContent`
- [ ] A "Generated Content" section renders in the UI when `designContent` is non-null
- [ ] Each of the 3 sub-sections (presentation, email, one-pager) is collapsible
- [ ] Stub-mode runs (no `content` field) render no "Generated Content" section — no crash
- [ ] Only `ResultsPanel.tsx` is modified (`git diff --name-only`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- `DesignSystemOutputSchema` has changed from the "Current state" shape — the `DesignContent` type must match.
- `run.agents["design-system"].output` has a different shape than documented (e.g., the `content` key was renamed).
- TypeScript emits errors on the new JSX that can't be fixed without touching out-of-scope files.

## Maintenance notes

- If the `DesignSystemOutputSchema` gains new fields (e.g., a `socialPost`), add a new collapsible block following the same pattern.
- The stub agent intentionally does not return `content` (it only produces filenames). If you want stubs to show content too, add a hardcoded `content` field to `DesignSystemStubAgent.execute()` — that's a separate change, not part of this plan.
- This plan only handles the view side. If you want content to be downloadable (e.g., copy email to clipboard), that's a follow-up.
