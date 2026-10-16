# Dependency resolution and maintenance evidence

## Current user-authorized SDK57 residual review

The new decision permits evidence-backed tooling and moderate runtime residuals
when no critical/high finding affects runtime code. It prohibits forks/backports,
SDK major changes, incompatible overrides and weakened checks. This supersedes
the earlier blanket moderate stop recorded below. Those dated results remain
historical evidence, not the current policy.

See [current review and actual commands](SDK57-RESIDUAL-REVIEW.md), the
[current 33-entry/version/path matrix](evidence/sdk57-residual-advisory-paths.json), the
[per-advisory security assessment](../SECURITY.md), and the explicit
[machine-checked residual policy](dependency-risk-policy.json). Raw full and
production audits retain their real exit codes/counts. The policy gate performs
fresh audits and exports all three platform JavaScript source maps plus the
optional calling-server graph. It rejects unknown/changed advisory paths or
versions and critical/high runtime code; it does not equate `devDependency`,
production install flags or propagated parent severity with reachability.

Supported alignment uses the official SDK57 React/DOM 19.2.3 and TypeScript
~6.0.3. The SPA does not use RSC, server functions or API routes. Its optional
RSC transport, added explicitly during restoration, was omitted with its unused
Webpack tree instead of forcing its React >=19.2.9 peers or downgrading that
transport to a vulnerable release. All original application source/features,
native libraries, DM E2EE and calling code remain. Registry, peer/script review,
lock changes, fresh-install and runtime receipts are under
`evidence/sdk57-residual-*`. This is not a claim of native/device verification.

The invalid `app.json` linking object is preserved unchanged as JSON in
`legacy/app-linking.json`; actual Router paths continue to come from app files.
The lockra scheme remains configured. Deprecated TS baseUrl was removed while
retaining strict checking and the relative `@/*` path mapping; no deprecation
suppression or dependency-validation exclusion was introduced.

## Historical restoration and prior stop-rule evidence

The original SDK 53 graph could not clean-install because Lucide's React peer
excluded React 19. The manifest/lock drift, unlisted Router query-string import,
missing lint tooling and deprecated Clerk package were repaired without force,
legacy peer mode, overrides or node_modules patches. Package installs ignore
lifecycle scripts; no native prepare/download script was executed.

The SDK 53 restoration and E2EE/calling phases passed their functional checks.
An explicit registry audit subsequently reported **73** dependency findings.
Unused expo-module-scripts and disabled client Sentry/LogSnag SDK dependencies
were removed; existing source contracts remain. A compatible `npm audit fix
--ignore-scripts` (without force) left **45 findings: 24 high, 21 moderate**.
Its exit code was 1. These are dependency-graph findings, including transitive
framework/tooling dependencies, not proof that every issue is reachable in this
offline app. They are also not a clean security bill of health.

Actual JSON and command outputs are in docs/evidence/npm-audit-*. SDK 53 is outside
Expo's roughly one-year maintenance window. A maintained-framework migration and
native compatibility QA are required before release. No audit recommendation to
use force or a breaking downgrade was executed. Source-preservation and green
functional tests do not remove this maintenance blocker.

ESLint 9.39.5 is explicit, with no rules disabled. The SDK 53 React and hooks
plugins' peer declarations exclude ESLint 10, so silently forcing the latest
ESLint would conceal a real compatibility failure. This tooling also belongs in
the maintained-framework review. No remote CI has run.

## Final SDK 57 graph — 2026-10-16

The maintained Expo 57 migration is implemented and web-checked, using its official
bundled native ranges. See SDK-MAINTENANCE.md. Clerk 4.12.0's declared Expo range
includes 57. Native SDK compatibility remains untested.

A second compatible `npm audit fix --ignore-scripts` changed 11 packages. The
subsequent clean `npm ci --ignore-scripts` installed 1,116 packages in seven minutes
without peer bypasses or lifecycle execution. The final audit still reports
**33 graph findings: 21 high and 12 moderate, zero critical**. The underlying
advisories include braces, decode-uri-component, node-forge and uuid; framework
dependents amplify the graph count. Some proposed fixes require incompatible
major changes or downgrades. No force, override or patched installed dependency
conceals them. This remains a release blocker requiring reachability assessment
and compatible upstream repairs, not a clean dependency security result.

The install also warns that transitive uuid 7 and ESLint 9 are unsupported.
ESLint 10 conflicts with the current framework plugin peer constraints. Keeping
the compatible checked toolchain does not resolve its maintenance status.
`dependencies-final.json` records selected direct resolutions and license metadata;
metadata alone grants no rights to legacy code/assets.

## Bounded remediation review from 8a2c311 — 2026-10-16

