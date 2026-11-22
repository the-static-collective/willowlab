# Willowlab — Willow Cleaning Services owner-review prototype

**Independent concept preview. Not a production Willow website or customer system.**

This repository contains the public-facing Willow Q-20 design concept and a fictional **Clean Plan Card** demonstration. It is not part of, and does not change, Colton’s private WillowConnect source.

- `/` — responsive website with two custom Willow-inspired illustrations and a four-step **unsent** cleaning inquiry preview.
- `/clean-plan/` — fictional 18-event, five-perspective operational journey. It does not connect to any real CRM, accounts, billing or booking.
- `/assets/` — locally hosted artwork, converted to small WebP files.
- `/_headers` and `/robots.txt` — best-effort `noindex` directives (NOT authentication).

## Test locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/ and http://localhost:8000/clean-plan/
node --test clean-plan/tests/core.test.mjs
python3 tests/check_static.py
```

## Deploy to Cloudflare Pages

1. In Cloudflare **Workers & Pages → Create → Pages → Connect to Git**, choose `the-static-collective/willowlab`.
2. Set framework **None**, production branch **main**, build command blank, output directory **`.`**.
3. Verify the Cloudflare-assigned `*.pages.dev` address, both routes, form disclosure, mobile layouts and both images.
4. Under **Custom domains**, add `willowlab.abundent.org` **after** verifying the `abundent.org` DNS authority. Use the precise CNAME value supplied by Cloudflare; do not change MX, email, or the live `cleanwithwillow.com` domain.
5. Keep the preview labeled and fictional. If only specific reviewers should see it, add Cloudflare Access; `noindex` alone does not restrict visitors.

## Authority / integration boundary

Owner of WMS design decisions: **Colton**. The current governing reference is the 2026-11-22-supplied WMS Master Management File; actual live WMS source/assets remain unverified because private repository access has not been granted to this builder. This concept does **not** override the approved B01 visual identity or C-01 intake contract. Do not copy real customer records into this public repository or enable the form to submit without owner-approved contracts, authentication, durable receipts and acceptance tests.

`/clean-plan/` is a source-local, read-only simulation, inspired by reLATTE's `RECEIVE != ADMIT` distinction; it does not use or depend on reLATTE at runtime. Its core test suite covers event ordering, replay, forbidden actors, stale revisions and client/crew visibility.

See [README-DEPLOY.md](README-DEPLOY.md) for the original staging/runbook notes.
