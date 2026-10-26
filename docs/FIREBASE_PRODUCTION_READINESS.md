# TalkOS Firebase release checklist (20 October 2026)

## Deployment model
- Firebase Hosting serves only the Vite static web/PWA build (`npm run build:pwa`).
- Firebase Hosting **does not run** `server.ts` or expose Express `/api/*` routes. A separately authenticated backend (e.g. Cloud Run) and explicit Hosting rewrites will be required if those APIs are needed.
- The manual `Firebase Staging Preview` workflow deploys a **temporary preview channel** in a **separate staging Firebase project**. It never deploys to the live channel or changes Firestore rules.
- Do not configure a production deployment or share a public POS URL before security remediation and test sign-off.

## Required GitHub environment configuration
Create environment `firebase-staging` with required reviewers if available.
Set environment variables:
`FIREBASE_STAGING_PROJECT_ID`, `STAGING_FIREBASE_AUTH_DOMAIN`, `STAGING_FIREBASE_STORAGE_BUCKET`, `STAGING_FIREBASE_MESSAGING_SENDER_ID`, `STAGING_FIREBASE_APP_ID`, `STAGING_FIREBASE_DATABASE_ID`.
Set environment secrets:
`STAGING_FIREBASE_API_KEY`, `FIREBASE_STAGING_SERVICE_ACCOUNT`.
The service account should have only the Firebase Hosting permissions needed for the staging project. Never paste service account JSON into GitHub source code. Enable Firebase Hosting on the staging project before running.

## Mandatory security blockers
1. `firestore.rules` currently permits public creation of `orders`, `pos_orders`, and `tickets`, and broad writes to menu products. These permissions are **not production-safe**. Design authenticated staff writes and a validated, rate-limited guest-checkout backend before restricting rules; otherwise existing QR flows may break.
2. `server.ts` contains hardcoded aggregator token-like strings, synthetic connection statuses and synthetic revenue/order totals. Treat all exposed tokens as compromised until the providers confirm otherwise; revoke/rotate any genuine keys. Disable mock integrations in production and require verified provider signatures, idempotency, and durable order writes.
3. The server accepts unauthenticated guest and webhook requests and uses an in-memory fallback. Do not expose it publicly before implementing authenticated endpoints, input validation, and transactional persistence.
4. Confirm the app's `firebase-applet-config.json` default project and custom Firestore database are not accidentally used by staging or production. The staging workflow requires explicit build-time variables.
5. Review all Firestore/Storage rules, role assignment escalation, user authorization, and data retention before deployment.
6. The PWA caches assets; verify updates and stale clients before restaurant launch.

## Acceptance tests (use test project and test orders)
- Staff login, logout, roles, and unauthorized access denial.
- Menu sizes and prices (Chowmein, Fried Rice, Chilly Chicken/Pork, classic lassi, bottled water).
- Dine-in and takeaway orders; order editing and cancellation; kitchen ticket lifecycle.
- Cash and UPI settlement, tax configuration, duplicate submissions, network outage/reconnect.
- Inventory and daily-close reports reconcile against paid orders.
- Guest QR checkout is validated and cannot write arbitrary order totals.
- Verify staging preview URL, correct Firebase project/database, HTTPS, browser console and error logs.

## Release decision
**NOT CLEARED FOR LIVE CUSTOMER TRANSACTIONS.**
After fixing the blockers and verifying tests, prepare a separately reviewed production Hosting workflow with a protected GitHub environment and explicit human approval.
