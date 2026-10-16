# Contributing to Lockra

Work in this isolated source-copy workspace. Do not attach the private original's
history or configure a remote. Keep existing screens, services, auth/session,
admin, billing and database contracts; record source relocations and specific
security changes in the preservation evidence.

Use Node 22. `npm ci` intentionally ignores dependency lifecycle scripts via
`.npmrc`; review any required native binary action before running it. Never use
`--force`, `--legacy-peer-deps`, or dependency overrides to conceal conflicts.
`npm start` serves the offline web demo on localhost with one Metro worker and
environment discovery/telemetry disabled. Use synthetic identities only.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build:web`.
After reviewing source changes, refresh the preservation mapping with
`node scripts/verify-preservation.cjs --record`, then run `npm run verify:preservation`.
Never record a mapping to conceal an excluded feature; independently compare every
original source path and explain each changed contract or relocation.
Check the evidence records for their actual current outcomes. Tests must exercise
existing contracts and negative authorization cases. Mocks never establish real
Clerk, Supabase RLS, provider calls, or native-device behavior.

Provider configuration must be explicit and complete before initialization.
Secrets belong on a separately reviewed server. No SDK should silently fall back
to anonymous access, public rooms or plaintext. Keep telemetry disabled in client
code. Historic SQL lives under `docs/legacy` as non-runnable references. Do not
restore it to migrations or execute it against any service.

Keep local commits small enough to review and identify their actual checks.
Publication requires independent review of the full current tree and every fresh
commit, forced Gitleaks scans, manual source/asset rights and privacy review, and
runtime QA. CI is unverified until a parent publishes and reads an actual run.
