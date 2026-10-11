# MPU Firebase Platform — DEV Build 2

Build 2 reorganizes the portal before deep backend integration.

## Public changes
- Removed the two explanatory yellow strips from the home page.
- Consolidated education under **Voter Education**.
- Added Voter Education Center with:
  - Know Your Rules
  - Election Crash Course
  - Event Calendar
  - 2026 Election Forms
  - 2026 Election Rules
  - Electoral Guidelines — Quick Reference
- Replaced the old full-rules home button with **Electoral Guidelines — Quick Reference**.
- Renamed Election Calendar to **Event Calendar** so the platform can continue after the 2026 election.
- Kept Payment, nominations, candidate access, questions and incident reporting on the public election hub.

## EC Admin changes
- The original editable HTML EC Work Plan is preserved at `/admin/work-plan/`.
- Added Calendar Management at `/admin/calendar/`.
- Added Document Center at `/admin/documents/`.
- Added Portal Settings shell at `/admin/settings/`.
- Finance remains a separate admin role/workspace.
- Added placeholders for controlled source-Sheet links so authorized admins can open the real Google Sheet when necessary during the hybrid phase.

## Important DEV behavior
The calendar editor currently stores events in browser localStorage to preserve the editable prototype behavior before Firestore is connected. In Build 3 this will move to shared Firestore records so changes made by one authorized admin appear to all users.

Likewise, the original Work Plan is preserved now; its editable state will be migrated from browser-local state to Firestore in Build 3 so EC members share one live plan.

## Test
```bash
firebase use dev
firebase serve --only hosting
```
Then test:
- `/`
- `/voter-education/`
- `/event-calendar/`
- `/admin/`
- `/admin/work-plan/`
- `/admin/calendar/`
- `/payment/`
