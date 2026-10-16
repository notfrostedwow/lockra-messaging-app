# Supported SDK57 repairs and residual-risk review

Date: 2026-10-16. Started at exact local HEAD
`a69de527bf8256235da39e4bd2b7583ab3b7c142`, clean, in
`<WORKSPACE>`. Local author remains
`notfrostedwow <105129603+notfrostedwow@users.noreply.github.com>`. No applicable
AGENTS.md/CLAUDE.md exists in this workspace or its ancestor directories.
There is no remote; no original repository/history, global auth/config, account,
service, deployment or rename was changed. All substantive work stays here.

The user replaced the earlier blanket runtime-moderate stop rule. No forks or
backports are wanted or authorized. The current dependency gate requires evidence
that no critical/high advisory affects runtime paths; it permits documented,
mitigated residual risks. Passing this dependency gate cannot authorize publication
or replace independent privacy, security, provenance and runtime review.

## Supported fixes

- The official SDK57 metadata and bundled map recommend React/DOM 19.2.3 and
  TypeScript ~6.0.3. The earlier React/DOM 19.2.9 and TS5.9.3 failed the check.
  This review aligns the versions without altering RN0.86.3, Expo57.0.30, native
  modules, E2EE primitives or calling implementation.
- The optional RSC transport was added explicitly during restoration. No original
  app RSC/server-function feature exists; no application source imports it, and
  web output remains `single`. It is omitted with its unused Webpack dependencies,
  rather than forcing RSC's React>=19.2.9 peers or installing an older vulnerable
  RSC package. Router and router-server mark this peer optional. RSC/server
  functions remain an unconfigured upstream capability, not an app feature claim.
- The first in-place lock-only resolution retained an old optional RSC peer and
  printed peer warnings. That attempt was not accepted as clean verification.
  A fresh manifest-only resolution inside an ignored directory in this workspace
  completed with no peer conflict. Its synchronized lock was reviewed and used
  for actual clean npm ci, never patched into installed packages. Both outputs
  remain as evidence; no history or failed result was erased.
- The logical version delta is recorded in sdk57-residual-lock-delta.json.
  Most path-level changes are ordinary npm hoisting after removing the unused
  optional tree. Only React/DOM, TypeScript and compatible electron-to-chromium
  metadata add new versions. Existing required lifecycle packages remain at their
  prior versions, and every install script stays ignored. No dependency override,
  force, legacy peer resolution or package patch is used.
- TypeScript6 deprecates baseUrl. The relative `@/*` mapping is retained while
  baseUrl is removed; strict checking remains. There is no deprecation suppression.
  Its new default no longer auto-includes every installed ambient type package;
  the first real typecheck exposed missing Node globals/modules. Explicit node
  and react types restore the actual app/server/test context; the corrected
  strict check passes. Earlier failures remain in the before-explicit-types
  output, alongside a separately recorded initial npm command-invocation typo.
- The invalid top-level app.json linking object is preserved unchanged as an
  object in docs/legacy/app-linking.json. No application reader used it; Router
  already derives routes from preserved app files. The lockra scheme, signin,
  signup, auth/callback and grouped tab sources remain. The legacy `/tabs` alias
  was an inert declaration, not an established working URL; no new alias behavior
  or device link verification is claimed.
- Browser URL validation precedes Router import and back/hash listeners. It
  bounds path/query/hash to 2048 characters and uses the standard platform decoder
  to reject malformed encoding/UTF8. Rejected locations replace to `/` without
  input logs; the localhost preview returns 400/414. This mitigates the retained
  moderate decoder risk without forking or replacing that dependency. Native
  intents and real integration routing remain unverified.

## Advisory and runtime evidence

The fresh before full and --omit=dev reports each exit 1 with **33 entries:
21 high, 12 moderate, zero critical/low**. All four vulnerable nodes are transitive
and production-installed. Parent propagation amplifies the count; it does not
make every parent import a vulnerable function.

[SECURITY.md](../SECURITY.md) documents each exact vulnerable version, GHSA/CVE,
severity, chain, caller, scope, mitigation and unsupported-fix constraint.
[Installed source/call traces](evidence/sdk57-residual-source-paths.json) include
line references/hashes and resolved lock ancestry. Two npm explain attempts
exceeded a 5MiB output buffer; no truncated output is treated as evidence. The
[runtime assessment](evidence/sdk57-residual-runtime-assessment.json) retains
fresh map hashes and observations across web/iOS/Android JavaScript exports and
an esbuild import graph of the optional calling server. Native JS export and a
static server graph are not native compilation or a live server/provider test.

