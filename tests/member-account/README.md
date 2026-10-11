# Member account development and validation

The electoral homepage links to `/member-account/`. `/payment/` redirects there.
Members can view their own records after email-link sign-in. Payment recording and verification stay with Finance; pending ledger entries never automatically change the balance shown here.

## Data contract

- `members`: one record per registered email, with `fullName`, `lga`, `amountOwed`, `membershipStatus`, `financialStatus`, `attendanceCount`, and `attendanceStatus`.
- `payments`: Finance-maintained records with `email`, `paymentDate`, `paymentType`, `paymentMethod`, `amount`, and `verificationStatus`.
- `attendance`: membership-team-maintained records with `email`, `meetingDate`, `meetingName`, and `status` (for example Present or Absent).
- `lgas`: LGA directory records with `name`.

Membership emails must match the verified Firebase Auth email. Every Zelle receipt must be manually validated by the Financial Secretary (Finance role); Chairman/Admin retain existing oversight access. There is no bank or Zelle API integration. Member reads always query by the authenticated email; this page does not fetch a full membership or payment collection. Attendance summary and balance are supplied records, not inferred eligibility or calculated dues. Missing values display Not available. No automatic election eligibility decision is made.

Finance may update financial summary fields but cannot edit attendance or membership identity. The attendance team uses the existing voter-register/admin role. Finance staff use `/admin/finance/` to confirm the current balance and reconcile legacy payments before new verified credits are applied. The confirmed starting amount must already include existing verified payments. Balance changes, verification markers, qualifying-payment dates, and audit records save in one transaction. Repeated verification is idempotent; rejection reverses the applied credit. Overpayments are retained as `creditBalance`. Zelle references are required and uniquely keyed by normalized method/reference; simultaneous duplicate submissions cannot both create a payment. Finance must explicitly match the received transaction before verification; database rules require the confirming actor for new Verified records. Existing verified legacy rows may receive reconciliation metadata without being re-verified. Finance imports of Verified records must supply confirmation metadata or import as Pending for staff review.

Attendance staff (`chairman`, `admin`, `voter_register`) use `/admin/attendance/`. Saving the same member/date/normalized meeting title updates one record. Present adds to the count; Absent and Excused do not. Status corrections update the existing record and member summary atomically. Existing imported count not represented in detailed history is retained as `attendanceBaselineCount`. Use Correct status for an existing row and New record for another meeting; dates and titles are locked during a status correction. Meeting history does not automatically determine election eligibility.

## Local database tests

Use only project `demo-mpu-members`. These commands use local emulators and fictional `example.test` records. Do not use production credentials or seed a live project. The rules runner clears ONLY this local emulator project before reseeding; it does not touch the live site.

1. Install test dependencies: `npm ci --prefix tests/member-account`.
2. Start the separate Auth/Firestore emulators, keeping Hosting on port 5000:

```bash
mkdir -p /workspace/.mpu-runtime/config
cd /workspace/.mpu-runtime
FIREBASE_EMULATORS_PATH=/workspace/.mpu-runtime/emulator-cache \
XDG_CONFIG_HOME=/workspace/.mpu-runtime/config \
/workspace/.mpu-tools/node_modules/node/bin/node \
/workspace/.mpu-tools/node_modules/firebase-tools/lib/bin/firebase.js \
emulators:start --only auth,firestore --project demo-mpu-members \
--config /workspace/mpuwdc-dev/firebase.test.json --non-interactive
```

3. From the checkout run:

```bash
npm run test:rules --prefix tests/member-account
npm run test:browser --prefix tests/member-account
npm run test:flow --prefix tests/member-account
npm run test:staff --prefix tests/member-account
```

`test:rules` seeds three LGAs, two fictional members, attendance, payments, and role profiles, then checks real Firestore security rules. Expected PERMISSION_DENIED messages demonstrate blocked unauthorized operations.

`test:browser` tests the actual member UI with a mocked Firebase adapter, including missing data, scoped queries, errors, mobile layout, and redirects. It does not validate database rules.

`test:flow` uses the real official Firebase SDK, real local email-link authentication, and the seeded local database. It follows the emulator's email link (no email is sent), checks the account, changes a balance through an authorized Finance test context and refreshes, restores that balance, and signs out. Run `test:rules` first to seed the expected data. It overrides only public browser configuration to set `emulators:true`, which application code honors only on loopback hosts. It does not change production config or store credentials. Official SDK responses are fetched with curl TLS verification because Chromium in this cloud container lacks the proxy CA. No verification is disabled.

Use Chromium at `/usr/bin/chromium`, or set `CHROMIUM_PATH`. Hosting defaults to `http://127.0.0.1:5000`; set `MPU_TEST_URL` if necessary.

`test:staff` signs in real Finance and attendance-role accounts through the Auth emulator, uses the actual staff forms, and verifies reconciliation, pending payments, confirmation, reversal, duplicate references, concurrency, credits, attendance correction, LGA filtering and member display against the real local Firestore database. Run it after rules seeding (and after `test:flow` if running both). It intentionally leaves fictional transaction changes in the emulator; reseed with `test:rules` to reset.

## Deployment limits

The member page and new rules must be deployed together after review. Live email-link authentication and the deployed hostname must be enabled/authorized in Firebase as described in README-BUILD10.md. Scheduled outbound mail is independent of this feature. Local tests do not prove live-site authentication, actual Zelle reconciliation, or production data completeness. No fictional test data is bundled into the production database; the public sample preview is explicitly labeled and kept separate.


## Homepage forms and EC inbox

All three candidate-action buttons and all three Contact EC buttons open their own forms on the same homepage. Instructions stay visible; suggested message wording is editable. Drafts are preserved per form in this browser tab (sessionStorage), and messages are never sent automatically. The typed name and message are required; placeholder prompts must be replaced. Verified membership email-link sign-in happens on the same homepage before official submission. A link opened in another browser can complete sign-in by entering the receiving email; drafts remain in the original tab.

`ecRequests` stores new requests with the authenticated sender UID and email. The member can view only their own requests and replies. Authorized EC roles (chairman/admin/ec/secretary/communications/screening) use `/admin/ec-inbox/` to review and reply. Finance alone cannot view private EC requests. The inbox replaces the former Questions & Replies and Incidents & Decisions placeholder buttons in EC Admin. Saving a reply shows it on the sender's matching homepage form; no email is sent. Candidate forms submit **requests pending EC review**, rather than automatically changing acceptance, eligibility, or withdrawal. Staff must record approved candidate decisions in the existing Nominations / Candidate Screening tools.

Run `npm run test:ec --prefix tests/member-account` after rules seeding to test six same-page forms, editable saved drafts, actual request submission, staff response, private replies, nomination requests, mobile layout and disconnected-service behavior. Tests use fictional local emulator messages only. Deploy pages and rules together after review; live email-link auth must be enabled and the hosting domain authorized.

The older Apps Script portal URL and candidate fallback redirects have been removed from served configuration. Candidate/contact requests stay on the homepage. The signed-paper strip now opens How to Submit, a dedicated handwritten sample page, or the blank printable template. Submission guidance includes only the submission content; full rules stay in Voter Education. Guidance, sample and template pages have a prominent Portal Home button at the top. Existing `submission-guidance/#sample` bookmarks redirect to the local sample page. No raw-image/new-tab sample links lead away from home navigation. Run `npm run test:navigation --prefix tests/member-account` to validate local destinations, readable image, mobile layout, legacy disconnection and home return links.
