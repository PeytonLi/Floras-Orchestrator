# Plan 005: Scaffold packages/ui as a Real Shared Component Library

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving to the next step. If anything in the
> "STOP conditions" section occurs, stop and report — do not improvise.
> When done, update `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat a3a4d2f..HEAD -- packages/ui/src/index.ts apps/web/app/components`
> If these files changed, compare "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW — additive only; existing inline styles remain as-is until components are adopted
- **Depends on**: none
- **Category**: direction / ux
- **Planned at**: commit `a3a4d2f`, 2026-06-23

## Why this matters

Three problems with the current UI implementation:

1. **`packages/ui` is empty.** It exports nothing. The comment in `index.ts` says "UI components are in apps/web/app/components for now." This is fine for one app, but Floras Orchestrator is part of a multi-team project. Emma's design system work (mentioned in the project feedback) cannot integrate with this repo until there's a real shared package to publish to.

2. **All 6 UI components use inline styles** with hardcoded numbers. When a spacing value changes or a new semantic color is needed, every component must be updated individually. The CSS variables in `globals.css` provide a token layer, but they're accessed inconsistently (some components hardcode `rgba(99,102,241,0.12)`, others use `var(--accent)`).

3. **No design system integration story.** The user feedback explicitly calls out: "pay attention to design and UX — it needs to be likeable." A design system token layer in `packages/ui` is the right foundation, whether Emma's system or a future one is adopted.

This plan scaffolds `packages/ui` with 5 foundational components (Card, Badge, Button, StatusBadge, Section) that `apps/web` can adopt incrementally. It does NOT require replacing all existing inline styles — it establishes the pattern.

## Current state

### `packages/ui/src/index.ts` (the entire file)

```ts
// UI components are in apps/web/app/components for now
// This package can be used for shared components across future apps
export {};
```

### `packages/ui/package.json`

```json
{
  "name": "@floras/ui",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

The package has no dependencies declared.

### CSS variables available in `apps/web/app/globals.css`

```css
--bg: #0a0a0f;
--bg-card: #12121a;
--border: #2a2a3a;
--text: #e8e8f0;
--text-secondary: #9898b0;
--text-muted: #5a5a70;
--accent: #6366f1;
--green: #22c55e;
--yellow: #fbbf24;
--red: #ef4444;
--mono: "SF Mono", "Cascadia Code", "Fira Code", monospace;
```

### Representative inline style in `ResultsPanel.tsx:48-55`

```tsx
<div
  key={lead.id}
  style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 16,
  }}
>
```

This "card" pattern appears in every component.

### Monorepo workspace config (`pnpm-workspace.yaml`)

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`@floras/ui` is already in the workspace — it just needs content.

### TypeScript base config (`tsconfig.base.json`)

Used as `"extends": "../../tsconfig.base.json"` by `packages/ui/tsconfig.json`.
Match the compiler settings (strict mode, `module: "commonjs"` or ESNext — check existing tsconfig.json files to confirm).

## Commands you will need

| Purpose                | Command                                          | Expected         |
|------------------------|--------------------------------------------------|------------------|
| Typecheck ui package   | `pnpm --filter @floras/ui exec tsc --noEmit`     | exit 0           |
| Typecheck web          | `pnpm --filter web exec tsc --noEmit`            | exit 0           |
| Full build             | `pnpm build`                                     | exit 0           |
| Dev                    | `pnpm dev`                                       | starts at :3000  |

## Scope

**In scope** (files to create or modify):

- `packages/ui/src/index.ts` — replace empty export with real components
- `packages/ui/src/tokens.ts` — CSS variable names as typed constants
- `packages/ui/src/components/Card.tsx` — new file
- `packages/ui/src/components/Badge.tsx` — new file
- `packages/ui/src/components/Button.tsx` — new file
- `packages/ui/src/components/StatusBadge.tsx` — new file
- `packages/ui/src/components/Section.tsx` — new file
- `packages/ui/package.json` — add `react` and `react-dom` peer deps
- `packages/ui/tsconfig.json` — update if needed for JSX
- `apps/web/app/components/ResultsPanel.tsx` — adopt Card and Badge from `@floras/ui` as a proof of concept

**Out of scope** (do NOT touch):

- Other web app components (AgentCards, PipelineView, LogStream, etc.) — adopt incrementally later
- `globals.css` — CSS variables remain the source of truth
- `apps/web/package.json` — `@floras/ui` is already a workspace dependency (check; add if not present)

**STOP if** adopting the components in `ResultsPanel.tsx` requires modifying
any component other than `ResultsPanel.tsx`.

## Git workflow

- Branch: `advisor/005-packages-ui`
- Commit message: `feat(ui): scaffold shared component library with Card, Badge, Button`
- Do NOT push or open a PR unless explicitly asked

---

## Steps

### Step 1: Check `packages/ui/tsconfig.json` and add JSX support if missing

Read `packages/ui/tsconfig.json`. It probably extends `../../tsconfig.base.json`.
Confirm it includes `"jsx": "react-jsx"` (or `"preserve"` for Next.js). If it extends
the base config, verify the base config has JSX support. If not, add to
`packages/ui/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Verify**: `pnpm --filter @floras/ui exec tsc --noEmit` → exit 0 (or errors only about missing `index.ts` content, which is fine — we'll fix that)

### Step 2: Update `packages/ui/package.json` with peer deps and React imports

Replace with:

```json
{
  "name": "@floras/ui",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

Note: using `"main": "./src/index.ts"` so `apps/web` (which uses TypeScript) can import
from source directly within the monorepo without a separate build step. This matches how
`@floras/shared` and `@floras/orchestrator` work (check their `package.json` to confirm
— if they point to `dist/`, update to match their pattern instead).

**Verify**: `ls packages/ui/package.json` → file exists with updated content

### Step 3: Create `packages/ui/src/tokens.ts`

This file makes the CSS variable names type-safe. Components import from here instead of hardcoding strings.

```ts
/** Maps semantic names to CSS variable references.
 * Values must match the variables in apps/web/app/globals.css */
export const tokens = {
  color: {
    bg: "var(--bg)" as const,
    bgCard: "var(--bg-card)" as const,
    border: "var(--border)" as const,
    text: "var(--text)" as const,
    textSecondary: "var(--text-secondary)" as const,
    textMuted: "var(--text-muted)" as const,
    accent: "var(--accent)" as const,
    green: "var(--green)" as const,
    yellow: "var(--yellow)" as const,
    red: "var(--red)" as const,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  font: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 18,
    xxl: 22,
  },
} as const;
```

**Verify**: `pnpm --filter @floras/ui exec tsc --noEmit` → exit 0

### Step 4: Create `packages/ui/src/components/Card.tsx`

```tsx
import React from "react";
import { tokens } from "../tokens";

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}

