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


## MEMENTO read-only aperture (first cross-project seam)

The MEMENTO panel imports two **real, currently documented source contract types**, but only from a JSON file selected explicitly in the user's own browser:

- \`memento.context-pack/v0\`, emitted by MEMENTO's \`scripts/compile-context-pack.mjs\`.
- \`memento.return-ticket/v1\`, following the MEMENTO Return Engine's Return Ticket contract.

Neither format is a MEMENTO ledger admission. \`admission: "none"\` is mandatory at the artifact level and on every retrieved world and edge. An edge's original \`status: admitted\` means only that the **source MEMENTO** has that status; the workbench always treats it as retrieved testimony, not local authority.

To generate a context pack **on your own local checkout of MEMENTO**:

    node scripts/compile-context-pack.mjs --world YOUR_WORLD_ID --depth 1 > memento-context.json

Then open a local Willowlab preview and use **MEMENTO → Local MEMENTO JSON** to select that file. The import parser has no \`fetch\`, remote API, cookies, or storage; it reads a file in memory, caps imports at 256 KiB, validates shape and authority, and displays a bounded context preview. Changing home clears the imported context. Reloading clears it too.

An explicit **Capture a demo question** click creates only an ordinary \`CAPTURED\` work item in the currently selected local, fictional home. The item title includes a small source cue so subsequent demo handoff packets may contain that cue. **Do not capture content you would not want to copy into a later handoff.** No automatic promotion or evidence attachment occurs.

### Privacy and security notes

- The existing Willowlab site is a **public static prototype**; it offers no authenticated role enforcement. Use \`localhost\` for private MEMENTO material, and do not treat a hosted preview as confidential merely because this JavaScript implementation does not send the imported artifact.
- Never push genuine MEMENTO context packs, private source text, credentials, or local export files to this public repository.
- A successful parse verifies only the artifact's supported **structure and declared statuses**. It does not prove original GitHub revision, source authenticity, causal truth, author approval, or native MEMENTO execution.
- Source status, retrieval, local work capture, owner decision, and actual admission remain distinct.
- No direct GitHub connector, server-to-server MEMENTO authorization, sync engine, or MEMENTO ledger mutation is implemented.

### Provenance checked for adapter design

- Private MEMENTO \`main\`: \`docs/architecture.md\`, \`scripts/compile-context-pack.mjs\`, \`scripts/lib/historical-imaginations.mjs\`, read by an authorized builder. Private source contents were **not** copied into this public repo.
- The \`memento.return-ticket/v1\` contract was read using the installed MEMENTO Return Engine skill. Tests use fabricated specimens only.
- Tests: \`node --test workbench/tests/memento.test.mjs\`.

Next candidate is a **source-pinned, read-only repo handoff** that checks a user-approved MEMENTO Git commit/reference behind appropriately scoped authorization. Do not create a public endpoint for the private MEMENTO repository to enable that.

### Built-in fictional demonstration

Use **Try fictional specimen** on the page to preview two made-up worlds and a proposed relation. This has no connection to the private MEMENTO repository and is safe for public demonstration.
