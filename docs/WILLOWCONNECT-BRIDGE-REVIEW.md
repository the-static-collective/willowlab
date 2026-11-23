# WillowLab ↔ WillowConnect public catalog seam — owner-review draft (23 November 2026)

**State: draft PR only. No deployment, production migration, submission, owner approval, or live source read claimed.**
Source: private `StealthFox13/WillowConnect` (`main` at `e59c20601793155375e374a1ad4a5899338b5123` when inspected).
Consumer: independent public concept `the-static-collective/willowlab`.
WillowConnect's native Sites projects remain the sole publishing authority for their applications.

## What is actually reusable

| WillowConnect source | Demonstration or potential consumer | Boundary |
| --- | --- | --- |
| `GET /api/pricebook/state` public projection (`wms-pricebook-public/1`) | WillowLab voluntary public service-name/category reader | Public service metadata only; no prices in this bridge, no owner values, no cross-origin browser credential |
| Website `/api/c01/catalog` on the existing Website preview | Later owner-approved C-01 inquiry design alignment | It belongs to the original Website-origin relay; do not copy its synthetic submission grant into WillowLab |
| `/practice-inquiry` → Connect receipt → Canopy review | Reference for WillowLab quote wizard and Clean Plan Card | Development synthetic flow; WillowLab wizard remains **unsent** |
| Connect pricebook revisions and service IDs | Show catalog origin/revision in conceptual UI | Use exact source IDs, no guessed mapping to fictional Clean Plan IDs |
| Canonical Job/Visit/Assignment, Crew clock, office review | Clean Plan Card lifecycle/role comparisons | Synthetic WMS contracts; no Crew access, no real scheduler, payment or payroll |
| WillowLab STATIC WORKBENCH experimental branch | Later read-only project source cards | Not authorized to read private WMS through MEMENTO bridge or broad GitHub token |
| WillowLab STATIC FILEPORT experimental branch | Later explicitly approved artifact handoffs | No customer media, documents or WMS archives; separate database and owner permissions |
| STATIC SEED (House of Houses) | Independent business, story-world, publishing homes | Method/registry only until approved connector; no plugin data transfer by attaching a workbench |

## Proposed bridge (this branch)

- A new Cloudflare Pages route: **`GET /api/willow-catalog`**.
- **Off by default.** Requires server variable `WILLOW_CATALOG_READ_ENABLED=true` set by the WillowLab operator **only after Colton explicitly approves**.
- Fixed single upstream: `https://willow-connect-preview.stealthfox13.chatgpt.site/api/pricebook/state`.
- GET only; redirect disallowed; 8-second timeout; JSON schema and public `can_edit:false` validated; fail closed on errors.
- Responses are no-store, noindex, same-origin, sanitized to `id,name,category,method,unit` and `revision`. No price, private notes, finance, customer, source token, staff records, or upstream error detail.
- Optional `/catalog-bridge/` browser page does not fetch until a user clicks. Uses `textContent`, not HTML injection.
- No writes, sign-in, data retention, billing/booking actions, C-01 grant reuse, permission crossing, or external requests from tests.
- This is **not** a production service-selection or quote flow. Do not connect the existing quote wizard or auto-enroll browser users.

## Acceptance gates before configuration or merge

1. Colton approves using the explicitly public development projection in the independent WillowLab concept, and chooses whether preview service metadata should appear.
2. Reviewer verifies the upstream `/api/pricebook/state` public contract, current origin, schema, anonymous policy, and exact allowed fields. If changed, update and retest the allowlist; do not loosen authentication.
3. CI/test: `node --test catalog-bridge/tests/core.test.mjs` plus existing root tests. Verify disabled returns 503 without upstream traffic, POST denied, unexpected fields removed, upstream errors fail closed.
4. Cloudflare Pages preview builds the Function imports. Enable in a **review deployment** only, fetch with owner's consent, inspect network/payload, and verify no prices, credentials, or private data escape.
5. Owner performs desktop/mobile checks and confirms text and labels do not imply real pricing/booking.
6. Reconfirm no replacement of WillowConnect native Sites, no Willow source push and no business mutations.

Rollback: remove the Pages env variable or set false; endpoint immediately stops upstream fetches. Then revert the draft PR. No source database or external customer records were ever copied.

## STATIC SEED version note

The user identifies **STATIC SEED v2.1** as current. At this review, the connected editable package `plugins_6b0346b88af08191b9f1043bf7f2c5f1` still reports **0.2.0**. Do not claim the current 2.1 implementation was reviewed or rewrite its package until its actual release/archive can be verified. The WillowLab catalog seam is independent of plugin version and requires no plugin privileges.

## Future high-value owner-controlled work

- After verified STATIC SEED v2.1 source: make one *Willow Business home* that indexes **pointers** to Colton-authorized public service version, agreed owner action list, and owner-approved project cards; never ingest real CRM/customer data.
- Add a **Crossing Card** proposal model (proposed, owner-approved, rejected) for sharing conceptual improvements into WillowConnect's code review; no silent push/merge.
- Use *Clean Plan Card* as a comparison harness against WMS C-01, Q10, Q11/Q15 with synthetic fixtures and documented mismatches; do not treat simulated states as accepted WMS operations.
- Reassess Fileport separately for curated **non-customer** marketing assets if Colton opts in.

## Source inspection references

- [WillowConnect README](https://github.com/StealthFox13/WillowConnect/blob/main/README.md)
- [WMS current handoff](https://github.com/StealthFox13/WillowConnect/blob/main/docs/handoff/CURRENT_STATE.md)
- [WMS practice inquiry](https://github.com/StealthFox13/WillowConnect/blob/main/docs/handoff/C01_INQUIRY.md)
- [WMS connected clock](https://github.com/StealthFox13/WillowConnect/blob/main/docs/handoff/Q11_Q15_CONNECTED_CLOCK.md)
- [WillowLab independent prototype](https://github.com/the-static-collective/willowlab)
- [WillowLab draft Workbench PR](https://github.com/the-static-collective/willowlab/pull/1)
- [WillowLab draft Fileport PR](https://github.com/the-static-collective/willowlab/pull/2)

**Private WillowConnect repo paths are references only; do not publish private source material in the public WillowLab repo.**
