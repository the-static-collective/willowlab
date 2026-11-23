# Neighbor Weave 0.2.1 — WillowLab local-review room

This branch provides a **separate, non-operational** reference implementation of STATIC SEED's new Neighbor Weave method, based on the owner-supplied `static-seed-v2.1-plugin-source(1).zip`.

The plugin manifest and README call the internal release `0.2.1`; the user calls it `v2.1`. The new skill `neighbor-weave` adds business-partnership research in a private `Business → Partnerships` room, backed by public source observations and explicit human approval gates. The source plugin ships a `static-seed.neighbor-garden/v1` public research specimen. This viewer can interpret that public specimen, but **not** customer records or arbitrary private WMS exports.

- `/neighbor-weave/`: local-only, browser-file import and fully fictional example. Nothing is fetched, persisted, sent or synced.
- `core.mjs`: strict read of a 1–3 business source-grounded public specimen; always reprojects every candidate as **DISCOVERED**, `NOT_AUTHORIZED`, not contacted, and not a confirmed partner. Unknown source fields, prices, contact data and customer fields never leave the allowlist.
- The browser can download a **DRAFT_NOT_SAVED_NOT_SENT** proposed review packet on explicit click. This is not an approval, introduction, or WMS customer/lead import.
- No access to `StealthFox13/WillowConnect`, no enterprise credentials, no server API, no scripts in the user's plugin package copied into the site.
- The independent WillowLab draft public catalog bridge is a *separate* pull request, not a dependency of this pilot. Neither demonstration is production.
- Do not merge or publish as a live Colton service without his review, current source checks, and authorization. No real relationships have been contacted.

## Checks

```sh
node --test neighbor-weave/tests/core.test.mjs
python3 tests/check_static.py
```

## Proposed future seams (not implemented)

1. Colton may opt to review a public service-category projection from his existing Connect catalog. That determines **fit hypotheses**, not approval to contact, send, or mutate WMS records.
2. Owner chooses one source-linked review card; if and only if it proves useful, the person owning WillowConnect chooses whether to link **just its public source reference** in an owner-private work area.
3. Independently consented introductions/relationships may be handled by Colton's real operational system, not this prototype. No inferred partner, referral, booking or customer identity.
4. Reject the extra tooling if it creates more work than a one-page note.

Source-derived distinction: the plugin's tests and skills verify structural, staged **public research**; they do not verify a real collaboration or backend linkage.