This section supersedes stale audit counts for the current candidate. The exact
reviewed starting HEAD was `8a2c31109110d78b7f60bfa8d60029244c62de31`, with a clean
tree, no remote and the local portfolio author. No applicable AGENTS.md/CLAUDE.md
was found in the repo or ancestors. The supplied get-api-docs skill was read;
chub is absent, so current official sources were retrieved directly before code.

Fresh `npm audit --json` and `npm audit --omit=dev --json` both exited **1** with
**33 entries: 21 high, 12 moderate, zero low/critical**. They represent four
underlying advisories and their propagated dependents, not 33 distinct CVEs.
Every finding remains present with dev dependencies omitted; all affected lock
nodes have dev=false. Tool execution scope must not be confused with npm's
production-installed classification. No severity has been lowered.

| Fresh audit | Before | After | Exit |
|---|---|---|---|
| Full | 33 (21 high, 12 moderate) | 33 (21 high, 12 moderate) | 1 / 1 |
| --omit=dev | 33 (21 high, 12 moderate) | 33 (21 high, 12 moderate) | 1 / 1 |

After receipts: [full](evidence/dependency-remediation-after-full.json) and
[production](evidence/dependency-remediation-after-production.json).

Raw [full audit](evidence/dependency-remediation-before-full.json),
[production audit](evidence/dependency-remediation-before-production.json),
[complete advisory/path matrix](evidence/dependency-remediation-advisory-paths.json)
and [fresh registry queries](evidence/dependency-remediation-registry.json) retain
versions, exact node paths, ranges, fix suggestions and dates. Final after-audits
and command outcomes are linked from REMEDIATION-REPORT.md. Dependency versions
and package-lock bytes have not been changed: the runtime blocker below requires
a new user decision, not a forced incompatible override.

### Four advisory root causes

| Advisory and actual severity | Installed path and affected versions | Upstream fix evidence and compatible repair status |
|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), CVE-2026-93687 — **high** | `node_modules/braces@3.0.3`; affected <=3.0.3. Metro file-map 0.84.5/0.84.6 → micromatch 4.0.8 (^3.0.3). | Advisory lists no patch; public registry latest is 3.0.3. Updating within the parent range cannot fix it. npm's RN downgrade suggestion is incompatible with SDK 57 and was rejected. |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), CVE-2026-45822 — **moderate** | `node_modules/decode-uri-component@0.2.2`; affected <=0.4.2. Expo Router 57.0.28 → query-string 7.1.3 → decoder ^0.2.2. | Fixed decoder 0.5.0 is ESM with a default export, outside ^0.2.2. Latest stable Router 57.0.28/query-string 7.1.3 have no compatible backport. query-string 9.5.1 uses the fix but is an ESM major change outside Router's ^7.1.3. npm proposes Router 58.0.20, outside authorized SDK. |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), CVE-2026-85393 — **high** | `node_modules/node-forge@1.4.0`; affected <=1.4.0. @expo/cli 57.0.31 and @expo/code-signing-certificates 0.0.6 both require ^1.3.3; expo-updates 57.0.26 also brings the certificate tool. | Advisory lists no patch; registry latest is 1.4.0. A compatible range update cannot resolve it. This is not the noble message crypto or JOSE calling verifier. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), CVE-2026-41907 — **moderate** | `node_modules/xcode/node_modules/uuid@7.0.3`, through @expo/config-plugins 57.0.10 → xcode 3.0.1 (^7.0.3). Affected <11.1.1 (also 12.0.0 and 13.0.0). | Fixed branches include 11.1.1/12.0.1/13.0.1. Direct app uuid already resolves to 11.1.1; the nested v7 remains affected. Latest stable xcode is 3.0.1 with the old range. Forcing uuid 11 beneath a ^7 parent is an incompatible major override and was rejected. |

### Reachability and mitigation assessment — no active exceptions

- **Decoder is a runtime dependency and a publication blocker.** Router's shipped
  React Navigation core getStateFromPath calls query-string.parse on URL queries;
  that calls the decoder. Router's customized main linking parser has a different
  path, and no application exploit was attempted or asserted. The affected runtime
  library surface has not been proven unreachable and cannot be waived as dev-only.
  Offline network guards do not validate arbitrary URL input. Limiting inputs is
  an upstream-described mitigation, not removal of this moderate finding.
- **Braces consumers observed here are Metro development/build file watchers.**
  The vulnerable recursive pattern walkers can exhaust a Node stack. Use only
  trusted repository/configuration patterns; do not expose Metro/tunnels or
  process untrusted glob configuration. No app send/receive path imports braces.
  No native bundle reachability proof or reduction to low severity is claimed.
