# Willow Partner Sprint 002

**Status:** review-only, independently hosted *candidate* surface in WillowLab. No WillowConnect deployment or owner-approved live communication integration.

## Purpose

Turn the previous Willow Growth Desk into an actually usable, **human-directed** regional business development board. The first four public-source research candidates are property managers and real estate offices in Waseca/Mankato. Their existence, services and URLs were checked on November 23, 2026; actual need for cleaning, service radius, contract fit, referral rules and appropriate contact channels are **unverified**.

The source candidates are **not** claimed partners, customers or advocates.

### What is working in the browser

1. **Load starter atlas**. Four source-linked researched businesses, each with a public observation, opportunity hypothesis, and one unanswered question. No contact email or phone is stored.
2. **Review** a source as SHORTLIST / HOLD / DECLINE, with a reason. Local revision and command IDs guard replay and conflicting edits in the pure model.
3. **Generate** a one-to-one human introduction from the relevant Willow cleaning use case and observed public source. The draft has **no recipient**, no provider, and no claims of availability or preferred-vendor relationship. Copy draft or export one `willowlab.growth-review-packet/v1` JSON to propose review by Colton.
4. **Log manual contact**, but only with explicit self-attestations that the owner approved and a human actually contacted the business *outside this app*. It is a self-report, never proof of provider delivery or owner identity. It is intentionally not available before SHORTLIST.
5. **Follow-up queue** sorted by due date; report a DONE / HOLD / CLOSED outcome, not an email or booking.
6. **Persist and exchange** public-source research and self-reported notes through browser localStorage and a strictly validated, portable `willowlab.partner-sprint-export/v1` file. Import resets event receipts and reconstitutes only allowlisted state, not authenticated WMS status.

The notebook forbids contact email addresses and phone numbers in business-source fields and notes. It also disallows company-site credentials or insecure URLs. It has **zero send, zero WMS writes, zero scheduled jobs**.

### How to open

After this draft and its parent Growth Desk work are approved for deployment, the route is `/growth-desk/sprint.html`. On a local checkout of this branch:

```bash
python3 -m http.server 8000
# open http://localhost:8000/growth-desk/sprint.html
```

Only a static HTTP server is required. No keys, external accounts, backend, API tokens, database or installs are involved. You can also click the Partner Sprint link from `/growth-desk/`.

### Three-minute review walkthrough

- Click **Load four researched prospects**.
- Select **Waseca Realty** or **Lloyd Management** from the queue. Open the actual source URL.
- Write a reason and click **Save review note** with SHORTLIST.
- Click **Write an introduction** and read the text. Copy or **Export owner-review packet**; no sending occurs.
- Without making any contact, check the fake/dry-run gates in `/growth-desk/` or leave the contact checklist untouched.
- For an authorized real manual outreach, the actual person can attest to that external action, supply a date and future follow-up review, then use **Due now** when its date arrives.
- **Export board JSON**, then **Import board JSON** in another browser to carry public-source progress between machines. This is manual transfer, not sync.

### Why not another CRM?

WillowConnect / Canopy still owns customer identity, properties, office context, Q34 drafts, and future approved sends. This separate local notebook owns **only public businesses and proposals**. The source can be *reviewed by* Colton without claiming a CRM import.

The matching **private, review-only** WillowConnect experimental parser is `experiments/growth-001/sprint-bridge.mjs` on branch `proposal/growth-sprint-crossing-002`. It accepts the public export, validates the contract, computes an owner decision queue and always denies live activation. It never directly imports a record.

### Caveats and production gates

- **Browser storage is local to the origin and browser profile**, not encrypted, server-backed, synchronized, multiuser or reliably recoverable. Only non-sensitive public business research and process notes belong here. Do not store customer/client identities, staff notes or real recipient details in the notebook. A user must explicitly export before clearing their browser.
- A self-reported prior email or call remains **operator-claimed**, not independently evidenced. No provider delivery receipt is produced.
- A shortlist does not authorize outreach. An external manual contact still needs Colton's actual permission and correct recipient/channel.
- A fictional test of permission gates does not establish consent. An inquiry, quote request or order does not grant marketing opt-in.
- No one has approved changing WMS C-06/C-10, Q34/Q25/Q29 task status, connecting a real sender, scheduling recurring mail, shipping to `cleanwithwillow.com` or publishing the new pages as Colton's production website.
- The browser has not been independently accepted by Colton, and automated Node/CI validation is not a complete browser or cross-device test.

### Original research links

- Lloyd Management: <https://www.lloydmanagement.com/>
- NAI North Star: <https://www.nainorthstar.com/>
- Waseca Realty: <https://www.waseca-realty.com/>
- Edina Realty Waseca: <https://www.edinarealty.com/office/waseca>

**Research is not endorsement or partnership**. Dates and current offerings should be rechecked before contacting anyone.

### Verify

```bash
node --test growth-desk/tests/sprint.test.mjs
node --test growth-desk/tests/core.test.mjs
node --test neighbor-weave/tests/core.test.mjs
node --check growth-desk/sprint-app.mjs
python3 tests/check_static.py
```

### Rollback

Close the stacked draft PR. No live WillowConnect, native Sites, sender, audience, scheduling or customer-data changes exist to reverse.
