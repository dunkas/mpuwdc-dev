# MPU Firebase Platform — DEV Build 7 (FULL REPLACEMENT)

Build 7 is a complete replacement ZIP and continues from Build 6.

## New in Build 7 — Authentication & Shared Team State
- First-time Firebase-authenticated users automatically create a **Pending Approval** user profile.
- Chairman/Admin can approve users and assign roles from **EC Admin → User Access & Roles**.
- Pending users cannot enter EC Admin until a role is assigned.
- Roles supported: chairman, admin, ec, secretary, voter_register, screening, communications, finance.
- Finance remains separate from general EC work by default.
- Added **Shared EC Work Plan** with Firestore-backed task completion, Yes/No/Needs Help readiness, editable deadlines and notes.
- The original editable/executive Work Plan is still preserved and linked alongside the shared tracker.
- Firestore rules now permit a user to create only their own `pending` profile on first sign-in; only chairman/admin may assign roles.
- Audit log records role changes and shared Work Plan updates when Firebase is connected.

## Important: Firebase Web App config is still required
In `public/config.js`, paste the real `mpuwdc-dev` Firebase Web App `apiKey` and `appId`.

Then in Firebase Console:
1. Authentication → Sign-in method → enable **Email/Password** and **Email link (passwordless sign-in)**.
2. Authentication → Settings → Authorized domains → confirm `mpuwdc-dev.web.app`, `mpuwdc-dev.firebaseapp.com`, and localhost for testing.
3. Create Firestore Database.
4. Deploy the included Firestore rules.

## Bootstrap the first Chairman account
Because every first-time user starts as `pending`, the first chairman role must be bootstrapped once in Firebase Console:
1. Sign in through `/admin/login/` with the chairman email.
2. In Firestore, open `users/{uid}` for that account.
3. Change `role` from `pending` to `chairman` and `status` to `Active`.
4. Refresh `/admin/`.

After that, Chairman/Admin can approve everyone else entirely from **User Access & Roles** without editing Firestore manually.

## Clean local test
```bash
firebase use dev
firebase serve --only hosting
```

## Deploy DEV
```bash
firebase use dev
firebase deploy --only hosting,firestore
```

Do not deploy to `mpuwdc` production until DEV is approved.
