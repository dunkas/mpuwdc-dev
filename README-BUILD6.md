# MPU Firebase Platform — DEV Build 7 (FULL REPLACEMENT)

This is a complete build, not a patch. If an earlier build was partially copied, remove that local folder and use this Build 7 folder as the new source of truth.

## Build 7 visual fixes
- Wider Current / Next / Upcoming election-timeline tabs.
- Timeline forced to one desktop row; mobile uses a clean horizontal scroller rather than squeezing text.
- More pronounced DAYS LEFT badge with a larger number and stronger visual weight.
- Stronger Important Now severity presentation:
  - Information = blue `i`
  - Important = gold `!`
  - Urgent = red `!`
  - Success = green `✓`
- Notification body inherits a subtle severity tint and stronger left accent.
- Default Important Now message is specific to the Oct 11–17 provisional-register review.
- Cache-busting asset versions added so browser caching does not make an old layout look like the new build failed.
- Firebase Hosting headers in this DEV package use no-cache for HTML/CSS/JS to make design iteration reliable.

## Everything from prior full builds is included
- Public MPU Electoral Portal
- Zelle-only MPU Payment and QR
- Voter Education center
- Quick Reference
- Event Calendar
- Register Review + correction workflow
- Candidate-system transition links
- EC Admin
- Document Center & Printing
- Handwritten/plain-paper submission guidance
- Photo/scan submission guidance
- Clickable handwritten sample
- Printable plain-paper candidate template
- Finance Verification transition workflow
- Original editable EC Work Plan preserved under Admin
- Firebase Authentication scaffold
- Firestore role/security rules scaffold
- Portal Configuration + shared Firestore-ready settings
- Calendar Management
- Audit & Activity Log foundation

## Recommended clean test procedure
1. Delete or rename your old local MPU Firebase build folder.
2. Unzip this full Build 7 package into a new folder.
3. From the Build 7 folder run:

```bash
firebase use dev
firebase serve --only hosting
```

4. Hard-refresh the browser once (`Ctrl+Shift+R`). The Build 7 files themselves also include cache-busting URLs.

## Deploy DEV after local review

```bash
firebase use dev
firebase deploy --only hosting,firestore
```

Do not deploy to `mpuwdc` production until the DEV version is approved.

## Important Firebase config
`public/config.js` still contains placeholder Firebase Web App values unless you already inserted your real DEV config. Add the `mpuwdc-dev` Web App `apiKey` and `appId` before testing real Firebase Authentication/Firestore.
