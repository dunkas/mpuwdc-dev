# Member cards and Meeting Attendance

## Portal entries

`/finance/` is the shared entrance with three destinations: My Member Account, the complete Finance workspace (`/finance/workspace/`), and Meeting Attendance (`/attendance/`). The separate electoral Finance Team tab and member-account-card finance link stay removed. Old Finance Team and Attendance URLs redirect to the correct new tools. Finance retains thirteen sections, including membership/card management and read-only attendance reports; attendance recording is in the Attendance Center.

## Staff operation

1. An administrator grants `attendance` or `finance_assistant` as the user's Finance role in User Access. Finance, Chairman and Admin also have attendance access. Staff verify their email and set their own Firebase Authentication password; there is no shared attendance password.
2. In Finance → Members & balances, search the member and open **Record & QR card**. **Issue MPU number & card** reserves a permanent unique number and a random active QR token. Download a phone card or print the front and back at 85.6 × 53.98 mm (print at actual size). Members without accounts can receive printed cards. Existing optional HTTPS photo URLs appear in the member record and printed card; digital PNGs contain identity and QR without relying on cross-origin photo downloads.
3. Authorized Finance/Chairman/Admin staff create the regular meeting, date and attendance-counting flag. Stable meeting IDs remain the same if names or dates change. Attendance counting is separate from voting eligibility and quorum decisions.
4. Staff unlock Attendance Center with an approved account and password, select the meeting, and use **Scan Member Cards**, **Import Scanner Records**, or **Manual Entry**. The scan shows the member identity; the volunteer checks the person against it. A copied QR does not itself prove identity.
5. Offline phone use requires opening and preparing the page/meeting while online. Pending operations persist in IndexedDB and survive reload, but reopening the application requires a connection; there is no promise of offline first launch. The device retains pending operations until server confirmation. On reconnection, unlock again if necessary and sync. Pending counts are distinct from confirmed presence. Staff can review/remove their own unresolved operations without deleting confirmed attendance.
6. A 2D scanner must support QR codes on paper and screens, persistent batch memory and usable USB text/CSV export. Manufacturer hardware specifications and actual export format must be checked before buying. Codes-only imports do not invent scan times. Preview flags unknown/replaced cards, removes repeated codes, and lets the operator include recognized records. Save in batches of at most 50; each batch is atomic and durable. Keep scanner memory/files until all intended records are confirmed. Camera permission and real Android/iPhone/scanner hardware need a physical check before meeting day.
7. Export attendance or LGA summaries as CSV, or print/save the report as PDF. Existing histories remain available in My Member Account. Close the meeting when recording is finished; only authorized staff may reopen it or correct attendance, with a reason and current revision.

The shared chapter defaults to **Washington DC Chapter**. Only Chairman/Admin can change that setting in Attendance Center; it applies to all members and new card downloads. Printed cards require reprinting after a chapter change.

## Database safeguards

Existing `members/{id}` remain the register; auth `users/{uid}` are not substituted for members. Unique `memberNumbers/{MPU number}` reservations and a transactional counter allocate numbers. `memberQRTokens/{SHA256 token}` verifies token ownership and active status. The random token is stored privately in the member record for card regeneration; the image is generated when needed. Replacing a card marks its old token inactive and preserves the number and history.

`meetings/{id}` holds stable identity and metadata. `attendanceEntries` holds one canonical record per member/meeting. Transactions handle competing phones, repeated gun uploads and manual duplicates. New attendance requests have idempotency records and audit history. Older Finance House and manual attendance sources are bridged without deleting source documents. Legacy meetings retain their original key mapping; alternate older document IDs are recognized. Legacy policy flags remain unknown until an administrator reviews them. Direct client writes to either attendance collection and QR identity fields are denied. The former finance attendance mutation commands reject writes and direct users to the new center.

The stored attendance-counting flag excludes nonqualifying meetings from the existing annual finance compliance calculation. Existing policy thresholds are preserved; this release introduces no new 75% eligibility or quorum rule. Messages remain queued; delivery providers have not been connected.

## Verification and deployment

Use demo-mpu-finance only for fictional integration/browser data. Run the existing finance unit/integration checks plus `test/member-services.integration.cjs`, the QR browser check `tests/member-account/qr-attendance.cjs`, finance-house browser checks, privacy rules and portal-health checks. Camera scanning is tested with a simulated video stream and the real decoder, not a physical phone or scanner.

Commit first, run `tools/package-release.py`, preserve the current Hosting and rule rollback archive and deployed function source references, then deploy only to mpuwdc-dev. Functions must be explicitly selected: financeCommand, financeComplianceDaily, memberCard, attendanceData, attendanceCommand. The original election functions must not be replaced. Do not include private migration data, credentials, dependencies or logs in the release ZIP.

## Quarterly schedule and bonus meetings
Attendance Center shows four permanent quarterly slots per selected year. Staff set real dates; blank slots cannot accept attendance. Extra meetings default to bonus attendance, count toward the existing attendance count, and never increase the four regular meeting slots. Existing eligibility minimums are unchanged. Meeting dates need not fall within their named quarter when meetings are rescheduled, but must remain in their assigned year.

Saving a meeting atomically publishes its linked calendar event. Staff can choose an existing calendar event when first creating a quarter or bonus meeting; deadlines are never imported automatically. Calendar administration directs linked meetings to Attendance Center, where password protection, audit reasons and revision checks apply. Existing attendance history and unlinked election events are preserved.
