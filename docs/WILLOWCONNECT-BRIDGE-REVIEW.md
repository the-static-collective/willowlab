# WillowLab public catalog adapter — proposed owner review (November 2026)

**Unmerged draft. Disabled by default. No release, deployment or owner authorization implied.**

This optional experiment makes a one-way, read-only connection from the independent WillowLab concept site to WillowConnect's publicly designated *development* service catalog. WillowLab does not become a canonical source. It does not send inquiries or manage actual business operations.

## Interface

- Same-origin WillowLab endpoint: `GET /api/willow-catalog`.
- Upstream: a **fixed** WillowConnect public-development catalog URL. No caller-controlled remote URLs.
- Cloudflare Pages server-side only; no upstream browser credentials or cross-origin browser access.
- Strict projection: source catalog revision and active public service `id`, `name`, `category`, `method`, `unit`. Never pass rates, owner notes, extended upstream fields, customer, staff, booking, finance or source credentials.
- Strict schema, no-store/noindex response, no redirects, short timeout, capped payload; unknown/malformed upstream payload fails closed.
- No upstream fetch until an approved deployment has `WILLOW_CATALOG_READ_ENABLED=true` **and** the visitor actively clicks to read.
- Standalone visitor demonstration: `/catalog-bridge/`. All text is rendered as text, not markup. Nothing is retained or submitted.

## Ownership and acceptance

1. Colton reviews and explicitly authorizes whether public-development service labels may be displayed on this independent site.
2. Authorized reviewer confirms the exact upstream public projection, origin, schema and permission policy against current source and deployment. No private source records need to enter this public repository.
3. Run `node --test catalog-bridge/tests/core.test.mjs` and existing static-site checks.
4. Verify the Cloudflare Pages Function can bundle, then test *only in an approved review deployment* with the environment flag. Confirm denied/disabled, changed-contract, network failure, payload sanitization and mobile/desktop rendering.
5. Do **not** infer business production acceptance, real estimate/booking, authentication, data migration, or permission from a successful development-preview read.

**Rollback:** Remove or disable the flag; no upstream request will occur. Revert the branch to remove the adapter. No business records are modified.

## Independent companion projects

The Clean Plan Card, STATIC WORKBENCH, FILEPORT and STATIC SEED work remain independent experiments. They do not receive private repository, operational, account or customer access through this adapter. Any future collaboration or asset transfer needs a distinct owner-reviewed contract and permission boundary.

**Do not publish source details, private documents or client information from another owner's private repository in WillowLab.**