export function Card({ children, padding = tokens.space.lg, style }: CardProps) {
  return (
    <div
      style={{
        background: tokens.color.bgCard,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.lg,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

### Step 5: Create `packages/ui/src/components/Badge.tsx`

```tsx
import React from "react";
import { tokens } from "../tokens";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "accent";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: `rgba(152,152,176,0.12)`,
    color: tokens.color.textSecondary,
    border: `1px solid ${tokens.color.border}`,
  },
  success: {
    background: `rgba(34,197,94,0.12)`,
    color: tokens.color.green,
    border: `1px solid ${tokens.color.green}`,
  },
  warning: {
    background: `rgba(251,191,36,0.12)`,
    color: tokens.color.yellow,
    border: `1px solid ${tokens.color.yellow}`,
  },
  error: {
    background: `rgba(239,68,68,0.12)`,
    color: tokens.color.red,
    border: `1px solid ${tokens.color.red}`,
  },
  accent: {
    background: `rgba(99,102,241,0.12)`,
    color: tokens.color.accent,
    border: `1px solid ${tokens.color.accent}`,
  },
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${tokens.space.xs}px ${tokens.space.md}px`,
        borderRadius: 20,
        fontSize: tokens.font.sm,
        fontWeight: 700,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
```

### Step 6: Create `packages/ui/src/components/Button.tsx`

```tsx
import React from "react";
import { tokens } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: `${tokens.space.xs}px ${tokens.space.md}px`, fontSize: tokens.font.xs },
  md: { padding: `${tokens.space.sm}px ${tokens.space.lg}px`, fontSize: tokens.font.md },
  lg: { padding: `10px ${tokens.space.xl}px`, fontSize: tokens.font.md },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: tokens.color.accent,
    color: "#fff",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: tokens.color.text,
    border: `1px solid ${tokens.color.border}`,
  },
  ghost: {
    background: "transparent",
    color: tokens.color.accent,
    border: "none",
  },
  danger: {
    background: "rgba(239,68,68,0.12)",
    color: tokens.color.red,
    border: `1px solid ${tokens.color.red}`,
  },
};

export function Button({ variant = "primary", size = "md", style, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        borderRadius: tokens.radius.md,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap" as const,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
```

### Step 7: Create `packages/ui/src/components/StatusBadge.tsx`

Used for pipeline stage display throughout the dashboard.

```tsx
import React from "react";
import type { BadgeVariant } from "./Badge";
import { Badge } from "./Badge";

export type StageStatus = "running" | "complete" | "error" | "idle";

const statusVariantMap: Record<StageStatus, BadgeVariant> = {
  running: "accent",
  complete: "success",
  error: "error",
  idle: "default",
};

export interface StatusBadgeProps {
  status: StageStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {label ?? status.toUpperCase()}
    </Badge>
  );
}
```

### Step 8: Create `packages/ui/src/components/Section.tsx`

```tsx
import React from "react";
import { tokens } from "../tokens";

export interface SectionProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: tokens.space.sm,
        }}
      >
        <div>
          <div style={{ fontSize: tokens.font.md, fontWeight: 600, color: tokens.color.text }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: tokens.font.xs, color: tokens.color.textMuted, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
```

**Verify after all components**: `pnpm --filter @floras/ui exec tsc --noEmit` → exit 0

### Step 9: Update `packages/ui/src/index.ts` to export everything

```ts
export { Card } from "./components/Card";
export type { CardProps } from "./components/Card";

export { Badge } from "./components/Badge";
export type { BadgeProps, BadgeVariant } from "./components/Badge";

export { Button } from "./components/Button";
export type { ButtonProps, ButtonVariant } from "./components/Button";

export { StatusBadge } from "./components/StatusBadge";
export type { StatusBadgeProps, StageStatus } from "./components/StatusBadge";

export { Section } from "./components/Section";
export type { SectionProps } from "./components/Section";

export { tokens } from "./tokens";
```

**Verify**: `pnpm --filter @floras/ui exec tsc --noEmit` → exit 0

### Step 10: Adopt `Card` and `Badge` in `ResultsPanel.tsx` as a proof of concept

Check that `apps/web/package.json` lists `@floras/ui` as a dependency. If not, add:
`"@floras/ui": "workspace:*"` to the `dependencies` block.

Then in `ResultsPanel.tsx`, replace the per-lead card container (the outermost `div` for each lead, around line 48-56) with the `Card` component:

```tsx
// Add import at top
import { Card, Badge } from "@floras/ui";

// Replace per-lead container
<Card key={lead.id}>
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.companyName}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{lead.sector} — {lead.source}</div>
    </div>
    {qual && (
      <Badge
        variant={qual.score >= 80 ? "success" : qual.score >= 60 ? "warning" : "error"}
      >
        {qual.score}
      </Badge>
    )}
  </div>
  {/* ... rest of lead content unchanged ... */}
