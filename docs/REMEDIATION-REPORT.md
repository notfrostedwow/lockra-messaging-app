# Bounded dependency and calling-boundary review — 2026-10-16

**Historical review:** the user subsequently replaced the blanket runtime-moderate
stop rule and explicitly prohibited forks/backports. Current supported repairs,
runtime-risk evidence and verification are in [SDK57-RESIDUAL-REVIEW.md](SDK57-RESIDUAL-REVIEW.md).
The raw outputs and decisions below remain evidence of this earlier review.

Started from exact reviewed HEAD `8a2c31109110d78b7f60bfa8d60029244c62de31`
in `<WORKSPACE>`, with a clean tree,
no remote and local author
`notfrostedwow <105129603+notfrostedwow@users.noreply.github.com>`.
No applicable AGENTS.md/CLAUDE.md was present in the repo or ancestors.
No global Git/auth/account change, source-history rewrite, private-original access,
push, publication, provider use, spending or live user data was involved.
Internal refs/t3/checkpoints remain untouched and must never be published/mirrored.

## Outcome and required decision

The narrow calling authentication repair is implemented and verified. Dependency
version remediation has **stopped at the user's explicit runtime-blocker rule**:
there is no published compatible SDK 57/query-string 7 decoder fix. The maintained
decoder fix changes the parent range and CommonJS API. No unsafe override or SDK
major was applied. The candidate is **blocked**, not release-ready.

The next decision is whether to remain blocked pending an upstream SDK 57 repair,
or authorize a separately scoped, licensed and regression-tested compatible
backport/fork review. Version/schema alignment also needs resolution before the
mandatory Expo gates can pass. This report grants no exception or broader scope.

## Fresh audits: before and after

| Actual command | Before | After | Exit codes |
|---|---|---|---|
| npm audit --json | 33: 21 high, 12 moderate | 33: 21 high, 12 moderate | 1 / 1 |
| npm audit --omit=dev --json | 33: 21 high, 12 moderate | 33: 21 high, 12 moderate | 1 / 1 |

Zero low/critical findings; **zero active exceptions**. Both requests used the
public npm registry against the current lock. All 33 entries remain in the
production-omit report. Many are propagated tool/framework dependents; this does
not lower their reported severity or change their npm install classification.

- [Before full](evidence/dependency-remediation-before-full.json) /
  [production](evidence/dependency-remediation-before-production.json)
- [After full](evidence/dependency-remediation-after-full.json) /
  [production](evidence/dependency-remediation-after-production.json)
- [All advisory/node/version/fix paths](evidence/dependency-remediation-advisory-paths.json)
- [Current official registry versions/ranges](evidence/dependency-remediation-registry.json)

[DEPENDENCIES.md](DEPENDENCIES.md) and [SECURITY.md](../SECURITY.md) record the four
root GHSAs/CVEs, affected versions, all exact paths, severity, reachability,
fixability and mitigations. Decoder GHSA-vcc3-ghjq-m6fr / CVE-2026-45822 is a
runtime **moderate** blocker. Braces GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 and Forge
GHSA-86w9-cpqp-85rv / CVE-2026-85393 have no published patched version. Nested uuid
GHSA-w5hq-g745-h8pq / CVE-2026-41907 has a fixed major outside xcode's ^7 range;
the app's direct uuid 11.1.1 is already patched. Tooling-only exposure assessments
are documented as candidates, with **no waivers applied**.

The actual fixed decoder 0.5.0 artifact was integrity-checked in an ignored review
cache. Its require result is an ESM namespace object; query-string 7 expects a
directly callable CommonJS function. A plain benign-input invocation reproduced
TypeError, while the explicit default export worked. It also fails the parent's
^0.2.2 semver range. [Compatibility receipt](evidence/dependency-remediation-decoder-compatibility.json).
No exploit payload or application dependency override was used.

## Calling session boundary repair

Commit: `c7669af6f1a00c23a7c473f34133858a60aaad84`.

