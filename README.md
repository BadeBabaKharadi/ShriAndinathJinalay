# Shri Adinath Jinalay

Sprint 3 prototype: copy your transparent Maharaj image to `images/maharaj.png`.

## Kshamawani 2026 performance testing

The registration backend is designed for approximately 1,500 registrations. Public mobile and coordinator application-code lookups use a short-lived Apps Script cache index so normal lookups do not scan the full sheet on every request.

The read-only load test measures the real deployed Web App from outside Apps Script:

```bash
KSHAMAWANI_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
KSHAMAWANI_TEST_MOBILE="KNOWN_REGISTERED_MOBILE" \
npm run test:kshamawani-load -- --requests 300 --concurrency 10
```

For an application-code lookup instead:

```bash
KSHAMAWANI_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
KSHAMAWANI_TEST_CODE="KW26-0001" \
npm run test:kshamawani-load -- --requests 300 --concurrency 10
```

The test only performs reads; it does not create registrations or issue tokens. Keep concurrency at or below 30 for this test unless the Apps Script execution limits and observed results justify a different setup.

For production monitoring, the Apps Script execution history and Cloud Logging show the structured `kshamawani.performance` entries, including operation, cache-hit status, outcome, and duration. The Apps Script `getKshamawaniHealth()` helper reports row count and whether the lookup indexes are currently cached.

Before the event, run the test at increasing concurrency (for example 10, 20, and 30) and record p50/p95/p99 latency and error rate. Google Apps Script currently documents 30 simultaneous executions per user and 1,000 per script, so the load test should be treated as a validation of the deployed configuration rather than a guarantee of capacity. 
