# TalkOS production release gate

This repository now has a **manual** Firebase Hosting deployment workflow. It does not deploy automatically on merges or tags. The build uses `npm run build:pwa` (static SPA), so Express `server.ts` API routes are **not** hosted by Firebase Hosting. Do not represent the backend as live.

## Before pressing Deploy

1. Confirm ownership of the intended Firebase project. The checked-in `firebase-applet-config.json` points to an AI Studio project and a **named** Firestore database; do not assume that is the restaurant's production project. Set GitHub repository/environment variables `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID`, `FIREBASE_DATABASE_ID`, plus optional `FIREBASE_STORAGE_BUCKET` and `FIREBASE_MESSAGING_SENDER_ID`. Set secret `FIREBASE_SERVICE_ACCOUNT` to a least-privilege Firebase deploy service account JSON. Do not paste credentials into the repository.
2. Configure GitHub environment `production` with required reviewers, restrict deployment branches to `main`, and confirm Firebase Hosting and Authentication authorized domains.
3. **Security blocker:** The original `firestore.rules` allowed anonymous reads and creates of orders/tickets and public read/write of `system`. Hardened rules are proposed in this PR but are **not** automatically deployed. Review and test the rules against the actual named database, then deploy them explicitly to that database before publishing customer access. Existing anonymous table/QR ordering may fail after the hardening and requires a trusted backend / carefully scoped guest checkout design. Do not relax POS collections to public write to fix it.
4. **Backend blocker:** `server.ts` includes example aggregator tokens, simulated orders/sales and API endpoints. Treat tokens as exposed; rotate any that were real, remove mock data from production, authenticate and authorize backend routes, and deploy backend separately if the frontend uses `/api/*`. Firebase Hosting SPA rewrites do not provide Express APIs.
5. Confirm Firestore database ID, admin identity/roles, payment capture, inventory, order-to-kitchen, offline recovery, reports, and backup/restore using test transactions. Ensure storage rules are defined and reviewed before deploying Storage rules; the repository's `firebase.json` references `storage.rules`, which is currently absent.
6. From GitHub Actions select **TalkOS Firebase Hosting (manual production)** on `main`, enter `DEPLOY`, and review the deployment result. The workflow deploys **Hosting only**, never database rules.

No live deployment should be considered verified until the actual URL and a complete test order have been checked.
