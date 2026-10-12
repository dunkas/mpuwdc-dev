# MPU V21 dev release — October 11, 2026

Target: https://mpuwdc-dev.web.app (development project only). Previous portal and Firestore deployment succeeded. This release restores Financial Portal / Finance Team access, optional contact phones, private anonymous incident reporting, editable official calendar, local V21 education, Admin documents and section return navigation.

## Release and rollback procedure

Before every deployment: run relevant checks, commit all release source in Git, create a dated source ZIP and a ZIP of the existing deployed Hosting version, and record their SHA-256 hashes with the commit ID. Do not include credentials, environment files, node_modules, or logs. Keep source and previously deployed site backups outside the checkout in /workspace/mpu-deliverables. Deploy the exact committed source. Record the result in the release manifest after deployment.

```sh
firebase deploy --project mpuwdc-dev --only hosting,firestore:rules,firestore:indexes
```

Use Node 20 and firebase-tools 14.22.0. Functions and outbound email are not deployed. Restore an earlier Hosting release through Firebase release history or deploy its archived public files. Restore rules/indexes from the corresponding earlier Git commit; Hosting rollback alone does not roll back database security or data.

## Included

- Private member balance, verified payments, attendance and status; Finance Team payment reconciliation with Financial Secretary confirmation of Zelle receipts.
- Native nomination and Contact EC requests with optional sender/nominee phones, staff inbox and private in-app replies. Anonymous incident reports use a separate anonymous identity; phone remains voluntary.
- All 15 official FINAL v2 timetable events imported into previously empty live calendar. Staff can edit dates and descriptions or import official entries without deleting other events.
- V21 rules and 18 printable appendix sections; original draft/sample labels retained.
- Local four-day education journey and final practice challenge, V21 crash course, private saved member progress and staff progress review. All section resources return to Education/Admin/Finance as appropriate.
- Constitutional Questions: 38 EC review questions derived from the compliance checklist and 5 exact original Day 1 questions, available as Word and 8-page PDF. These are review questions, not newly adopted rules or an answer key.

## Verification and limits

Local rules checks cover 43 privacy/validation cases. Actual emulator Auth/Firestore flows passed 17 checks including optional phones, anonymous reporting, persistent learning, calendar editing and corrections. Portal navigation and learning checks exercise all document links. Live HTTP checks confirm published artifacts; full live member/staff sign-in has not been exercised by this session.

The original education Apps Script exposes its page but keeps the randomized question bank and answer keys server-side. Five Day 1 questions were recovered from the supplied public Google Form; their undisclosed answers remain ungraded. Other practice questions use explicit V21 citations. Supply the Apps Script server source/question bank to reproduce the exact remaining original quizzes.

Outstanding: private signed-photo upload, full structured candidate acceptance/verification/state transitions, outbound notification email if required, real staff/member/LGA access review, and resolution of the source timetable signature date 10/7/2027. Current candidate buttons submit EC requests; practice scores do not establish eligibility.

## Finance House restoration — October 11, 2026

Restored from Hosting version 612a6f7487d71065: all 14 original sections, original styling, receipt PDF/Excel libraries, finance and attendance import review, card/outgoing records, evidence and cash handovers, configuration, registration, audit history and historical member payment submissions. The homepage now includes a direct Finance Team entry. Existing live finance callable services remain active and are not redeployed. Their recovered source is versioned in recovery/finance-functions without private legacy records.

Restored role management supports additional Finance access without discarding an EC role, receipt-only access, attendance-only access, and print/attendance assistant access. Self-assignment of these roles is denied. Finance sign-in destinations survive email-link authentication; the workspace retains its password proof and inactivity lock. Zelle stays pending until manually verified, with a required bank-match acknowledgment in the restored interface.

The dev evidence bucket was missing and is now provisioned at mpuwdc-dev.firebasestorage.app. Storage rules allow only verified, authorized uploaders with a server-created ticket of matching owner, file size and content type. Files cannot be overwritten, deleted or read directly; the existing financeFile service validates original checksums before returning evidence.

Validation: 41 recovered service checks; 12 actual local Auth/Functions/Firestore/Storage integration checks; 11 Finance House browser checks including both persisted imports and member-visible attendance; 48 portal privacy/rule checks; 9 member-account interface checks; broader Education/document navigation checks passed. All test records are fictional and confined to demo projects. No real payment or member record is created by live verification.

Finance House opening balances imported from workbooks remain dated snapshots, as in the original workspace; a confirmed receipt does not automatically recompute those snapshots. The account page labels their date. Existing pending submissions remain reviewable; current public member access remains read-only. Gmail/phone delivery is not configured; queued receipts do not mean sent. These limits are retained explicitly.

## Financial Portal consolidation

The full 14-section finance workspace now opens directly at `/finance/`. The Electoral homepage retains a single MPU Financial Portal entry and My Member Account; duplicate Finance Team and member-card finance links are removed. Legacy `/admin/finance/` bookmarks redirect to the portal. Staff utility pages return to the Financial Portal, including email-link sign-in and password reset. Existing attendance tools and attendance-only permissions are preserved. Backend services, financial records, attendance records and security rules are unchanged. QR card/scanner implementation is a separate future release.

## QR membership cards and Meeting Attendance

The Financial Portal is a shared entrance for members, Finance and the password-protected Attendance Center. Member ID and QR Card tools are inside the existing finance member record; My Member Account shows the same issued QR. Attendance has scan, scanner-import and manual-entry options using stable meetings and the same register. Unique number/token reservations, card revocation, per-member/meeting transactional records and audited corrections are enforced on the server. Legacy histories are retained, and old recording entry points are disconnected. See QR-ATTENDANCE.md for staff workflow, offline operation, hardware verification and deployment scope.

