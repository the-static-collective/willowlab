# STATIC FILEPORT 001 — WillowLab pilot

**Status: Neon private storage and metadata schema created; GitHub implementation is REVIEW ONLY. Not deployed or populated with Colton's private material.**

## Actual resources (2026-11-23)
- Dedicated Neon project: **WillowLab Fileport**, id `wandering-dream-76052933`.
- Default branch: `br-billowing-dream-bb9u3nyj`; database: `neondb`.
- Private object-storage bucket: `willowlab-private`. This is **not** a public bucket.
- Four metadata/receipt tables, installed after a temporary-branch migration test.

These are distinct from the existing Static Collective FREEPORT harbor, fellowSHIP Commons, and Colton's independent WMS/WillowConnect.

## Intended flow
1. Owner selects a file whose rights and sharing scope are clear.
2. Operator uses `node fileport/admin.mjs upload <file>` with server-side credentials. A SHA-256, size, object key and metadata receipt are recorded; file is **staged**.
3. Operator reviews then executes `approve <file-id>`. No automatic approval or publicly browsable listing.
4. Operator creates `share <label> <hours> <approved-file-ids...>`, which stores only the SHA-256 of a random 256-bit token and prints the token ONCE.
5. Authorized visitor opens `/fileport/#share=<token>`. The fragment stays out of the HTTP request URL and is POSTed to the same-origin Pages Function.
6. Function checks share expiry and revocation; only approved, explicitly attached files appear.
7. Download click checks again and signs an individual S3 GET URL valid for 120 seconds. Bucket credentials stay server-side. Existing signed links can remain valid until their short expiry after a share is revoked.

**Bearer links are secrets.** Whoever possesses one can use it until expiry or revocation. Do not send them in public repositories, analytics, screenshots or logs. Never confuse `noindex` with authentication.

## Required private runtime configuration
Set these as secrets in the **Cloudflare Pages project**, for both the relevant preview/production environments when ready:
- `DATABASE_URL` — the dedicated WillowLab Neon Postgres connection string.
- `S3_ENDPOINT` — the branch-scoped HTTPS storage endpoint.
- `S3_REGION` — `us-east-1`.
- `S3_BUCKET` — `willowlab-private`.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` — scoped **read-only storage credentials** for the download Function.

For the **operator's machine only**, the upload utility requires `DATABASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, and separate **storage:write** credentials. Never commit `.env`, token URLs or S3 keys. Create credentials via Neon credential management once deployment is approved.

Cloudflare Pages Functions import `@neondatabase/serverless` and `aws4fetch` from the root `package.json`. The static site does not require a framework or a Vercel deployment.

## Tests and gates
- `npm install && npm run test:fileport` validates core safety contracts; it is not a live Neon or S3 acceptance test.
- Confirm the Cloudflare preview build correctly bundles Pages Functions.
- From a private test computer, upload an innocuous synthetic file, approve it, issue one link and verify a GET returns the exact SHA-256.
- Verify missing, malformed, expired, and revoked tokens; disabled files; and a direct unauthenticated bucket request.
- Verify the URL works on Colton's phone and laptop and share revocation. Manually confirm the access boundary and any billing/transfer limits.
- Do not migrate real Colton WMS files, contact Colton, publish a live link, or merge this PR until explicit artifact selection and owner scope review.

## Independence
FILEPORT is an optional storage and share adapter. The Intranet will ultimately index local Suitcase disks, Neon, R2 and other owner-controlled stores without forcing one provider or global administrator.
