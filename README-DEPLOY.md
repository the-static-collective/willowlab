# Willowlab · owner-review preview (2026-11-22)

**PROPOSAL ONLY — not Colton-approved, not an operational booking site.**

Static hosting: Cloudflare Pages, Git-integrated. This deploy folder is the site root; no build system required. It contains:
- `/`: Willow Q-20 public website concept with the two new illustrative images.
- `/clean-plan/`: read-only Clean Plan Card simulation with fictional source events.
- `/_headers` and `/robots.txt`: best-effort search crawler exclusion; neither is authentication.

## Domain note
Known prior Static Collective domain naming is `abundent.org`, not `abundant.org` (the latter is an unrelated church). Verify ownership and exact spelling before DNS. Planned public review hostname: `willowlab.abundent.org`.

## Deployment recipe
1. Review/test this copy locally using `python -m http.server 8000 --directory .` from this folder.
2. Use the existing separate concept repository `the-static-collective/willowlab`, with `index.html` at repo root. No customer data, tokens or production Willow files.
3. In Cloudflare **Workers & Pages → Create application → Pages → Connect to Git**, authorize only the chosen repo.
4. Project name `willowlab`; production branch `main`; Framework preset **None**; Build command **blank**; Output directory **`.`**; root directory left default.
5. Deploy and test the assigned `*.pages.dev` hostname first: `/` and `/clean-plan/`. Confirm mobile, art, quote preview (NO SEND), role tabs, replay, no console errors, no secrets.
6. In the Pages project **Custom domains → Set up a domain**, enter `willowlab.abundent.org`. Confirm/prepare the required CNAME pointing the subdomain to the **actual hostname assigned by Cloudflare**, e.g. `<your-project>.pages.dev`; do not assume the example name if taken. Cloudflare-managed DNS may add the record for you. Let certificate and verification complete.
7. Share for owner review only; use no real inquiries. Search deindexing headers and robots.txt are NOT access control. If confidential, add Cloudflare Access and invite the actual reviewers before distributing the address.
8. On owner approval, hand off source and decisions to Colton for review in his `StealthFox13/WillowConnect` website workstream; DO NOT merge without his authorization.

## Change policy
No direct production Wix/DNS/email changes, no connection to his private API, no transfer of customer data, no external automatic email/SMS, no persisted form data. All customer-facing forms are *unsent preview only*. The `clean-plan/` history contains synthetic examples only. Two created illustrative assets are proposed; Willow's approved brand art remains the owner source of truth.

Rollback: Cloudflare Pages deployment rollback or temporarily remove this subdomain CNAME; changes on Willowlab do not affect `cleanwithwillow.com`.

Official reference: https://developers.cloudflare.com/pages/get-started/git-integration/ and https://developers.cloudflare.com/pages/configuration/custom-domains/
