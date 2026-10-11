# Voter register and verified membership review

Open MPU Financial Portal → Finance Team → Reports & exports. Choose **Voter register — eligibility**, set **Eligibility as of**, and apply member, LGA, Date Joined or eligibility filters. Export the same filtered members as Excel, CSV or PDF. This is a private draft for EC verification, not publication of the final voter register.

The report includes permanent MPU number, full name, LGA, Date Joined, quarterly attendance count / four annual meetings / rate, applicable minimum, bonus attendance, verified dues, `status` (`Active` / `Not Active`), eligibility, reasons, report date and the boolean `voterEligible`. Excel uses a real boolean. PDF combines related attendance/eligibility fields into readable columns without omitting their values.

Quarterly attendance is calculated by unique quarter using the authoritative meeting record and selected cutoff date. Duplicate scans do not raise the count. Rescheduled meetings retain their identity; canonical corrections supersede linked old manual records. Presence before Date Joined or after the cutoff does not count. Bonus meetings are counted separately. Unclassified historical attendance requires review; it is not silently assumed to be quarterly.

Under six months is probationary. From six months to under one year, the user-approved requirement is two quarterly meetings since Date Joined, even when those quarters span two calendar years. The Attendance Period column makes this window explicit. At one year or more the requirement is three of four, or 75%. A newer member with two meetings shows 50% but meets the applicable two-meeting requirement. Attendance shortages become a confirmed negative only when enough applicable held quarterly registers are closed; unfinished/missing registers are marked for review.

Use **Voter eligibility / Date Joined** in the member record, or **Review [member]** in the filtered report, to save Date Joined, optional date of birth, verified age, dues, membership standing and other constitutional membership qualifications. The review requires full Finance / Chairman / Admin access, password unlock, source evidence/reason and the current review revision. Changes are audited and repeat-request protected. Missing evidence may remain Needs Review. Do not mark Paid from a pending Zelle receipt or an undated opening balance; Financial Secretary verification is required.

Reviews are specific to the selected date and identity dates. Changed payment status, new receipt evidence or balance snapshots invalidate a previous Paid review until rechecked. The `status` and `voterEligible` fields are calculated on the server when generating the report, not stored as stale eligibility flags. Missing evidence means `voterEligible: false`, with Needs Review retained separately. Not Active in this draft includes unverified active standing and does not itself suspend a member. An explicit official inactive/suspended/terminated/elapsed membership state cannot be overridden by an old Active review.

The full Constitution's ambiguities remain documented in the source-cited constitutional-question reference. The report implements the six-month/two-quarter and annual/three-quarter interpretation expressly requested by the user. No age, registration date, financial standing or historical attendance is invented.

## Release scope

Deploy only `functions:financeCommand,firestore:rules,hosting` for this change. Other finance, attendance, education and election services retain their deployments. Preserve dated source ZIPs and rollback metadata. No test members are seeded in the live project.

The cursive designer credit uses the locally bundled OFL-licensed Dancing Script font. Shared portal pages show **Designed by Amara Dunkas**. Official source Word/PDF attachments remain unchanged; the website credit is hidden when printing forms.