- JOSE now requires azp as well as the existing session/time/subject claims.
  Explicit checks reject empty/whitespace/nonstring azp and sid; azp must exactly
  match an authorized origin. RS256 signature, issuer, audience, age and expiry
  checks remain.
- The HTTP API independently requires an exact allowed Origin, including GET and
  OPTIONS. Missing/empty/opaque-null/foreign origins are denied before JWT
  verification. An approved Origin never replaces a required signed azp.
- Current Clerk docs say custom JWT templates cannot contain session-bound sid.
  The client now requests its existing session token with getToken(), rather than
  the old named template. Any calling audience must be deliberately configured
  and reviewed with the other integrations on an owned test issuer; none was
  configured or contacted here.
- This supports the documented cross-origin browser contract. Origin-less
  same-origin/native/nonbrowser flows remain unsupported pending deliberate
  design. No permissive token fallback was introduced. CORS is not authentication;
  two allowed origins are independently checked, not bound to each other.

The 22 new tests use actual locally signed RS256 JWTs and mocked public keys,
covering missing/empty/whitespace/nonstring/unauthorized/lookalike azp, missing/
empty/whitespace/nonstring sid, legitimate success, HTTP Origin denials,
preflight and the independence of JWT/Origin checks. They reproduced **six
failures before repair**, then all 22 passed. The existing client → handler →
invite → scoped provider JWT → mocked-media integration fixture was updated to
supply an explicit approved browser Origin and signed azp; all its assertions
remain. That initial fixture failure is retained as evidence.

[Before](evidence/calling-session-boundary-before.txt),
[after](evidence/calling-session-boundary-after.txt), and
[complete 67-test run](evidence/dependency-remediation-tests.txt).
No SDK/provider, user account, microphone/camera or real session was contacted.
Calling stays disabled in offline demo. Native SDK adapters remain preserved but
are not a verified native calling flow. Message E2EE does not establish call E2EE.

## Actual local verification

Windows, Node **22.23.3**, npm **10.9.9**. Public registry/official Expo metadata
lookups were permitted for these checks; app/provider integrations stayed off.
Heavy checks ran sequentially. Install lifecycle scripts remained ignored.

| Check | Actual result |
|---|---|
| Clean npm ci --ignore-scripts | Exit 0; 1,116 packages, 457.6 seconds. No peer bypass, force, override or installed-package patch. |
| npm test | Exit 0; **67 pass, 0 fail/skipped/cancelled/todo**, including all 45 existing tests. |
| npm run typecheck | Exit 0; strict TypeScript. |
| npm run lint | Exit 0; zero errors/warnings. The subsequently updated preservation recorder also passed targeted ESLint. No rule was disabled. |
| npm run build:web | Exit 0; actual dist web export. |
| CI=1 npx --no-install expo install --check | **Exit 1**: React/React DOM expected 19.2.3, found 19.2.9; TypeScript expected ~6.0.3, found 5.9.3. |
| Official Expo Doctor 1.21.4 --verbose | **Exit 1, 19/21 pass**: version alignment and app config schema fail. Same official bundled executable as the pinned npx command, integrity/lifecycle-reviewed in isolated .tools. |
| npm run audit:dependencies | **Exit 1 as required**; both fresh full/production reports fail, no exceptions. |
| npm run verify:preservation | Exit 0; 151 original path mappings, 41 original app paths and every current target hash verified. |
| Preservation/dependency delta | Original/intake hashes and target paths retained; only README/package script mapped hashes changed. Lock bytes, dependency ranges and engines unchanged. Workflow YAML parses. |

Each check has a `docs/evidence/dependency-remediation-*-command.json` exit/time/
environment receipt and adjacent actual output. The receipt field
officialMetadataNetworkAllowed records the Expo offline flag, not npm registry
access; npm audit/install explicitly use the public registry. New captures are
UTF8 except the two direct before/after boundary captures; original historical
evidence was left intact. Verbatim raw command output retains blank/trailing
whitespace, so an unrestricted Git whitespace check flags some logs. Source and
structured-file whitespace checks pass; no source lint rule was relaxed.

