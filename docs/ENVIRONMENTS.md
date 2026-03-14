# Environments

## Goal

Keep database state separate across:
- local development
- staging/test deployment
- production

Git pushes deploy code. They do not automatically apply local database edits to staging or production.

## Recommended Setup

### Local

Use a local Postgres database for:
- `npm run dev`
- workbook sync dry-runs
- workbook sync apply/prune
- destructive tests

Suggested local env file:
- copy [env.examples/local.env.example](/C:/Users/kopro/train-to-failure_repo/env.examples/local.env.example) to `.env.local`
- until `.env.local` exists, `npm run sync:local` falls back to `.env`

### Staging

Use a separate hosted Postgres database for:
- deployed test app
- preview verification of workbook sync changes

Suggested staging env file template:
- [env.examples/staging.env.example](/C:/Users/kopro/train-to-failure_repo/env.examples/staging.env.example)

Why staging still matters even if local already works:
- it proves the deployed app can serve the updated static GIF files
- it proves the remote database can be updated correctly
- it catches hosting-only issues such as wrong env vars, wrong DB target, auth callback differences, or stale deployed assets
- it gives you one last safe checkpoint before production

### Production

Use a separate hosted Postgres database for:
- live app only

Suggested production env file template:
- [env.examples/production.env.example](/C:/Users/kopro/train-to-failure_repo/env.examples/production.env.example)

## Required Variables

These are the key environment variables in this repo:
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`

`DATABASE_URL` and `DIRECT_DATABASE_URL` must point to the database for the specific environment you are running.

## Recommended Workflow

### Local workbook sync

1. Update [OneFootExerciseList.xlsx](/C:/Users/kopro/train-to-failure_repo/OneFootExerciseList.xlsx).
   The sync currently reads `C/D/F/H/I/J/K/L/M` as:
   `body part / equipment / desired name / remove / add / change / source gif / current name / notes`.
2. Run:

```bash
npm run sync:local
npm run sync:local:apply
npm run sync:local:full
```

Or, if you need selective removals:

```bash
powershell -ExecutionPolicy Bypass -File scripts/sync-local.ps1 -Apply -Remove 1,4,7
```

3. Review the dry-run output.
4. If removals are needed, remove all numbered candidates:

```bash
npm run sync:local:prune
```

5. Verify:

```bash
npm run lint
npm run build
```

### Staging rollout

1. Commit and push the local file changes.
2. Deploy the code to staging.
3. Ensure staging environment variables point to the staging database, not local or production.
4. Run:

```bash
npm run sync:staging
npm run sync:staging:apply
npm run sync:staging:full
```

5. If staging also needs removals:

```bash
npm run sync:staging:prune
```

6. Verify exercise library counts, names, and images in the staging app.

### Production rollout

1. Only after staging is verified, make sure production deploy is live.
2. Run:

```bash
npm run sync:production
npm run sync:production:apply
npm run sync:production:full
```

3. If production also needs removals:

```bash
npm run sync:production:prune
```

4. Verify the live app afterward.

## Why This Separation Matters

If local, staging, and production all share one database:
- local test deletions can affect production immediately
- workbook cleanup can remove live data unexpectedly
- debugging becomes ambiguous because code and data changes mix together
- a local script can silently mutate the same DB the live app is using

Separate databases make the target explicit and reduce risk.

## Important Repo Detail

[src/app/api/exercises/sync/route.ts](/C:/Users/kopro/train-to-failure_repo/src/app/api/exercises/sync/route.ts) adds missing seed exercises, but it does not prune stale official rows.

That means:
- pushing code is not enough to clean the deployed DB
- the workbook sync must run against the actual target environment database