- **Forge consumers observed here are Expo CLI iOS signing and code-signing tools.**
  RSA signature validation is affected. No certificate/signing, OTA, cloud or native
  operation was run; such workflows remain disabled. Do not consume untrusted
  signing material. Existing E2EE and signed calling auth use separate libraries.
  This is a candidate tooling-scope assessment, not an approved high-severity waiver.
- **Nested uuid is used by xcode's build tooling.** Its observed call is uuid.v4()
  for project IDs; the advisory concerns v3/v5/v6 with caller-supplied buffers.
  No affected API call was found in that consumer. Keep untrusted project/config
  inputs out of native tooling. This does not change its moderate severity,
  dev=false install flag or clear a production/native distribution automatically.

There are **zero active audit exceptions**, including for those tooling candidates.
Any future genuinely unfixable dev-only/low exception needs its own reviewed path,
severity, upstream fix evidence, exposure proof, mitigation and expiration/recheck
policy. No runtime moderate/high exception is permitted. The new audit gate runs
both fresh reports, accepts no findings and fails closed on errors/incomplete data.
CI is expected to remain red while this blocker exists; no remote CI has run.

### Stop decision and incompatible candidate proof

The published fixed decoder was unpacked only into an ignored local review cache;
its SHA-512 integrity was checked. On Node 22.23.3, calling its CommonJS require
result as query-string 7 does raised **TypeError**; calling the explicit ESM default
worked. [Actual compatibility receipt](evidence/dependency-remediation-decoder-compatibility.json).
No source module, installed dependency, primitive or feature was replaced.
No patch override, fork, downgrade, audit fix, SDK major or check exclusion was used.

**Dependency version remediation stops at the user-required runtime blocker.**
To proceed within SDK 57, a separately authorized, licensed and regression-tested
compatible upstream backport/fork of the Router/query-string decoder chain is
needed, or an upstream SDK 57 patch must be published. A decoder 0.5/Router 58
override cannot be called a safe patch. Until then the app is not release-ready.
The separately requested narrow signed-session repair and verification continue
without changing dependency versions or enabling integrations.

### Official compatibility and API sources reviewed before implementation

