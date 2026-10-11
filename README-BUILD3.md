# MPU Firebase Platform — DEV Build 3

Projects:
- DEV: `mpuwdc-dev`
- PROD: `mpuwdc`

## What changed in this build
- Compact **Current Election Phase** hero replaces duplicate Happening Now / Coming Next cards.
- Prominent, automatically calculated **DAYS LEFT** badge.
- Configurable **Important Now** panel with Info (blue), Important (gold), Urgent (red), and Success (green) severity styles.
- Collapsed **Need help?** contact area so contact information does not compete with the current phase.
- **Current → Next → Upcoming** timeline is driven by the editable Event Calendar.
- Home page simplified to four core election actions + three supporting services.
- Added public **Register Review** workflow (`/register-review/`) with DEV test records.
- Members can report corrections but cannot directly edit official records.
- Added Admin **Register Review & Corrections** queue (`/admin/register-review/`).
- Enhanced **Calendar Management** to control phase type, action button label, and action URL.
- Enhanced **Portal Configuration** to edit Important Now, contact/help, colors/severity, and homepage visibility without changing page code.
- Original editable **EC Work Plan** remains under `/admin/work-plan/`.
- Voter Education consolidates Quick Reference, Know Your Rules, Crash Course, Calendar, Forms, Full Rules, handwritten instructions, and photo/scan submission guidance.

## DEV data note
This build uses a data-provider layer (`public/assets/runtime.js`) backed by browser localStorage so the complete UI/workflow can be tested before Firebase Authentication/Firestore credentials are wired in. The page markup is already separated from the data provider, so Firestore can replace localStorage without redesigning the pages.

### Register Review DEV test accounts
- `test.member@mpu.dev`
- `sample.voter@mpu.dev`

## Test locally
```bash
firebase use dev
firebase serve --only hosting
```

Open:
- `/` — compact portal
- `/event-calendar/` — public event timeline
- `/register-review/` — member register review
- `/admin/` — admin center
- `/admin/calendar/` — timeline/calendar editor
- `/admin/settings/` — Important Now + contact config
- `/admin/register-review/` — correction queue
- `/admin/work-plan/` — original editable work plan

## Deploy DEV only
```bash
firebase use dev
firebase deploy --only hosting,firestore
```

Do not deploy to `mpuwdc` production until Firebase Authentication, role enforcement, Firestore shared configuration, and real source records are connected and tested.
