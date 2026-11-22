# STATIC WORKBENCH 001 — standalone experiment

This folder is a **fictional, browser-only prototype** inspired by the evidence and handoff patterns observed in Willowlab's Clean Plan Card, MEMENTO and MOTIF. It is **not** part of Colton's Willow management system, not a production Static Collective OS, and not authorization to operate any project.

## Why this exists

Willowlab already demonstrates a narrow, source-scoped workflow with revision controls, idempotency and role-specific information views. This experiment asks whether those same principles can give *multiple independent creative projects* lightweight homes and durable workbench contracts without requiring a giant centralized project manager.

The six common modules are Home (purpose), Frontier (questions), Work (builder tasks), Proof (evidence), Decisions (human gates), Return (re-entry packet). Optional module labels currently include radio, events, and research. Modules are **configuration labels**, not implemented external service integrations.

## Try

Open /workbench/ from the site's root, or serve the repository with:
 
    python3 -m http.server 8000

Then visit http://localhost:8000/workbench/

The demo starts with three **fictional** homes. You can add another home, add work, select a work item, and simulate status transitions. Every action receives a local revision and receipt. Reloading resets everything; nothing is written to a database or transmitted. No account sign-in or real identity checks exist.

    node --test workbench/tests/core.test.mjs

## Authority boundaries

- "owner", "builder", "tester", and "designer" are **simulated labels selected by UI code**, not authenticated actors.
- The workbench's approval and availability buttons change **local demo state only**. They do not deploy, approve, publish, or release anything.
- Testing a model is not proof of browser accessibility or mobile acceptance.
- Do not store private source, customer information, keys, or unapproved business records here.
- No runtime imports from Willow Connect, HUMKIN or FELLOWSHIP exist.
- Willowlab's existing / and /clean-plan/ routes are not changed by this experiment.
- The site remains public to anyone with its URL. Noindex does not secure data.

## Later candidate seams (not implemented)

1. Project-owned typed manifest, reviewed source references and local export/import.
2. Adapter that **reads** an external project queue into a non-authoritative UI, behind project-specific permissions.
3. MEMENTO handoff/trace format and MOTIF reason-case exporter, with explicit local owner admission.
4. Production-grade authenticated reviewer roles and durable receipts, only after separate design, security, and consent review.

## Verification and rollback

One fully offline ES module implements state transitions, exact command-id replay, revision checks, gated evidence and per-home handoffs. Node tests cover these behaviors; production authority and browser UX are not implied. Delete the /workbench/ folder or decline to merge its PR to remove the experiment without affecting Willow's existing preview.