- [Expo CLI validation](https://docs.expo.dev/more/expo-cli/): CI install --check
  must fail on version mismatches; no EXPO_NO_DEPENDENCY_VALIDATION or exclusions.
- [SDK reference](https://docs.expo.dev/versions/latest/) and
  [SDK 57 bundled module map](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json):
  retain RN 0.86.3, Reanimated 4.5.1, Worklets 0.10.1 and SDK 57 module ranges.
  The map lists React 19.2.3 while the reviewed app uses patched 19.2.9; actual
  install --check/Doctor output is authoritative evidence, not an assumed pass.
- [Expo upgrade checks](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
  and [Doctor README](https://github.com/expo/expo/blob/main/packages/expo-doctor/README.md):
  the official Doctor 1.21.4 bundle was integrity/lifecycle-reviewed in isolated
  .tools; its Node engine accepts verified 22.23.3. It is not an app dependency.
- [query-string 7 source](https://github.com/sindresorhus/query-string/blob/v7.1.3/index.js),
  [fixed decoder source/package](https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0),
  [Forge](https://github.com/digitalbazaar/forge/tree/v1.4.0),
  [xcode's uuid consumer](https://github.com/apache/cordova-node-xcode/blob/3.0.1/lib/pbxProject.js),
  and the four upstream advisories above establish API/fix constraints.
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit/) and
  [override semantics](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#overrides):
  propagated graph entries and --omit=dev are not application reachability proofs.

Install warnings also include unsupported ESLint 9, nested uuid 7 and deprecated
crypto-js 4.2.0. They were not concealed or blanket-upgraded. Native builds,
devices, real Clerk/Supabase/provider operation and production security remain
unverified. Attribution, legacy notices and asset rights are unchanged.

### Actual compatibility gate failures

CI=1 npx --no-install expo install --check exited 1, with no validation-disable
flags or package exclusions. It expects React/React DOM 19.2.3 instead of 19.2.9,
and TypeScript ~6.0.3 instead of 5.9.3. The locked React Server DOM Webpack 19.2.9
requires React and React DOM ^19.2.9; a blind React downgrade would violate those
peers. No downgrade or TypeScript major migration was attempted after the stop
decision. [Actual output](evidence/dependency-remediation-expo-compat.txt).

Expo Doctor 1.21.4 exited 1: **19/21 checks passed**, with version alignment and
app-config schema checks failing. The schema rejects the legacy top-level
app.json linking field. That config/source was retained, not deleted to manufacture
a pass; a future repair must preserve its intended routes and document relocation.
[Actual output](evidence/dependency-remediation-expo-doctor.txt). Native tooling
diagnostic passes do not establish native builds or device operation. The current
candidate is blocked by these checks as well as the runtime decoder advisory.

### Every current audit entry and installed path

All rows remain in the production-omit report; no row is an active exception.

| Audit entry | Severity | Installed node(s) | Underlying advisory package(s) | npm fix suggestion |
|---|---|---|---|---|
| @clerk/expo | high | node_modules/@clerk/expo@4.12.0 | braces, uuid, node-forge | None |
| @config-plugins/react-native-webrtc | high | node_modules/@config-plugins/react-native-webrtc@15.0.2 | braces, uuid, node-forge | @config-plugins/react-native-webrtc@3.0.0 (major=true) |
| @expo/cli | high | node_modules/@expo/cli@57.0.31 | node-forge, uuid, braces | None |
| @expo/code-signing-certificates | high | node_modules/@expo/code-signing-certificates@0.0.6 | node-forge | expo-updates@0.11.7 (major=true) |
| @expo/config | moderate | node_modules/@expo/config@57.0.10 | uuid | None |
| @expo/config-plugins | moderate | node_modules/@expo/config-plugins@57.0.10 | uuid | None |
| @expo/inline-modules | moderate | node_modules/@expo/inline-modules@0.1.8 | uuid | None |
| @expo/local-build-cache-provider | moderate | node_modules/@expo/local-build-cache-provider@57.0.9 | uuid | None |
| @expo/metro | high | node_modules/@expo/metro@56.0.2 | braces | None |
| @expo/metro-config | high | node_modules/@expo/metro-config@57.0.13 | braces, uuid | None |
| @expo/prebuild-config | moderate | node_modules/@expo/prebuild-config@57.0.19 | uuid | Resolution possible in graph; no full compatible root repair |
| @react-native/community-cli-plugin | high | node_modules/@react-native/community-cli-plugin@0.86.3 | braces | react-native@0.72.17 (major=true) |
| @react-native/metro-config | high | node_modules/@react-native/metro-config@0.86.3 | braces | react-native@0.72.17 (major=true) |
| @react-native/virtualized-lists | high | node_modules/@react-native/virtualized-lists@0.86.3 | braces | react-native@0.72.17 (major=true) |
| braces | high | node_modules/braces@3.0.3 | braces | react-native@0.72.17 (major=true) |
| decode-uri-component | moderate | node_modules/decode-uri-component@0.2.2 | decode-uri-component | expo-router@58.0.20 (major=true) |
| expo | high | node_modules/expo@57.0.30 | braces, uuid, node-forge | None |
| expo-router | moderate | node_modules/expo-router@57.0.28 | decode-uri-component | expo-router@58.0.20 (major=true) |
| expo-sharing | moderate | node_modules/expo-sharing@57.0.23 | uuid | expo-sharing@14.0.8 (major=true) |
| expo-splash-screen | moderate | node_modules/expo-splash-screen@57.0.10 | uuid | expo-splash-screen@55.0.25 (major=true) |
| expo-updates | high | node_modules/expo-updates@57.0.26 | node-forge | expo-updates@0.11.7 (major=true) |
| metro | high | node_modules/metro@0.84.5<br>node_modules/metro-config/node_modules/metro@0.84.6 | braces | react-native@0.72.17 (major=true) |
| metro-config | high | node_modules/@expo/metro/node_modules/metro-config@0.84.5<br>node_modules/metro-config@0.84.6<br>node_modules/metro/node_modules/metro-config@0.84.5 | braces | react-native@0.72.17 (major=true) |
| metro-file-map | high | node_modules/metro-config/node_modules/metro-file-map@0.84.6<br>node_modules/metro-file-map@0.84.5 | braces | react-native@0.72.17 (major=true) |
| metro-transform-worker | high | node_modules/metro-config/node_modules/metro-transform-worker@0.84.6<br>node_modules/metro-transform-worker@0.84.5 | braces | Resolution possible in graph; no full compatible root repair |
| micromatch | high | node_modules/micromatch@4.0.8 | braces | react-native@0.72.17 (major=true) |
| node-forge | high | node_modules/node-forge@1.4.0 | node-forge | None |
| query-string | moderate | node_modules/query-string@7.1.3 | decode-uri-component | expo-router@58.0.20 (major=true) |
| react-native | high | node_modules/react-native@0.86.3 | braces | react-native@0.72.17 (major=true) |
| react-native-reanimated | high | node_modules/react-native-reanimated@4.5.1 | braces | react-native-reanimated@4.2.2 (major=true) |
| react-native-worklets | high | node_modules/react-native-worklets@0.10.1 | braces | react-native-worklets@0.7.4 (major=true) |
| uuid | moderate | node_modules/xcode/node_modules/uuid@7.0.3 | uuid | None |
| xcode | moderate | node_modules/xcode@3.0.1 | uuid | None |