## Quarterly attendance schedule and bonus meetings

Attendance Center now displays four permanent quarterly slots for each selected year, with staff-managed actual dates and extra meetings marked Bonus. Bonus presence contributes to the existing attendance count without increasing the four regular slots or changing existing eligibility minimums. No meeting dates or attendance are guessed or seeded in the live database.

Staff may explicitly select an existing calendar event when creating a meeting. Meeting edits atomically update the linked public calendar entry while preserving existing event details and attendance identity. Linked calendar entries return to Attendance Center for password-protected edits; direct client changes are denied. New membership-only events do not replace election phases on the homepage.

Validation: 18 actual-emulator attendance/card integration checks, 15 browser workflow checks (including quarterly date/calendar linking), 49 Firestore privacy/permission checks, 49 finance unit checks, and full portal navigation/calendar health checks passed. Physical scanner/phone checks remain as documented in QR-ATTENDANCE.md.

## Constitution-only questions and Election Day mini guide

The Constitutional Questions HTML, Word and PDF now contain 32 reviewed questions sourced only from the user-uploaded `MPU CONSTITUTION -  9.27.26 corrections.docx`. Each question includes a controlling article/section and verbatim evidence; the original source is downloadable and SHA-256 pinned in the question dataset. Removed unsupported rotation/passing-the-presidency, nomination fee, nominator-count, written nomination procedure, withdrawal, tie-break and inferred appeal-authority prompts. Removed the separate old Google Form appendix from this document. This release does not change the independent education quizzes or operational V21 rules. Source ambiguities and blank ratification fields are explicitly preserved, with no claim of independently verified adoption.

Education opens Election Day Mini Rules instead of Open Rules & Guidance. Its original Word attachment is byte-identical; all 129 nonempty paragraphs/table cells are retained in source order in the HTML and printable PDF. Both documents return to Education. Hosting-only release; no finance, attendance or database services changed.

Validation: full portal health checks; both mobile document pages and return links; all download targets; original mini-guide byte comparison; all 129 mini-guide text cells/paragraphs in HTML/PDF; all 32 questions, references and source excerpts in Word/PDF; and generator checks against the SHA-256-pinned Constitution passed.

## Voter register and designer credit

Finance Team → Reports & exports now generates a private, date-specific voter register with Date Joined, permanent MPU number, LGA, quarterly attendance, bonus attendance, verified dues, Active / Not Active status, eligibility reasons and a native boolean voterEligible. Annual members require three of four quarterly meetings (75%); user-approved newer-member rules require two meetings after six months, including quarters across a year boundary. Missing evidence remains Needs Review. Password-protected, audited staff reviews verify identity dates and constitutional qualifications; financial changes invalidate outdated dues reviews. CSV, Excel and readable PDF exports respect the selected filters. See VOTER-REGISTER.md.

Designed by Amara Dunkas is restored in locally rendered cursive across portal pages. Official uploaded documents remain unchanged.

Validation: 69 unit tests, 51 Firestore privacy/permission checks, four voter-register backend integration checks, 12 existing finance integration checks, eight voter-register browser checks, ten existing finance browser checks and full portal health checks passed using fictional local emulator records. Deployment scope: financeCommand, Firestore rules and Hosting only.

## Finance governance, self-service Zelle and Treasurer links

The Financial Portal starts with Record My Zelle Payment: verified registered members submit Zelle details with an optional confirmation number and a printable pending acknowledgment. Audited Finance review records one verified receipt or links an existing matching receipt. Duplicate member submissions, repeated Zelle references and repeat requests are blocked. Opening balances remain dated, reviewed snapshots rather than blindly recomputed totals.

Chairman/Main Admin now invites staff, changes roles and disables access in Manage Staff Access. New staff choose their own password through expiring invitations; existing accounts retain their password. Replacing an unused invitation preserves first-time setup. The last enabled Chairman/Main Admin is protected. Auditors have a password-protected read-only finance workspace, period exports and findings/response histories; Finance cannot resolve its own findings. Auditor data excludes QR tokens, birth dates and delivery links.

Finance edits ordinary member details with revision checks and reasons. LGA, activation/deactivation, archive and duplicate merge requests require Chairman/Admin approval. Merges retain permanent IDs and historical documents as linked aliases, revoke duplicate cards and require fresh eligibility/balance review. Member account and quarterly reports include approved linked histories. Direct client edits of staff access, member records and payments are retired in favor of audited server actions.

Funds Handover & Deposits links existing cash/check receipts to the signed physical register, reserving receipts once. A secure, expiring, no-login Treasurer link captures explicit confirmation or actual-amount differences automatically. Opening a link is read-only. Deposits are tracked separately, cannot precede handover or exceed acknowledged funds, and require bank evidence before confirmation. Handovers/deposits never add income a second time. Legacy handover records remain retained.

Messaging is explicitly a placeholder. Sender/provider/service-account metadata may be configured, but no email/text worker or credentials are enabled. Notifications remain Not sent; private invitation/acknowledgment links may be copied. No fake members, staff accounts or transactions are seeded live. See FINANCE-GOVERNANCE.md for staff workflows, limits and exact deployment scope.

Validation: 71 unit tests; 56 Firestore rules checks; 21 new platform integration checks; 12 existing finance, 18 attendance/card and four voter-register backend checks; nine platform, ten finance and eight voter-register browser checks; plus full portal health checks. All transactional fixtures were confined to demo emulators.
