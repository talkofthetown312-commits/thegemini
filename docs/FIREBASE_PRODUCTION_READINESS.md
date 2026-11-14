# TalkOS Firebase Hosting release gate

## Current status
This branch prepares a **static frontend deployment only**. It does not deploy the Express server, Firestore rules, Storage rules, or Firebase Admin credentials. Do not enable live customer ordering until a security review and end-to-end POS tests have passed.

## Blockers to resolve before setting SECURITY_REVIEW_APPROVED=true
1. Firestore rules currently permit unauthenticated order reads and creation, and authenticated writes to sensitive product records. Restrict by role, branch and validated data shape; test with Firebase Emulator Suite, including guest checkout.
2. server.ts contains hardcoded aggregator credentials or credential-like strings, simulated order/revenue metrics, and webhook endpoints. Remove fake 'connected' statuses, rotate any genuine exposed credentials, authenticate and verify signed webhooks, and deploy server separately with secrets and least privilege.
3. Confirm which Firebase project and Firestore database are authoritative; firebaseConfig.ts has a fallback AI Studio database ID. Validate staff access, transactions, receipts, kitchen flow, inventory, backups and failure recovery using test data.
4. Review Firebase Storage rules and security of QR/table ordering and payment confirmation. Hosting alone does not supply backend API endpoints.

## Deployment configuration (GitHub)
Create a protected GitHub Actions environment named `production` with required reviewers. Set these **environment variables**: `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`.

Use Google Cloud Workload Identity Federation to trust GitHub's OIDC token **only for this repository and production environment**; grant the deployment service account only permissions needed to deploy Firebase Hosting. Do not put service-account JSON in source control.

After all blockers are independently verified, set `SECURITY_REVIEW_APPROVED=true` as a protected environment variable. Run **Firebase Hosting (manual, security-gated)** with confirmation `DEPLOY`. The workflow runs lint/tests, builds `dist-web`, confirms no server bundle is present, then deploys Hosting only. It intentionally does **not** deploy on push or merge.

## Important
- `npm run build` builds both web and server; `npm run build:hosting` builds web-only assets to `dist-web`. Firebase Hosting's public directory is `dist-web`.
- This is a preparation workflow, **not proof of a deployed or production-safe POS**.
- A successful frontend deploy does not mean server API routes will work: Hosting currently rewrites all paths to index.html. Backend APIs need separate hosting and routing.
