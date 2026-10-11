# MPU Firebase Platform — DEV Build 9 FULL

Build 9 is a **complete replacement build**, not a patch. Use this folder as the new baseline.

## Public homepage — only the three approved final touches

1. Portal title changed to **MPU 2026 ELECTION Portal**.
2. Existing four navigation items retained, but the header is now a professional deep-blue bar with a gold active tab. No homepage restructuring was done.
3. Election Timeline is approximately 75% of the previous height. Long milestone names are contained/clamped so they do not bleed into neighboring milestones. Mobile horizontal scrolling remains supported.

All approved Build 8 homepage cards, Contact EC consolidation, Important Now, candidate actions, payment card, and compact handwritten/signed-photo strip remain in place.

## New standalone data/finance foundation

### Finance Center `/admin/finance/`
- Payment methods: Zelle, Cash, Check, Other / Manual
- Payment types: Annual Dues, Levy, Election Levy, Special Assessment, Membership Fee, Donation, Other
- Payment verification: Pending, Verified, Needs Review, Rejected
- Optional **Counts toward 6-month payment rule** flag on a payment
- Verified qualifying payments can update a matched member's `lastQualifyingPaymentDate`
- Payment ledger filters by method, type, status, and date range
- 5-month warning and 6-month Suspension Review dashboard
- Manual notification queue for member + Finance + Chairman review
- The system **does not automatically suspend a member**; 6+ months places the record in Suspension Review.

### Reports & Exports `/admin/reports/`
Reports include:
- Voter Eligibility / Qualified Register
- Finance Payments
- Outstanding Dues / Levies
- Non-Payment / Suspension Watch

Filters include LGA, status, payment method, payment type, date range, and an **As of Date**.

Exports:
- CSV
- Excel (.xlsx)
- PDF

Shortcuts:
- Export Qualified Voter Register
- Zelle — Last Quarter

### Import & Migration Center `/admin/import-center/`
- Upload CSV, XLSX, or XLS
- Choose target dataset
- Auto-map common column names
- Manually adjust field mapping
- Preview before import
- Upsert by ID instead of blindly duplicating matching IDs
- Import history recorded in Firestore

Prepared datasets:
- `members`
- `payments`
- `duesObligations`
- `candidates`
- `educationResults`

CSV templates are in `/templates/`.

## Legacy migration included

Build 9 includes normalized migration snapshots created from the three supplied workbooks:
- MPU_2026_Candidate_Portal_Data.xlsx
- MPU ELECTION CRASH COURSE.xlsx
- MPU 2026 KNOW THE RULES - Web App Data.xlsx

From Import & Migration Center you can migrate:
- EC access roles
- nominations / candidates / acceptance / member verification history
- Crash Course results and attempts
- Know the Rules participants, attempts, quiz sessions, and module releases

Old OTPs and temporary login codes are **not** treated as Firebase credentials.

### Authentication migration

The five legacy EC users can be imported into `accessDirectory` with current least-privilege roles:
- Chairman / Chief Electoral Officer → `chairman`
- Secretary, Records & Operations → `secretary`
- Voter Register, Attendance & Financial Verification → `voter_register`
- Screening & Credentials → `screening`
- Candidate Engagement, Manifesto & Event Coordination → `communications`

On first Firebase email-link sign-in, a preapproved email can inherit its imported role. Other first-time users remain Pending Approval.

## Firestore collections prepared

Key collections now include:
- `users`
- `accessDirectory`
- `members`
- `payments`
- `duesObligations`
- `financeConfig`
- `notificationsQueue`
- `importBatches`
- `candidates`
- `nominations`
- `memberVerification`
- `candidateAcceptance`
- `educationParticipants`
- `educationResults`
- `crashCourseResults`
- `crashCourseAttempts`
- `quizAttempts`
- `quizSessions`
- `moduleReleases`
- existing portal/admin collections

Firestore rules were expanded for Finance, reporting, import/migration and access-directory workflows.

## Optional scheduled 5/6-month compliance function

`/functions/index.js` contains an optional daily Firebase scheduled function:
- checks member `lastQualifyingPaymentDate`
- creates a 5-month warning
- creates a 6+ month Suspension Review notice
- queues oversight to Finance/Chairman
- writes optional documents to the `mail` collection

**Actual outbound email requires an email delivery integration**, such as Firebase Trigger Email configured with an SMTP provider. The scheduled function also requires Firebase Functions deployment and an eligible billing plan. The Hosting site works without deploying Functions.

## DEV deployment

From the extracted Build 9 folder:

```bash
firebase use dev
firebase deploy --only hosting,firestore
```

Public DEV URL:

`https://mpuwdc-dev.web.app`

For Hosting only:

```bash
firebase deploy --only hosting
```

For the optional scheduled compliance function, install function dependencies first:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Do not deploy production until DEV is reviewed and approved.

## Recommended DEV setup order

1. Deploy Hosting + Firestore rules.
2. Sign in with the Chairman account and confirm role access.
3. Open **Import & Migration Center**.
4. Import **EC Access Roles**.
5. Import Candidate and Education legacy data when ready.
6. Later upload the official member register and finance files using CSV/Excel import.
7. Review Reports & Exports.
8. Only then consider enabling the scheduled compliance function / outbound email integration.
