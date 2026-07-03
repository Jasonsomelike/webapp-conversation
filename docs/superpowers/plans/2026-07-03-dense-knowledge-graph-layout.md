# Dense Knowledge Graph Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep all graph nodes visible while reducing overlap on desktop and mobile without replacing the existing canvas or GSAP animation.

**Architecture:** Improve only the graph layout data produced for the existing SVG/canvas-like React graph. Parent nodes stay in the inner ring; dense child/leaf nodes are distributed into parent-owned angular sectors with multiple tracks and dynamic radius. The React graph keeps its current drag/zoom and GSAP-based reveal/highlight behavior.

**Tech Stack:** Next.js 15, React, TypeScript, existing graph SVG renderer, existing GSAP animation hooks.

---

### Task 1: Inspect current graph layout

**Files:**
- Read: `lib/hierarchical-graph.ts`
- Read: `lib/textbook-graph.ts`
- Read: `app/components/graph/knowledge-graph-view.tsx`

- [ ] Verify where node x/y are generated.
- [ ] Identify whether review graph and personal graph share the same layout path.
- [ ] Confirm no changes are needed to GSAP animation code.

### Task 2: Implement sector/track layout for dense hierarchical graphs

**Files:**
- Modify: `lib/hierarchical-graph.ts`
- Modify if needed: `lib/textbook-graph.ts`

- [ ] Preserve center node at 50/50.
- [ ] Place first-level children in a stable inner ring.
- [ ] For each first-level child, assign descendant leaves to that child’s angular sector.
- [ ] Split large sibling groups across multiple tracks so labels do not stack in a single ring.
- [ ] Increase graph virtual bounds/radius for dense slices while keeping coordinates within existing percent-based renderer.

### Task 3: Tune initial zoom and mobile density

**Files:**
- Modify: `app/components/graph/knowledge-graph-view.tsx`

- [ ] For dense graphs, reduce initial zoom more aggressively.
- [ ] Keep drag, pinch/zoom, node detail, and double-tap drilldown behavior unchanged.
- [ ] Do not change GSAP animation APIs or visual timing.

### Task 4: Verify

**Commands:**
- `tsc --noEmit`
- targeted ESLint on graph files

- [ ] Typecheck passes.
- [ ] ESLint passes.
- [ ] Deploy if code verifies.