</Card>
```

Also replace the artifacts container and the "Generated Assets" header section with `Card` and `Section`.

**Verify**: `pnpm --filter web exec tsc --noEmit` → exit 0

### Step 11: Final build

```bash
pnpm build
```

Expected: exit 0. Then `pnpm dev` and verify `ResultsPanel` renders the same visually.

## Test plan

Manual verification:

1. `pnpm dev`
2. Load the demo run.
3. Scroll to the Pipeline Results section.
4. Confirm cards render correctly (same visual appearance as before, now via `Card` component).
5. Confirm qualification scores render with correct color coding via `Badge` component.
6. `pnpm --filter @floras/ui exec tsc --noEmit` → exit 0.

## Done criteria

- [ ] `pnpm --filter @floras/ui exec tsc --noEmit` exits 0
- [ ] `pnpm --filter web exec tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `packages/ui/src/index.ts` exports Card, Badge, Button, StatusBadge, Section, tokens
- [ ] `apps/web/app/components/ResultsPanel.tsx` imports Card and Badge from `@floras/ui`
- [ ] Visual appearance of ResultsPanel is unchanged (confirmed via dev server)
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- The `packages/ui/tsconfig.json` base config conflicts with JSX (the base config may use `"module": "commonjs"` which is fine, but it must include `"jsx"` support — check `tsconfig.base.json` first).
- `@floras/ui` is not resolvable in `apps/web` even after adding it to `apps/web/package.json` — this usually means the workspace link needs `pnpm install` to be re-run.
- The inline styles in `ResultsPanel.tsx` use CSS variables in a way the `Card` component can't accept (they can — `style` prop is a passthrough; but STOP if you find a case that requires changing more than the two adoption points in Step 10).

## Maintenance notes

- This plan establishes the pattern. Teams should continue adopting `Card`, `Badge`, `Button` incrementally across other components (AgentCards, PipelineView, ApprovalDialog).
- When Emma's design system tokens become available, update `packages/ui/src/tokens.ts` to map to her token names instead of the local CSS variables. The component APIs stay stable.
- If the monorepo adds a second `apps/` entry (e.g., a mobile app or a customer portal), it can import from `@floras/ui` directly — no code duplication.
- `StatusBadge` maps stage status to `BadgeVariant`. When new agent statuses are added (e.g., `"queued"`), update `statusVariantMap` in `StatusBadge.tsx`.
