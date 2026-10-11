# MPU Firebase Platform — DEV Build 8 FULL

Build 8 is the full replacement baseline implementing the final approved public homepage design.

## Final homepage changes
- Preserves the exact MPU logo asset already used in the platform.
- Retains the dynamic Current Election Phase and admin-controlled Important Now panel.
- Replaces the old three-chip timeline presentation with the approved visual election timeline while keeping events data-driven.
- Removes duplicate Home-page Voter Education card.
- Removes standalone Questions for the EC and Election Incident Report cards.
- Removes the old standalone Need Help link from the timeline.
- Consolidates Ask a Question + Need Help + Report Incident into one Contact EC card.
- Keeps the three candidate actions together: Nominate Another Member, Enter as a Candidate, Candidate Access.
- Keeps MPU Payment as the public member payment entry point.
- Adds one compact "2026 Election Rules — Handwritten & Signed Photo" strip with:
  - Read 2026 Election Rules
  - See Handwritten Sample
  - Submit Signed Photo
- Forms, rules, calendar, and education remain centralized in the Voter Education hub instead of being duplicated on Home.
- No Document Center / Event Calendar / Latest Notice cards are repeated at the bottom of the Home page.

## Important behavior
The screenshot was approved as the visual design. The actual phase title, dates, days-left value, timeline events and Important Now content continue to come from MPU runtime / Firebase configuration, so the live portal remains operational rather than hard-coded to the sample screenshot.

## Deploy to DEV
From this extracted folder:

```bash
firebase use dev
firebase deploy --only hosting
```

Public DEV URL:

https://mpuwdc-dev.web.app

## Firebase
This build does not change the Firebase project architecture. Existing Auth / Firestore / role scaffolding from Build 7 remains in place.

## Baseline rule
Use this Build 8 FULL package as the new baseline. Future builds should continue to be delivered as complete replacement ZIPs, not patches.
