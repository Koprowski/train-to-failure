# Train to Failure

This app uses Next.js, Prisma, PostgreSQL, and NextAuth.

## Environment Model

Do not share one database across local development, staging, and production.

Recommended setup:
- `local`: used by `npm run dev`, local scripts, and destructive testing
- `staging`: used by the deployed test environment
- `production`: used only by the live app

See [docs/ENVIRONMENTS.md](/C:/Users/kopro/train-to-failure_repo/docs/ENVIRONMENTS.md) for the full setup and workflow.

## Local Setup

1. Create a local env file from [env.examples/local.env.example](/C:/Users/kopro/train-to-failure_repo/env.examples/local.env.example).
2. Point `DATABASE_URL` and `DIRECT_DATABASE_URL` at your local Postgres database.
3. Set `NEXTAUTH_URL` to `http://localhost:3000`.
4. Run:

```bash
npm install
npx prisma generate
npm run dev
```

## Exercise Library Sync

The workbook [OneFootExerciseList.xlsx](/C:/Users/kopro/train-to-failure_repo/OneFootExerciseList.xlsx) is the source of truth for the official exercise library.

Workbook columns used by the sync:
- `C`: body part
- `D`: equipment
- `F`: desired exercise name
- `H`: `Remove` flag
- `I`: `Add` flag
- `J`: `Change` flag
- `K`: local/source GIF path
- `L`: current exercise name in app/DB
- `M`: update notes written back by the sync

Commands:

```bash
npm run sync:exercise-library
npm run sync:exercise-library:apply
npm run sync:exercise-library:prune
```

Behavior:
- `sync:exercise-library`: dry-run only
- `sync:exercise-library:apply`: adds and updates only
- `sync:exercise-library:prune`: adds, updates, and removes all numbered removal candidates
- `sync:local:full`: local apply, then lint, then build
- `sync:staging:full`: staging apply, then lint, then build
- `sync:production:full`: production apply, then lint, then build

Environment-aware wrappers:

```bash
npm run sync:local
npm run sync:local:apply
npm run sync:local:prune
npm run sync:local:full

npm run sync:staging
npm run sync:staging:apply
npm run sync:staging:full

npm run sync:production
npm run sync:production:apply
npm run sync:production:full
```

These wrappers load:
- `.env.local`
- `.env.staging`
- `.env.production`

Local fallback:
- if `.env.local` does not exist yet, `sync:local` falls back to `.env`
- staging and production do not fall back automatically

Selective removal is also supported:

```bash
powershell -ExecutionPolicy Bypass -File scripts/sync-local.ps1 -Apply -Remove 1,4,7
npm run sync:local:prune
```

## Verification

Before pushing exercise library changes:

```bash
npm run lint
npm run build
```
