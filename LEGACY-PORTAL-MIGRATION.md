# Legacy portal migration — required before disconnection

The user requires importing the old portal's calendar and forms before disconnecting it. Do not deploy the development removal of legacy links until this migration is complete and reviewed. The development portal now uses native pages; the original Google application remains available.

Source portal:
https://script.google.com/macros/s/AKfycbzAA5VH5g4ZaXtbU8cucsYVOrwve7JB6w_p9AwU9gl5TKgQGEF6fhdkgMY6l2t4vD9h7g/exec

Initial access was blocked; access was subsequently restored. The saved source URL now serves the EC Work Plan. The existing `public/assets/legacy-data.json` contains candidate and education records, but no calendar or form definitions. Existing local forms are new implementations; they have not been verified against the old portal's complete forms.

Required source: Apps Script project export (HTML and .gs files), plus the calendar's backing data export or feed and any separate Google Form definitions or linked form files.

Migration checks:
- Inventory every calendar event and form before modifying the source portal.
- Preserve original dates, time zones, instructions, required fields, options and declarations; do not infer election rules.
- Copy events into the local calendar and compare count, dates, ordering and descriptions with the source.
- Implement each form locally, including attachments where required, and test validation, submission persistence, EC access and member confirmation.
- Preserve Portal Home navigation on guidance, sample and form pages.
- Keep the source portal available until the imported calendar and all forms have passed comparison and end-to-end tests.

## Uploaded document import

The user subsequently supplied the Official Election Timetable FINAL v2 (Word), FINAL V20 rules (PDF), and the combined V21 updated-timetable draft (Word).

- Imported all 15 timetable activities into the default calendar, retaining activity titles and descriptions. Existing custom calendars are preserved; only an untouched previous default calendar is replaced automatically. On October 11, 2026 all 15 official activities were imported into the previously empty live dev calendar.
- Extracted appendices A–L from V21 into 18 printable sections, including all three Appendix D pages. The main rules and adoption/signature section were excluded. Word relationships and embedded form artwork are retained in the appendix-only Word booklet.
- Added `/documents/v21-forms/`, individual/all print controls, an 18-page PDF, Word download, source timetable download, and Voter Education navigation. Draft and sample labels remain intact. FINAL V20 is a separate supplied reference, not a replacement for V21 appendix text.
- Timetable discrepancy for review: its source signature block says `Date: 10/7/2027`, although the election timetable is for 2026. Source file retained unchanged.
- Repeat the import with `python tools/import-election-documents.py TIMETABLE.docx V21.docx`; run `npm run test:v21 --prefix tests/member-account` with local Hosting running to regenerate and validate the PDF and navigation. No emulator data is reset by this test.

This imports the supplied calendar and printable appendix templates. It does not establish that every legacy interactive form, photo-upload endpoint, or historical submission has been migrated. Keep the source portal available until those remaining dependencies are checked. Only the mpuwdc-dev development site is deployed; production is unchanged.

## Education recovery and V21 clarification

The user selected V21. The Know the Rules landing page revealed a separate education Apps Script. Its client HTML was recovered, but its randomized question bank/answer keys remain server-side. The supplied public Day 1 Google Form supplied five exact questions. Native lessons use V21 text; other practice questions are cited V21 questions and are not represented as copied hidden originals. The supplied compliance checklist is retained as an EC reference, with a separate 43-question review document. Its Constitution Review 2023-2 citation does not establish ratification or amend the selected rules.
