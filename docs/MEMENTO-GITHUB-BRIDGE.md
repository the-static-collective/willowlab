# MEMENTO → Willowlab: authenticated read-only source bridge

**Status: implemented in the open draft branch; not configured, deployed or production-authorized.**

The Static Workbench MEMENTO panel can request read-only context directly from the private `the-static-collective/MEMENTO` GitHub repository, **without exporting a JSON file manually**, after this Cloudflare Pages Function is explicitly configured. This changes neither MEMENTO nor its admission ledger.

## The boundary

Willowlab is public; MEMENTO is private. No direct browser GitHub token is allowed.

    Willowlab public /workbench/
       └─ voluntary click
          └─ same-origin GET /api/memento
             ├─ validated Cloudflare Access JWT (issuer, audience, RS256 signature, expiry)
             ├─ explicit email allowlist
             └─ GitHub REST API using Cloudflare server-side, repo-scoped read token
                ├─ GET main branch commit SHA
                ├─ GET pinned commit tree
                ├─ GET registry JSON blob
                └─ GET only historical-imaginations/edges/*.json blobs
                     └─ sanitized, source-pinned `memento.context-pack/v0`

**No MEMENTO source writes, no API endpoints for mutations, no live Willow customer records, no arbitrary file paths, no secrets in the browser or git.**

The bridge does *not* read ledger prose, private conversation files, arbitrary branches, source cards, UNDERSTORY, or user-provided URLs. It returns metadata within the named Historical Imaginations registry and its first-class relation records. This is intentionally narrower than the full Return Ticket system. A MEMENTO record marked `admitted` retains its **source status** in the response, but the returned world and every edge are stamped `admission: none`. Source retrieval is not admission to another home.

## One-time Cloudflare setup (required)

1. Keep the code on the **draft PR** until code and security review. Do not deploy with secrets yet if reviewers have not checked the boundary.
2. On the existing Cloudflare **Pages** project for `willowlab.abundent.org`, arrange a **Cloudflare Access self-hosted application** protecting the `/api/memento` route (and any preview or pages.dev routes that need a usable authenticated reader). Restrict its Access policy to the actual authorized reviewer identities. An authorized person must complete Access sign-in.
3. Create a **GitHub fine-grained personal access token** or installation credential limited to the single `the-static-collective/MEMENTO` private repository and **Contents: Read-only**. No Issues, Pull Requests, Administration or Contents write access. Do **not** put the token in the repository, a query parameter, a browser input, a chat transcript, or a client environment variable. Rotate or revoke it if exposed.
4. In Cloudflare **Workers & Pages → Willowlab Pages project → Settings → Variables and Secrets**, configure:
   - `CF_ACCESS_ISSUER`: exact `https://YOUR-TEAM.cloudflareaccess.com` issuer, without a trailing slash; use the real issuer for the chosen Access application.
   - `CF_ACCESS_AUD`: Application Audience (AUD) tag from the Access application's settings.
   - `MEMENTO_ALLOWED_EMAILS`: comma-separated, explicitly permitted reviewer emails. This is an *additional* server-side allowlist, not a substitute for Access policy.
   - `MEMENTO_GITHUB_TOKEN`: **encrypted secret** for the private repo's read-only credential.
5. Deploy the reviewed branch only after setup; binding availability is deployment-specific. Confirm the custom domain and Pages Functions are serving the same origin. The server-side code remains isolated from Cloudflare static assets, and `_routes.json` makes only `/api/memento` invoke a Function.
6. In `/workbench/`, click **Find worlds in private MEMENTO**. If Access sign-in is needed, use **Open Access sign-in / source check** first, then retry. Select a world, choose depth 0–3, and click **Read at pinned source commit**.

**No data is fetched until the user clicks.** A successful world list returns a Git commit SHA; a context request must include that SHA, pinning the entire read to a single commit even if `main` advances between the two clicks. The response includes a source-observation timestamp, registry blob SHA, and the repo/commit provenance.

The entire endpoint fails closed without all four server configuration values; a missing/expired/untrusted Access JWT or a non-allowlisted identity cannot reach GitHub. Only `GET` is accepted. Responses have no-store/noindex headers; CORS access is not granted to other websites.

## Read, decisions and retention remain different

- Source presence = retrieved metadata, not a validated claim about the world.
- Source edge status = MEMENTO's status at the selected commit, not a Workbench owner decision.
- Source-pinned GitHub commit = version precision, not authorization to adopt that history.
- Clicking **Capture a demo question** can copy a short title into the current **in-memory** workbench home. The workbench deliberately does **not** persist this, attach it as approved evidence, push it to MEMENTO, or admit it.
- The **Return Packet** can include the captured question title if you actively copy it. Avoid capturing private wording on devices or pages where others might see it.
- Switching project homes clears the imported context. Reloading the page resets all data.
- **Manual local JSON import and a wholly fictional specimen remain available** if the live endpoint is not configured.

## Tests and acceptance

CI (all network and identity fixtures are *fictional*, with generated signing keys):

    node --test clean-plan/tests/core.test.mjs workbench/tests/*.test.mjs
    python3 tests/check_static.py

Tests include missing configuration, missing JWT, bad audience/signature, disallowed email, read-only verbs, fixed MEMENTO repo paths, pin-required requests, changed head behavior, rejected relation exclusion, bounded scopes and fail-closed incomplete Git trees.

Before enabling on the custom domain, a reviewer still needs to verify with actual Cloudflare Access and an actual read-only GitHub credential:

- No identity → denied before GitHub request; wrong identity → denied.
- Authorized list → limited worlds + pinned SHA; request a world at that SHA → scoped context.
- Advance `main` → the existing SHA still returns the old committed version, or fails safely if no longer accessible.
- Inspect server response: no GitHub token, raw private prose, customer record, or nonrequested file.
- Confirm the browser does not store the response in local storage, cookies, application logs or indexed caches.
- Check mobile and desktop behavior; verify source context clears on switching homes.

## Return and rollback

This is a **GitHub draft PR**, not a live service. Don't merge or configure credentials solely because synthetic CI passes. Reject/close the PR or revert the `functions/api/memento.js`, `_routes.json`, and Workbench UI additions to roll back. Revoke the GitHub credential and disable the Cloudflare Access application if deployment is abandoned. The rest of the Willow preview is independent.

References:
- Cloudflare Access [JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- Cloudflare Pages [Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- Cloudflare Pages [secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- GitHub [Git trees](https://docs.github.com/en/rest/git/trees)
