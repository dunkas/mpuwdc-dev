# Recovered live finance service source

Recovered October 11, 2026 from the active financeCommand Cloud Function build. Reference and test baseline only: this is not the functions deployment source in firebase.json. The deployed finance services remain active and are not redeployed by the UI restoration. Private legacy member/education data are intentionally excluded. Do not deploy this index as a replacement for all functions: electionLegacy requires separately retained private data.

Run npm ci, then node --test test/finance-*.test.js. The restored interface connects to existing financeCommand, financeData, openFinanceSession and financeFile functions in us-central1.