The initial npm wrapper ran under Node 22 but did not pin child PATH: npm script
shells resolved system Node 25.1.0. This verification mistake was discovered and
corrected per command, without changing global PATH or installed runtimes. Earlier
outputs are retained under *-unpinned-path filenames and are not used as Node 22
certification. Script-based checks were rerun with the portable Node directory
prepended to PATH; final command receipts include childPathPinnedToNodeDirectory.
[Actual before/after child runtime probe](evidence/dependency-remediation-node-path-verification.json)
observed v25.1.0 before and v22.23.3 after. Direct clean install and audit requests
already ran in Node 22 with lifecycle scripts ignored. The commit containing the
auth repair retains its earlier outputs; the subsequent handoff records corrected
Node 22 validation without rewriting history.

Doctor's schema failure is the legacy top-level app.json linking field. It was
preserved rather than deleted to fake a pass; a future relocation/route repair
needs explicit preservation evidence. Locked React Server DOM Webpack 19.2.9
requires React and React DOM ^19.2.9, so blindly following Expo's 19.2.3 suggestion
would violate those peers. No React downgrade, TypeScript major migration,
expo.install.exclude, Doctor exclusion or EXPO_NO_DEPENDENCY_VALIDATION was used.
Native tool-check passes are not native compilation/device proof.

The read-only GitHub Actions workflow now separates functional verification from
blocking compatibility/audit validation. It clean-installs and runs tests, types,
lint, export, preservation, Expo install --check, pinned Doctor and both audit
reports. Doctor/audit still run after a compatibility failure without converting
failure to success. No secrets, live provider setup or deployment exists. The
workflow is expected to be red on the documented blockers; **remote CI is not
verified** and no publication occurred.

## Preservation, privacy and verification limits

All **151 original source paths/features and 41 app TS/TSX paths** remain mapped;
only the original temporary CLI cache omission remains. All **160 mapped target
hashes** verify. [Delta receipt](evidence/dependency-remediation-preservation-delta.json).
Only the README and package script hash changed among those targets, with explicit
reasons in [preservation.json](evidence/preservation.json). Original/intake manifests
are unchanged. Existing E2EE, all other calling source, admin/database/auth/billing
architecture, offline guards, assets and legacy notices were preserved. The
calling verifier, HTTP policy and session-token request are the approved edits.

No plaintext fallback, private-key backend upload, new integration, redesign,
crypto replacement/downgrade or blanket relicensing was introduced. Native keys
still use SecureStore; web keys remain memory-only and are lost on reload. The
custom DM protocol still requires independent security review. Transport encryption
is not call E2EE. See [E2EE.md](E2EE.md) and [CALLING.md](CALLING.md).

Fresh raw-tree and separately decoded UTF16 evidence Gitleaks passes detected no
leaks; reports and scan scope are in dependency-remediation-gitleaks-* and
dependency-remediation-decoded-scan-scope.json. The decoded pass uses default
rules with no path allowlists; generated review copies do not replace original
evidence. Final post-commit tree/all-ref scans are reported in the completion
response. Scanner success is not final privacy/provenance clearance.

The parent's independent baseline privacy and 390×844/1440×900 runtime review
applies to 8a2c311. It is not final-candidate clearance. This job reran export and
mocked authorization/integration checks; it makes no new provider/device/browser
screenshot claim. Real Supabase/Clerk auth, isolated SQL/RLS, native builds,
SecureStore devices and two-client provider calls remain unverified. No SQL ran.

Original assets/notices are unchanged; no ownership/license rights were invented.
The parent must independently review the final source export, privacy/provenance,
all fresh history and Gitleaks before any separately authorized fresh-history
publication. Internal T3 refs contain a legacy address and **must never be
published or mirrored**; they were not rewritten/erased. Original private source
and history remain untouched. The final CI/evidence handoff commit and clean HEAD
are given in the completion response.
