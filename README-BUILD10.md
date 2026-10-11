# MPU Firebase Platform — DEV Build 10 FULL (repair/completion build)

Build 10 fixes the core problem in Build 9: cloud features were present in the files but the deployed site could still run with placeholder Firebase Web App credentials.

## What Build 10 changes

- Automatically discovers the active Firebase Hosting project's public web configuration from `/__/firebase/init.json`.
- No manual API key/app ID paste is required when running on `https://mpuwdc-dev.web.app`.
- Adds first-chairman bootstrap for the supplied legacy EC email `dunkas@gmail.com`.
- Adds `/admin/system-check/` to verify Firebase, authentication, role and Firestore readiness.
- Keeps Finance, Reports, Import Center, CSV/Excel/PDF exports and the 5/6-month compliance workflow from Build 9.
- Keeps the approved homepage design; this is a repair build, not a redesign.

## Deploy DEV

From the extracted Build 10 folder:

```bash
firebase use dev
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Open:

- Public DEV: https://mpuwdc-dev.web.app
- System Check: https://mpuwdc-dev.web.app/admin/system-check/

## One-time Authentication setup

In Firebase Console for `mpuwdc-dev`:

1. Authentication → Sign-in method.
2. Enable **Email/Password**.
3. Enable **Email link (passwordless sign-in)**.
4. Authentication → Settings → Authorized domains → make sure `mpuwdc-dev.web.app` is present.
5. Open `/admin/login/` and sign in with `dunkas@gmail.com` for the first Chairman bootstrap.

## Import supplied legacy data

After Chairman sign-in:

1. EC Admin → Import Center.
2. Import **Access Roles**.
3. Import **Candidate Data**.
4. Import **Education Data**.

The source snapshots are already included in `public/assets/legacy-data.json`. Old OTPs and temporary tokens are not reused as authentication credentials.

## Voter register / finance files later

Use Import Center to load CSV/XLS/XLSX when the official files arrive. Current import modules include:

- Voter / Member Register
- Payments / Finance Ledger
- Dues / Levy Obligations
- Candidates
- Education Results

## Compliance notifications

The Finance module and Reports Center identify 5-month warnings and 6-month Suspension Review records.

Cloud Functions can run the scheduled daily compliance check. Deploying functions may require the Firebase billing tier needed by scheduled functions:

```bash
firebase deploy --only functions
```

Important: the included function writes outbound-email jobs to a `mail` collection. Actual email delivery requires a configured mail provider / Firebase Trigger Email extension. Without that provider, the system still creates the in-app notification queue and compliance records, but it cannot send external email by itself.

## Recommended validation order

1. Deploy Hosting + Firestore rules.
2. Open System Check.
3. Confirm Firebase shows **Connected**.
4. Enable passwordless Email Link authentication.
5. Sign in as Chairman.
6. Confirm role shows **chairman**.
7. Open Finance and create one test payment.
8. Refresh browser and verify the payment persists.
9. Open Reports and confirm the test payment appears.
10. Import legacy Access Roles, Candidate Data and Education Data.
11. Only after these pass, load the official voter/finance files when available.
