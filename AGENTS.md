# Floras Agents Guide

## Project purpose

This repository contains the shared Markdown knowledge base and OpenCode context setup for Floras.

At the current project phase, this repo is the starting source of truth for Floras product context, architecture notes, development workflow, and agent guidance. If stable application repositories exist later, this repo should continue to hold shared context and route contributors to implementation truth where needed.

## Required workflow

1. Start with `kb/00-index.md`.
2. Identify whether the task is KB-first work in this repo or code-backed work in a linked application repository.
3. Identify the relevant domain area and KB files before editing.
4. If task-relevant source code or runtime artifacts exist, inspect them before changing behavior docs or implementation.
5. If no task-relevant source code exists yet, rely on recorded evidence in this repo and document uncertainty explicitly.
6. Prefer small, testable, reversible changes.
7. Do not introduce new frameworks, dependencies, services, schema changes, API changes, or auth changes without a clear need.
8. If code and KB conflict in a linked application repo, treat current runtime behavior as authoritative for that repo and mark the KB as stale.
9. Record evidence sources, assumptions, and open questions instead of inventing facts.

## Verification checklist

- Relevant KB files were identified via `kb/00-index.md`.
- The task mode was identified: KB-first, code-backed, spec-writing, or mixed.
- Evidence sources were cited or explicitly noted as missing.
- Existing source code and nearby files were inspected before editing when such code was relevant and available.
- Existing source material (in `kb/09-source-material/`) was checked for relevant context when the task involves spec writing or domain definition.
- The change is scoped to the smallest safe unit.
- Tests, checks, documentation review, or manual verification were run or explicitly noted, depending on task type.
- Relevant KB files were updated when behavior, workflow, or decisions changed.
- For spec-writing tasks, the output spec uses confidence labels and references KB sources.
- Any KB/code mismatch was called out as stale documentation.
