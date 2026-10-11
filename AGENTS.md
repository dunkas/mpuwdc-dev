# Release safeguards

The user requires version control and a ZIP before every deployment. Before deploying, run relevant checks, commit the complete release, and create a dated ZIP tied to that commit. Preserve a rollback archive of the current deployed Hosting release and its Firestore/Storage rules when replacing them. Record commit ID, Firebase version IDs and SHA-256 hashes in a release manifest. Never include credentials, environment files, node_modules or logs in release archives. Keep prior dated archives.

Use the existing checkout; cloud tasks are already isolated. Deploy only the authorized development project mpuwdc-dev. A Hosting restoration must preserve unrelated education, calendar, candidate and member-account changes. The restored Finance House uses already-deployed finance callable services; do not replace all Cloud Functions with the obsolete functions/index.js. Recovered server source is in recovery/finance-functions as a reference.