The raw audit exit codes are retained. `audit:dependencies` applies the explicit
public docs/dependency-risk-policy.json after fresh audits/exports. It fails on
new/changed advisories, versions/paths, missing/incomplete reports, missing maps
and critical/high runtime code. It also rejects a claimed tooling residual if
that vulnerable instance appears in a runtime graph. Direct patched uuid and
nested vulnerable uuid are distinguished by full installed paths. Regression
tests deliberately introduce runtime high imports, new advisories, changed
versions and incomplete evidence to confirm denial. There is no hidden ignore,
severity rewrite, dependency-validation exclusion or continue-on-error step.

The calling JWT/Origin repair is unchanged and reverified with locally signed
synthetic JWTs and mocked keys. Required nonempty authorized azp and nonempty sid
are separate from the HTTP request Origin check. Missing/empty/nonstring/foreign
azp, missing/empty/nonstring sid and absent/null/foreign HTTP Origins deny. The
legitimate signed-browser success remains tested. No provider/JWKS/real identity
request occurs. Offline calling remains disabled; native/Origin-less transports
remain unsupported pending deliberate review.

## Verification

Actual command receipts and outputs use the sdk57-residual-* prefix under
docs/evidence. They record Node22.23.3 with the child PATH pinned to that runtime,
demo mode, no dotenv/telemetry, real exit codes and elapsed time. Registry audits
and official Expo metadata are the only permitted network lookups. App/provider
integrations stay off. Checks run sequentially after clean installation.

Recorded results from the exact current lock/config and source:
| Check | Actual saved result |
|---|---|
| Clean installation | exit 0 |
| Tests | 76 passed, 0 failed |
| Typecheck | exit 0 |
| Zero-warning lint | exit 0 |
| Web export | exit 0 |
| Installed supported peer tree | exit 0 |
| Fresh runtime audit/export gate | exit 0, no high/critical runtime paths |
The real runtime receipt is retained as sdk57-residual-runtime-assessment.json.
Independent review re-evaluated its inventories against the exact lock and policy hashes. These are saved local results, not a claim of remote CI or native/device verification. Preservation metadata is regenerated for the separately sanitized publication copy; historical results above are unchanged.

## Preservation and remaining publication conditions

Original/intake manifests retain their source SHA and every original mapping.
New reasons identify manifest/lock/config changes and the linking-object
relocation, with no original application module removed. Original assets/notices,
auth, admin, billing, SQL references, DM E2EE and calling source remain.
Native SecureStore is still device-untested; web keys stay memory-only. No
plaintext fallback, private-key upload, production E2EE audit or call E2EE is
claimed. No SQL/RLS test or live call/provider test was performed.

Full current-tree and all-ref history scans plus separately decoded UTF16 evidence
are required before local handoff. Scanner success is not privacy/provenance
clearance. Internal refs/t3/checkpoints remain untouched and must never be copied
or mirrored into eventual public history. Only the rollout owner may coordinate
stable-ID renames and a separately reviewed clean-history publication after final
independent source/privacy/provenance/runtime QA. Actual remote CI remains
unverified until the rollout owner publishes and reads its results.

## Official evidence consulted before source changes

- [Expo CLI validation and export](https://docs.expo.dev/more/expo-cli/),
  [SDK57 reference](https://docs.expo.dev/versions/v57.0.0/),
  [SDK57 bundled ranges](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json)
  and https://exp.host/--/api/v2/versions (SDK57 metadata only).
- [TypeScript6 changes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
  and [Expo configuration](https://docs.expo.dev/workflow/configuration/).
- All four upstream advisory links in SECURITY.md; current official registry
  versions, peer metadata and scripts are in sdk57-residual-registry.json.
- [Clerk session claims](https://clerk.com/docs/guides/sessions/session-tokens),
  [authorized-party verification](https://clerk.com/docs/reference/backend/verify-token)
  and [JOSE6 required claims](https://github.com/panva/jose/blob/v6.2.12/docs/types/interfaces/JWTClaimVerificationOptions.md).
- [React RSC patch warning](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components):
  an old RSC release was not installed to manufacture React alignment.

Two attempted Router documentation URLs were inaccessible; conclusions about
this SPA's actual entry/RSC imports use the installed official Router source and
fresh export evidence instead of assuming those pages proved compatibility.
