# Willow Growth Desk 001 — source-gated proposal, not a second CRM

**Status:** unmerged WillowLab review prototype. Current business approval, mailing provider, customer data, campaign scheduler and WillowConnect integration are **not** present. This is independent of Colton's authoritative systems.

## Why this is Willow-specific

The Cedar Crate concept was a useful **method**, not a source of live access. This transplant uses:
- **STATIC SEED v2.1** (internal release 0.2.1) Neighbor Weave's public-source prospect cards and unapproved relationship stages.
- **Field Bell**'s method of taking one verified owner note to multiple human-reviewed publication formats.
- **reLATTE COMMUTER-001**'s conceptual default HOLD, source event IDs, consent/suppression before dispatch, separate owner authorization, idempotent action and receipt distinction.
- The **WillowConnect** governance patterns from `C-01` practice inquiry and `Q-34` practice-office follow-up: canonical IDs, owner review, atomic command replay and separation between drafting and delivery. These native WMS handlers are **not** imported or invoked.

What changes relative to Cedar Crate: the source is Willow cleaning services and the opportunities are e.g. property management, move-in/move-out services, real estate, and local service collaborations. No farm product claims, GrownBy calendar, Squarespace signup, farm authorship or farm audience travels with the idea.

## Try it

At `/growth-desk/` (or `python3 -m http.server 8000` in the repository root):

1. Start with one **entirely fictional** business. Optionally import a small public-research `static-seed.neighbor-garden/v1` file (<=64 KiB) from STATIC SEED's Neighbor Weave.
2. Record a source-based **local review**: HOLD, SHORTLIST or DECLINE. Each local command gets a revision/receipt; replay with the same key and changed contents is denied in the pure model. It does not become a real lead or approve outreach.
3. Draft a human one-to-one introduction, without storing recipient details. Export an **unsent owner-review packet**, not a WillowConnect API request.
4. Use **Field Bell for Willow** to draft an email, website note, social post and printable note from the same source facts. Unverified availability is replaced with a warning instead of a promise; even checked facts remain in local draft state.
5. Run simulated COMMUTER correspondence gates for missing owner approval, unknown marketing consent, unsubscribe, unverifiable recipient, provider failure and duplicate processing. Every path explicitly reports **0 messages sent, 0 CRM changes, no provider receipt**.
6. Optional: read the `GET /api/willow-catalog` *same-origin* WillowLab public-catalog adapter from independent [draft PR #3](https://github.com/the-static-collective/willowlab/pull/3). It is not included/activated here and returns unavailable until installed and owner-reviewed. The user selects a public service label manually; no pricing/customer data or private credentials are fetched.

## Where operational work actually belongs

| Responsibility | Existing owner/source | Proposed seam |
|---|---|---|
| Customer identity, properties, requests, conversations | WillowConnect / Canopy, Q07/Q34 | Never copy into a public/static prospect index |
| Public service IDs and canonical catalog revision | WillowConnect / Connect | Optional already-designed allowlisted read-only projection, owner-approved |
| Unsigned potential business relationship and proposal | STATIC SEED Neighbor Weave / WillowLab | Export **DRAFT_NOT_SENT** review card, owner decision remains external |
| Referral opportunity after actual mutual acknowledgment | Future Colton-approved owner-private workflow | Exact agreement and evidence reference, not silent admission |
| Personal B2B introduction | Human owner | Personal draft and manual review; no automatic SMTP/API send |
| Subscriber campaigns | Future Q25 provider, Q29 cadence, owner consent decisions | Explicit affirmative permission, evidence, suppression/revocation, current channel, idempotency |
| External delivery and actual receipt | Provider under Willow's approved identity | Native authorization and independently verified provider outcome; not simulated status |

**Do not mistake** Q34's current local saved follow-ups for an operating sender. Q25's provider channel and Q29's cadence remain future operational scopes. Native Sites repositories still control actual Willow publishing; this GitHub repository is a detached preview.

## Source relationships / MEMENTO Return

- [Field Bell](../../growth-desk/README.md) is a method translation, **not** live Cedar Crate integration. A prior Field Bell HTML file contained only browser-local composition, no farm API or mailing list.
- [reLATTE COMMUTER-001](https://github.com/the-static-collective/reLATTE/blob/main/docs/COMMUTER-001.md) is an executable synthetic engine with signed crossings and a receiver-local journal; this public WillowLab demo is a separate pure dry-run adaptation, **not** the native signed COMMUTER implementation.
- [WillowConnect](https://github.com/StealthFox13/WillowConnect) remains a private WMS checkpoint and its separately published Sites remain the sources of authority.
- [Neighbor Weave PR #4](https://github.com/the-static-collective/willowlab/pull/4) is this branch's **stacked base**; this growth integration relies on its public-research reader.

## Tests

```sh
node --test growth-desk/tests/core.test.mjs
node --test neighbor-weave/tests/core.test.mjs
node --check growth-desk/app.mjs
python3 tests/check_static.py
```

No real browser, external network or provider acceptance is established by Node or CI. No runtime JS import from private WillowConnect or reLATTE, no real identities, no keys, and no customer details in Git.

## Future implementation gates (not completed)

1. Colton reviews Willow Growth Desk and chooses which B2B relationships and communications he actually wants.
2. Confirm his existing canonical WMS master/owner-action list; define the proper WMS Q34/Q25/Q29 slice without overriding existing IDs or timelines.
3. Create an **owner-private** prospect graph/relationship table, if needed, with per-organization ownership, source snapshots, explicit review and retention; avoid a second *customer* directory.
4. Use real business-purpose authorization before linking any existing Canopy customer record. No automatic identity joins or marketing enrollment from inquiries/quotes.
5. Implement a **single** provider adapter (not many), with owner-approved sender, current consent/suppression, stable idempotency keys, durable outbox, receipts, unsubscribe and rate limits. Verify by real provider acknowledgment and device tests.
6. Only then consider recurring communications; production opt-in/policy and staff enforcement cannot be inferred from the synthetic demo.

## Rollback

Close/reject the stacked PR; remove `growth-desk/` and its CI file. The other drafts, real WMS, and any existing subscribers remain untouched.
