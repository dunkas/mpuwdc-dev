# MPU Firebase Platform — DEV Build 5

Projects
- DEV: `mpuwdc-dev`
- PROD: `mpuwdc`

## Build 5 adds
- Wider Current → Next → Upcoming timeline tabs with mobile horizontal flow.
- Stronger Days Left badge.
- Important Now severity markers and highlighted panel:
  - Information = blue `i`
  - Important = gold `!`
  - Urgent = red `!`
  - Success = green `✓`
- Firebase passwordless email-link authentication scaffold for EC Admin.
- Role-aware Admin dashboard cards.
- Firestore-backed Portal Configuration and Event Calendar when Firebase credentials are supplied.
- Firestore audit-log foundation.
- Firestore-backed Register Correction queue foundation.
- DEV local fallback remains available while Firebase Web App credentials are being connected.

## IMPORTANT: deploy DEV first
Do not deploy this build to `mpuwdc` production until authentication, roles and Firestore rules are tested.

## 1. Add the Firebase Web App credentials
In Firebase Console, open project `mpuwdc-dev`:

Project Settings → General → Your apps → Web app

If a Web app has not been added yet, add one named `MPU Electoral Portal DEV`.
Copy the Firebase config values into:

`public/config.js`

under:

```js
firebase: {
  dev: {
    apiKey: '...',
    authDomain: 'mpuwdc-dev.firebaseapp.com',
    projectId: 'mpuwdc-dev',
    appId: '...'
  }
}
```

Do not paste service-account keys into the website.

## 2. Enable passwordless email-link Authentication
Firebase Console → Authentication → Sign-in method → Email/Password

Enable:
- Email/Password
- Email link (passwordless sign-in)

Make sure the DEV hosting domain is authorized:
- `mpuwdc-dev.web.app`
- localhost for local testing, if needed

## 3. Create Firestore
Firebase Console → Firestore Database → Create database.

Use production/security-rules mode rather than leaving a public test database open.

Deploy the included rules:

```bash
firebase use dev
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Create the first Chairman/Admin role
This is intentionally a manual bootstrap so the website cannot self-promote an account to admin.

1. Open `/admin/login/` and sign in with your authorized email.
2. Firebase Console → Authentication → Users → copy that user's UID.
3. Firestore → create collection `users`.
4. Create document whose document ID is the UID.
5. Add fields:

```text
email: your authorized email
role: chairman
active: true
```

Supported role names in this build:
- `chairman`
- `admin`
- `ec`
- `secretary`
- `voter_register`
- `screening`
- `communications`
- `finance`

Sign out and sign in again after assigning the role.

## 5. Initialize shared portal data
After the Chairman role works:

EC Admin → Config → **Initialize / Refresh Firebase DEV Data**

This copies the current DEV portal settings and event calendar into Firestore.

After this:
- changing Important Now in Config updates the shared Firestore record;
- changing an event in Calendar Management updates Firestore;
- the public homepage reads those values from Firestore without redeploying.

## 6. Test role access
Recommended DEV test accounts:
- Chairman/Admin
- Finance only
- Voter Register only
- Screening only
- Secretary only

Create each user in Firebase Authentication by having them sign in, then assign their `users/{uid}.role` document in Firestore.

Expected access examples:
- Finance → Finance Verification only among restricted work areas.
- Voter Register → Register Review / correction work.
- Screening → Candidate Screening/Nominations areas.
- Secretary → Document Center, records/audit related functions.
- Chairman/Admin → full oversight.

## 7. Deploy DEV Hosting

```bash
firebase use dev
firebase deploy --only hosting,firestore
```

Then test:
- `/`
- `/admin/login/`
- `/admin/`
- `/admin/settings/`
- `/admin/calendar/`
- `/admin/register-review/`
- `/admin/documents/`
- `/admin/audit/`
- `/admin/work-plan/`

## 8. DEV fallback behavior
`public/config.js` contains:

```js
authDevBypass: true
```

The bypass works only when the environment resolves to DEV and Firebase credentials are not connected. It does **not** bypass authentication on the production hostname.

Once Firebase DEV authentication is working, you may set it to `false` to force real sign-in even during local/DEV testing.

## 9. What is not migrated yet
The original editable EC Work Plan is preserved and now protected by the Admin role guard, but its internal React state is still session/local to that artifact. Converting its editable checkboxes/deadlines to shared Firestore state should be a separate controlled migration so we do not damage the version you like.

The existing Apps Script Candidate Portal, Know Your Rules and Crash Course are still transition systems until their adapters are connected.

## Production later
After DEV is approved, repeat the Firebase Web App/Auth/Firestore setup in `mpuwdc`, assign production roles, set `authDevBypass:false`, and deploy explicitly:

```bash
firebase deploy --project mpuwdc --only hosting,firestore
```
