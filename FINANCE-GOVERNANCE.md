# Finance access, member Zelle and Treasurer acknowledgments

The Financial Portal starts with **Record My Zelle Payment**. Members sign in with the verified email of exactly one registered, unarchived member. Existing members are reused, not registered again. Members without an online account can create their own password account and verify it through Firebase Authentication, or use the existing member-account email sign-in link. Firebase account emails are separate from the financial messaging placeholder.

## Zelle submissions

Only Zelle details are submitted by members. Confirmation number is optional. Each submission produces a printable submission acknowledgment, marked **awaiting verification**, plus an unsent notification record. It is not a bank-confirmed receipt or new collection. Date/amount/member duplicate keys, reference reservations, existing receipt checks and repeat-request protection prevent recording the same funds twice. Two legitimate equal transfers on the same date need Finance review rather than repeated self-submissions.

Finance → Member submissions supports Under Review, Verified and Rejected with bank evidence/reason. Verification creates one official receipt, or links an existing verified matching receipt. An existing pending matching receipt must first be verified in the receipt book. Legacy submissions retain their old receipt-link review workflow. Rejected submissions remain retained with their duplicate keys. Historical balances remain dated snapshots; recording or verifying a receipt does not blindly subtract it from a balance that may already include it. Finance reconciles opening balances through reviewed snapshot corrections.

## Individual staff access

Chairman/Main Admin opens **Manage Staff Access** from Finance or `/admin/users/`. Password unlock is required. Enter name, email, role and a reason. New staff receive an expiring invitation to choose their own password; completing the secure invitation verifies possession of the invited email. While messaging is unconfigured, Admin copies the private invitation link and shares it securely. No common/preset password is assigned.

Existing accounts must sign in with their existing verified password to accept an invitation. The invitation does not reset their password. Admin can issue a replacement invitation, change roles/additional finance permissions, or disable access. Staff role changes are audited; disabling a role immediately blocks server/database access even with a cached token. The last enabled Chairman/Main Admin cannot be removed. No staff accounts are created in the live site by this release; authorized Admin manages actual users.

Available roles include Chairman, Main Admin, Finance, Auditor, Attendance, Receipt Printer, Print + Attendance, and existing EC roles. Member accounts do not receive staff access. A Treasurer acknowledgment recipient does not need a staff account. Existing EC role plus additional limited finance access is preserved in access management.

## Member corrections

Finance may correct name, email, phone and Date Joined with a reason and current revision. Email corrections update linked receipt ownership and legacy attendance ownership, and clear stale user-UID ownership. Duplicate contacts are rejected for review. Date Joined corrections invalidate dated eligibility evidence. Large historical contact changes over the supported atomic batch limit require a reviewed migration rather than a partial update.

LGA, membership Active/Not Active, archive and duplicate merge changes are requested by Finance and approved/rejected by Chairman/Admin. Permanent MPU numbers do not change. Archiving revokes the old card. A duplicate merge retains the duplicate as an archived alias, links its historical receipts/attendance to the surviving record, and preserves original document identities and balances. Member account and staff history can display linked histories; quarterly eligibility deduplicates qualifying quarters. Merged balances require fresh reconciliation and eligibility review, never automatic addition. Reopening a merged alias is not offered; undoing a merge requires a reviewed migration. Ordinary archived members may be reactivated with approval and then receive a replacement card.

## Physical handover and secure Treasurer confirmation

1. Finance and Treasurer sign the physical register.
2. Finance opens **Funds Handover & Deposits**, selects existing cash/check receipts and enters the same date, register reference, exact cash/check amounts, recipient email and optional phone.
3. Submit reserves those receipts for one handover. A notification is queued with a secure acknowledgment link. Direct-bank Zelle is excluded from physical handovers.
4. Treasurer opens the link without logging in, reviews the amounts, and chooses **Confirm Received** or **Report a Difference** with actual cash/check amounts and a note.
5. The response is recorded automatically and an unsent Finance notification is queued. There is no manual acknowledgment entry by the secretary.

Opening a link is read-only. Links are random 256-bit bearer tokens, scoped to one handover, expire after seven days and require an explicit response. Only the hash is in the link registry; raw links appear only in the protected delivery outbox and immediate issuing response. Tokens are sent in URL fragments, removed from browser history on load, and not included in URLs sent to the server. Reissuing an unanswered handover link invalidates its predecessor. A completed acknowledgment cannot be silently overwritten. Discrepancies are documented through immutable response evidence and audit findings. Link possession is recipient acknowledgment, not a legal digital signature or bank verification.

The signed register can be attached under **Supporting evidence → Handover**. Old unlinked handovers remain visible and require reconciliation; they are not automatically treated as new receipt-linked batches. Old authenticated acknowledgment endpoints are retired.

## Deposits and audits

After the Treasurer responds, Finance may record actual deposit date, amount, bank reference and notes. A difference response permits deposits up to the amount actually acknowledged; the original shortfall remains visible to auditors. Partial deposits are supported; totals cannot exceed the handover. These are custody/deposit records, not member payments or income. Supporting evidence → Deposit accepts the deposit slip/statement. Bank confirmation requires stored evidence. Incorrect deposits are voided with a reason and re-entered; historical versions remain in the audit trail. A confirmed deposit does not prove an individual check will never be returned; returned-check corrections and audit findings remain separate evidence.

Auditors use the same password-protected staff workspace with Audit & Reconciliation, Receipt Book, Reports & exports, and Activity Log only. They read financial records and checksum-verified evidence, export period-filtered reconciliation reports, raise findings, review Finance responses and record resolutions. They cannot edit payments, balances, member details, handovers, deposits, or staff access. Finance can respond to findings but cannot close its own audit findings. Chairman/Admin can also review and resolve them.

Cash/check reports show original handover, Treasurer response, recorded deposits, bank-confirmed deposits and unconfirmed difference. Direct-bank Zelle is listed separately for statement comparison. This release does not automatically import a live bank feed or claim a recorded payment is present in a bank statement. Auditors compare uploaded evidence and flag missing/duplicate transactions.

## Messaging placeholder

Configuration → Email & phone delivery stores sender display name/email, provider placeholders and optional service-account email. **Never paste credentials into these forms.** No credential upload, SMTP/Gmail/Twilio dispatch or provider worker is enabled in this release. All financial notifications remain **Not sent — delivery service not configured**. Queueing is not sending. Provider credentials and a provider-specific sender implementation must be connected and tested in a subsequent update; invitation and handover links can be copied securely in the meantime. SMS requires an international-format Treasurer phone.

## Security and release

All staff mutations require verified authentication, password session and server-assigned permissions. Direct client edits to staff roles, member records, payments and financial configuration are disabled; direct delivery-outbox access is disabled to protect bearer links. Existing first-sign-in profile creation and own-member reads remain supported. Evidence uploads remain immutable and checksum-verified. No public staff register, bank password or test member is exposed.

Deploy explicit names only: `financeCommand`, `financeData`, `financeFile`, `openFinanceSession`, `memberCard`, `financeGovernance`, `staffAccess`, `memberZelle`, `financePublicLink`, plus Firestore rules and Hosting. Unrelated election, attendance and scheduled services retain their deployments. Preserve previous Hosting/rules and backend source metadata, commit the full release, and create the dated source ZIP before deploying development project `mpuwdc-dev`.
