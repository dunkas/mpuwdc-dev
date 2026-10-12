# Reviewed member obligations and calculated balances

Finance Workspace → **Member Obligations & Balances** provides approved yearly schedules, actual member charges, receipt allocations, credit applications, audited adjustments and Excel/PDF breakdowns. Members see their own charge breakdown in My Member Account after activation. Auditors have read-only ledger access and exports.

## Historical reconciliation and activation

No member ledger, real charge or approved rate is seeded by deployment. Until Finance explicitly activates a reconciled ledger, the member-facing balance remains the existing dated snapshot.

Choose one method:

- **Opening snapshot:** enter a reviewed amount and its inclusive cutoff date. Negative means reviewed credit; zero must be entered explicitly when no amount is known. Charges and receipt allocations start on the following day. Earlier payments and charges must not be counted again.
- **Reconstructed history:** start at zero on a reviewed historical date. Assign the actual historical obligations and allocate verified receipts from that date onward. Do not also add an opening snapshot containing that same history.

Prepare a draft, assign the applicable charges, allocate known receipts and review the breakdown. Activate only after checking the opening figure and all applicable charges/payments, with source evidence/reason. A baseline with assigned activity cannot be silently rewritten, and an active baseline is immutable. Corrections use audited adjustments or a reviewed migration. A report before the ledger start date does not replace its dated snapshot.

Activation confirms the reconciliation performed by Finance; it does not independently prove source documents are correct. Unknown historical figures must remain unactivated, rather than guessed as zero. An opening balance may already contain prior annual dues: never assign those dues again merely by choosing a later effective date.

## Approved schedules and member charges

Chairman/Admin approves payment purpose, year, category, standard amount and due date. Annual dues use a dues-qualified payment purpose. Updating a schedule preserves previously assigned charge amounts and their schedule revision.

Finance assigns only each member's actual obligations. Annual dues are unique by member, payment purpose and year. Pledges, tickets, levies and other items require a distinct charge reference. Finance uses the approved rate; Chairman/Admin can approve a different member amount. Charges before Date Joined require explicit Chairman/Admin approval. No automatic charge for all members, no assumed pasted-document rates and no automatic eligibility changes are introduced.

## Verified receipt allocations

One existing receipt can settle several obligations. Each line uses the receipt's original payment purpose and cannot exceed that purpose's receipt budget. Annual-dues charges cannot be settled using a donation purpose. Finance may explicitly allocate funds to the reviewed opening balance or available credit, with a reason. Receipts without reconciled payment-purpose allocations require a reviewed migration or the opening-snapshot method; their purpose is never inferred from a name or bank description.

Pending checks/Zelle, rejected/voided payments and returned checks do not reduce debt. If a previously allocated receipt is later rejected, returned or voided, the calculation stops counting it and shows the debt again. Handovers, bank deposits and outgoing transactions never enter this member ledger as additional payments.

Verified funds not allocated are displayed separately; they do not automatically clear obligations. Overpayment against a valid charge becomes available credit. Finance can apply available credit to another charge with an audited Credit applied adjustment. Chairman/Admin approves waivers and additional charges; adjustments may be voided with revision checks and preserved audit history. If the supporting credit later disappears, an unfunded credit application is excluded, the debt reappears and Needs Review is shown.

## Calculation and reporting

Amounts are stored and calculated in integer cents. Obligations and receipt allocations are aggregated independently; there is no SQL join multiplying dues rows by receipt rows.

For each charge: remaining = max(0, charge + approved additional charges − approved waivers − verified allocations − funded credit applications). Report totals show outstanding charges, available credit, unallocated verified funds and the net position separately. A positive credit does not silently settle a different year's dues without allocation.

Calculations use the selected cutoff date. Future activity is excluded. The snapshot stored on the member remains intact; the API overlays an activated ledger for display. Staff and member pages identify the calculation date. Draft calculations are clearly distinguished from activated figures.

Ledger changes increment the member's financial review version, invalidating old Paid evidence in voter eligibility reports until Finance reviews it again. A ledger does not automatically activate membership or grant voter eligibility. Merging a record with an active ledger requires a reviewed migration rather than combining balances blindly.

## Access and deployment

All mutations require verified staff authentication, password unlock, approved role, source reason and audited server transactions with idempotent request IDs. Auditors and ordinary members cannot mutate ledgers. Direct Firestore reads/writes to the ledger collections are disabled; own-member breakdowns are provided through the authenticated member service. Locking clears private ledger data.

This release deploys only financeLedger (new), financeCommand, financeData, memberZelle and financeGovernance, plus Firestore rules and Hosting. Preserve the prior release and rules, commit the complete source and create a dated source ZIP before deploying development project mpuwdc-dev. Email/text delivery remains the existing unconfigured placeholder.
