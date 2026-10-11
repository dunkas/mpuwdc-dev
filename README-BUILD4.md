# MPU Firebase Platform — DEV Build 4

Build 4 completes the pre-auth document/submission layer requested before Firebase Authentication is connected.

## Added / changed
- Document Center renamed to **Document Center & Printing**.
- Central controlled document registry with View / Print actions.
- Printable **Candidate Plain-Paper Submission Template**.
- Public **Handwritten & Photo Submission Guidance** page.
- User-provided handwritten sample included as a clickable visual example.
- Plain paper explicitly accepted when all required information is included, signed and dated.
- Signature certification language now states that signing fulfills the declaration/acknowledgment requirement for the signed submission, while eligibility remains independently verified from official MPU records.
- Photo/scan instructions require a clear complete page, visible signature, identifiable sender, retainable/printable record, and applicable deadline compliance.
- EC Admin reorganized into compact **Operations & Records** plus **Administration Work Areas**, reducing duplicate cards.
- Added planned Audit & Activity Log entry for the Firebase Auth phase.

## Key DEV routes
- `/voter-education/`
- `/voter-education/submission-guidance/`
- `/documents/plain-paper-candidate-template/`
- `/admin/documents/`
- `/admin/`

## Next build
Firebase Authentication + Firestore shared state + role-based admin access + audit identity.
