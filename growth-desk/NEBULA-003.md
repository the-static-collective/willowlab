# Mission Control 003 — MOTIF / JARVIS / Nebula boundary

**Status: fully offline, local-source helper in WillowLab PR #6; not a native MOTIF execution, JARVIS agent, live Nebula integration, Colton approval, or business automation deployment.**

## What the new interface does

The existing Partner Sprint at `/growth-desk/sprint.html` now has **05 / MOTIF × JARVIS × Nebula**:

1. **Mission briefing** refreshes automatically after local research state changes. It orders a small next-action queue using the existing Sprint statuses and dates: reported follow-up due, shortlisted for owner review, source still to check, later follow-up, hold or closed.
2. **Reasoning receipt** for a selected business uses the genuine MOTIF *methodology* (`OBSERVE → HYPOTHESIZE → PROBE → REVISE → PLAN → VERIFY`, Explorer/Skeptic/Architect/Historian/Governor roles). It names rival possibilities, the source and a falsifier, but never claims the native `motif` Python solver ran.
3. **Prepare Nebula packet** produces `willowlab.nebula-handoff/v1` for the selected organization or at most five priority candidates. Source observations, unresolved questions, declared source revisions, scope and no-effect permissions travel together.
4. **Copy review prompt** gives a safe, source-linked script for a human to paste into the appropriate owner-governed Nebula/ChatGPT builder conversation. **Export packet JSON** creates a local file for the same purpose. Neither sends or syncs it.
5. **Inspect manually returned Nebula note** accepts only `willowlab.nebula-review-return/v1` in the same local session, matching the current source revision and handoff fingerprint. Incoming text is checked and rendered as unverified notes. It **cannot promote** a candidate to partner, create a WMS action, publish a plan, or claim real owner authorization.

The prompt includes a proposed JSON response **shape** with `NEEDS_SOURCE_CHECK`, `NEEDS_OWNER_DECISION` or `NO_ACTION` and three required `false` effect claims. It is a format template, not proof of who returned it.

## Nebula is not a separate CRM

Colton's current WMS documentation identifies **Nebula as builder/coordination/documentation operator**, responsible for reconciling exact WMS source documents, owner decisions, interface contracts, test evidence and custody. WMS Connect coordinates the actual five-app architecture; **runtime cross-app sync is separate work**. The single working User Action List and builder engineering queue are authoritative; do not create parallel owner queues or replace the WMS Master.

A real authenticated Nebula inbox would require the owner's explicit decision on an identity and permission service, a Connect-owned schema, durable signed/verified commands, source-revision conflict handling, actual provider access, owner-task governance and acceptance tests. It cannot be accomplished by pointing a public static page at a private Google Doc or ChatGPT conversation.

## Source truth, controls and what is not automatic

- The browser uses public-business research that the operator entered or selected, with citations to the source website and manually recorded source date. It does not browse live pages and cannot establish current external information without human verification.
- Ranking is a **deterministic rule-based queue**, not AI inference or a native MOTIF benchmark. A suggested action is a question for human review.
- A copied prompt or downloaded JSON is **unsent**. A manual return note is **unverified**; there is no cryptographic proof of Nebula, Colton or any authorized operator.
- No customer records, contacts, recipients, provider credentials, WMS grants, emails, phone calls or recurring automations pass through this experiment.
- Reject altered return packets, mismatched source revisions, forged approval flags, contact-like content and stale research packet IDs. All success claims are limited to synthetic tests and preview behavior.
- Each source record can generate an informational receipt. Current statuses remain unapproved until reviewed through Colton's actual WMS processes.

## Three-minute exercise

1. Load four starter businesses and select one.
2. Open the source and record a local SHORTLIST/HOLD/DECLINE reason if helpful.
3. Under **Mission Control**, click **Brief me on next moves**, then **Show selected reasoning receipt**.
4. Under **Nebula handoff**, choose **Current selected business** and click **Prepare Nebula packet**. Copy the prompt into a separate authorized builder conversation, or download the JSON for owner review.
5. Nebula/human reviewer reads its own **current** WMS Master, Builder Coordination, Shared C-06/C-10/C-12 contracts, Source Register and one User Action List. It may produce a return JSON matching the template, but no email or WMS write is authorized by this exported prompt.
6. Back on the same browser board/revision, use **Inspect a manually returned Nebula JSON note**. See the unverified question. No application state or WMS decision is changed.

## Private reviewer adapter

The corresponding **private, unmerged** WillowConnect `experiments/growth-001/nebula-bridge.mjs` validates both a `willowlab.partner-sprint-export/v1` and the associated `willowlab.nebula-handoff/v1`. It reconciles source IDs, URLs, observations, hypotheses, local review, follow-up status and revisions into a read-only `wms.nebula-review-draft/v1`. It may produce a return **template** but cannot write any owning WMS document. It requires both files for its pure local verifier and is not deployed as a WMS endpoint.

## Developer verification

```sh
node --check growth-desk/mission.mjs
node --check growth-desk/sprint-app.mjs
node --test growth-desk/tests/mission.test.mjs
node --test growth-desk/tests/sprint.test.mjs
```

The GitHub CI suite includes a Chromium browser flow through the Sprint board and manually returned Nebula note, plus separate WMS private adapter tests. These are test runs, not runtime authorization or a shared authenticated connection.
