# Kshamawani 2026 Apps Script backend

The website uses the Google Apps Script web-app contract in Kshamawani2026.gs.

1. Open the Google Sheet that should contain the registrations and audit trail.
2. Open Extensions → Apps Script for that spreadsheet.
3. Add or replace the server code with Kshamawani2026.gs.
4. Run once from the editor to authorize the Spreadsheet service.
5. Deploy as a Web App, executing as the owner, with access configured for the public registration flow.
6. Use the deployed /exec URL in data/kshamawani-2026.json.
7. Test one registration and confirm the Kshamawani Registrations and Kshamawani Audit sheets are created before opening the public form.

The public page uses JSONP only for read-only lookup. Token issuance is a POST action and is recorded in the audit sheet.
