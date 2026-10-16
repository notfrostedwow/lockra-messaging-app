# Security boundaries and review status

This is an offline portfolio restoration. It has no production-security
guarantee. Do not enter real credentials or messages into the offline demo.

Demo identities, rows, subscriptions and role checks are local simulations. They
do not authenticate a person. Browser data is editable by its user and same-origin
scripts. Demo policy tests are application logic tests, not proof of Supabase RLS
or signed-identity verification. The new DM text E2EE does not replace backend
authorization and must receive independent security review.

Real authentication belongs to Clerk; Supabase must validate its signed session
and enforce database ownership and membership. An unsigned decoded JWT, cached
profile JSON, frontend role field or client-selected verified status cannot grant
authority. User provisioning and admin operations require a reviewed server.
The legacy unsigned JWT helper fails closed. Missing/placeholder integration
configuration is rejected before SDK initialization. Offline mode is the default.

Legacy SQL includes an arbitrary `SECURITY DEFINER` SQL executor, caller-selected
verified-user provisioning, universal user policies, broad grants, overlapping
migrations and incompletely protected billing schema. All original SQL is retained
as `.txt` references under `docs/legacy`, outside executable discovery. None has
been executed here. Do not apply it. There is no claim that RLS is verified.

Client LogSnag/Sentry reporting is disabled and receives no privileged key.
Never add privileged keys to `EXPO_PUBLIC_*`, Expo extra, source, logs, screenshots,
bundles or CI. Public Supabase anon and Clerk publishable keys are client
configuration, but actual deployment identifiers are replaced to avoid accidental
connections. A future logging adapter belongs on an authenticated server with
strict event minimization; never forward message text or session tokens.

Offline startup blocks nonlocal fetch/XHR/sockets and installs a web content
policy. No tunnel, OTA updates, ads, email, billing or cloud storage is enabled.
These controls supplement provider isolation; runtime request inspection is still
required. Report a suspected source or credential leak privately to Zaheer before
publication. Do not include a secret in a public issue, commit or reproduction.

Original PNGs were visually inspected: a generic grid placeholder and a small
cube mark, with no apparent personal image. That does not establish authorship,
license, metadata privacy or redistribution rights. Independent manual provenance
review remains required. No blanket license is applied to legacy material.

DM encryption uses maintained library primitives, explicit identity comparison and
device-held keys. Web keys/trust remain memory-only, with no recovery on reload;
native SecureStore is implemented but device-untested. Legacy plaintext remains
labelled and is not silently migrated. No encrypted attachments, groups, forward
secrecy or security audit is claimed. See docs/E2EE.md.

Calling requires a separate authenticated server. Provider secrets stay server-only;
JWT signature/issuer/audience/session checks and server-owned invite/pair permissions
gate short-lived room-scoped tokens. The development repository is in memory, not
a production authorization store. Provider cleanup/revocation and two-client/native
operation need independent QA. Transport encryption is not call E2EE. See docs/CALLING.md.

The user's current dependency gate replaces the earlier blanket moderate stop:
no remaining critical/high advisory may affect runtime paths. Residual moderate
runtime and tooling findings retain their actual severity and require the
per-advisory evidence and mitigations below. npm's production/dev flags and totals
alone cannot establish reachability. The explicit policy is versioned in
docs/dependency-risk-policy.json; unknown advisories, changed affected versions
or paths, incomplete reports and high runtime imports fail closed.
See docs/SDK57-RESIDUAL-REVIEW.md for the current command results. Earlier evidence
in docs/REMEDIATION-REPORT.md records the prior decision and is historical.
Legacy real-client RPC calls are quarantined before SDK execution. The new DM
schema draft deliberately aborts, remains outside migration discovery and has
not been executed or policy-tested.

A legacy support address was replaced by support@example.invalid in this tree
and this copy's three unpublished project commits. Hash-only redaction receipts
are in docs/evidence/privacy-redactions.json. Host-owned refs/t3/checkpoints refs
remain unchanged and may retain contact/deployment literals. They are not project
publication history: never mirror or publish those internal refs. The parent must
independently inspect all refs, the complete tree and fresh history before any
export. A secret scanner alone does not establish privacy or redistribution rights.

## Browser calling session repair — 2026-10-16

The verifier now requires a nonempty authorized azp and nonempty sid in a
signature-verified session JWT. Missing/empty/whitespace/nonstring claims are
denied; authorized-party comparison is exact. The calling client requests the
session token, as a custom Clerk JWT template cannot contain session-bound sid.
Issuer/audience/algorithm/age/expiry checks remain intact. Any required calling
audience must be configured and reviewed on an owned isolated test issuer before
integration; no service settings or real tokens were used here.

HTTP Origin is a separate control: the API requires an exact configured Origin
even on GET/OPTIONS and rejects absent, empty, null or foreign values before
authentication. An allowed Origin cannot supply or replace azp. This supports a
cross-origin browser frontend; Origin-less same-origin/native/nonbrowser flows
are unsupported pending deliberate design review. CORS does not authenticate
clients, and a caller can forge an Origin header outside a browser. Two allowed
origins are independently checked, not cryptographically bound to each other.

Signed synthetic-JWT regressions reproduced failures before the repair, then
passed using generated test keys. No provider/key service or production data was
used. Calls remain disabled in demo. Native storage, real authentication, RLS,
two-client calls and device operation remain unverified; message E2EE does not
establish call E2EE. Current official Clerk/JOSE sources are linked in docs/CALLING.md.

## Residual dependency risks under the current user decision

All four vulnerable installed nodes are transitive and remain installed by
`npm ci --omit=dev`; none is relabelled as a devDependency or low severity.
The 33 audit entries propagate four underlying advisories through their parents.
Runtime assessment examines the vulnerable code itself, not a parent's name.
Exact chains, code excerpts/line references and bundle receipts are in
docs/evidence/sdk57-residual-source-paths.json and
docs/evidence/sdk57-residual-runtime-assessment.json. The current checks and
limits are recorded in docs/SDK57-RESIDUAL-REVIEW.md.

### braces 3.0.3: high, build/development execution

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) /
CVE-2026-93687 affects `node_modules/braces@3.0.3` (<=3.0.3).
The SDK57 Expo/React Native Metro chains reach metro-file-map's watcher helpers,
which call micromatch 4.0.8's `some`. Micromatch eagerly imports braces (`^3.0.3`)
and exposes a `braces` helper that calls it. The observed watcher `some` path
delegates to picomatch; this does not prove invocation of the vulnerable brace
walker. The package is installed/loadable in tooling. Its recursive walkers can
exhaust a Node stack; neither severity nor reachability follows from npm flags.
The gate checks that braces code is absent from fresh web/iOS/Android app JS and
the optional calling-server graph; bundle-specific observations belong to the
linked receipt, not a claim about every future configuration.

Mitigation: use only trusted repository and Metro glob configuration; run Metro
on localhost, never a public tunnel or production server. Serve only the static
SPA output, not the development toolchain. Reassess before changing deployment,
watcher configuration or importing glob tools in application/server code.
The advisory has no patch and the official registry still offers 3.0.3 as latest;
no supported SDK57 transitive update can remove it. No fork/backport is authorized.
Severity remains **high** even where the observed execution scope is tooling.

### node-forge 1.4.0: high, CLI/certificate execution

[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) /
CVE-2026-85393 affects `node_modules/node-forge@1.4.0` (<=1.4.0).
Expo 57.0.30 → @expo/cli 57.0.31 directly uses forge for development signing;
@expo/code-signing-certificates 0.0.6 also imports it, reached through the CLI
and expo-updates 57.0.26's certificate/build tooling. Their ranges are `^1.3.3`.
The affected RSA PKCS#1 v1.5 verifier accepts extra nested DigestAlgorithm data.
This JS library is distinct from noble DM primitives, JOSE's signed calling
verifier and native Expo update verification implementations.

Mitigation: no certificate ingestion/signing or OTA workflow is enabled; updates
remain disabled. No Expo CLI is deployed as a service. Gate all three application
JS maps and the optional calling-server graph against forge inclusion. Native JS
export does not prove a compiled native binary or its update verifier secure.
No native/provider distribution is cleared here. Advisory and current registry
list no fixed release (latest 1.4.0), so there is no supported patch to apply.
No source deletion, override or unrelated crypto replacement hides this **high** risk.

### nested uuid 7.0.3: moderate, native project tooling

[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) /
CVE-2026-41907 affects `node_modules/xcode/node_modules/uuid@7.0.3`.
Expo's @expo/config-plugins 57.0.10 → xcode 3.0.1 requires uuid `^7.0.3`.
The advisory concerns v3/v5/v6 with caller-supplied output buffers. The concrete
xcode `lib/pbxProject.js` caller uses `uuid.v4()` for project IDs, not those APIs.
The app's direct uuid 11.1.1 is a separate, fixed instance; matching package names
alone would incorrectly classify it as this vulnerable nested copy.

Mitigation: trusted native project/config inputs only; the gate rejects inclusion
of the affected nested v7 into runtime graphs. Keep its **moderate** severity and
production-installed classification. Fixed uuid 11.1.1/12.0.1/13.0.1 lie outside
xcode's v7 range; current xcode 3.0.1 has no compatible repaired release. No forced
major or fork is permitted. This is not native build/device verification.

### decode-uri-component 0.2.2: moderate, retained runtime code

[GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) /
CVE-2026-45822 affects `node_modules/decode-uri-component@0.2.2` (<=0.4.2).
Expo Router 57.0.28 → query-string 7.1.3 → decoder `^0.2.2` is a runtime chain.
Router's vendored navigation `build/react-navigation/core/getStateFromPath.js`
passes URL query data to query-string.parse, which calls the decoder. The Router
fork's analogous parse call is commented out; a bundle import alone is not proof
that the vulnerable fallback is exercised by the current screen. The runtime
library remains conservatively assessed as reachable and must not be classified dev-only.
Malformed percent-encoded input can drive excessive fallback decoding work.

Mitigation implemented for the browser: before Router imports, reject malformed
percent encodings/UTF8 using the platform `decodeURIComponent`, and bound route
path/query/hash to 2048 characters. The guard also precedes Router's back/hash
listeners and redirects rejected locations to `/`, without logging input. The
localhost preview returns 400 for malformed and 414 for oversized request URLs.
Valid routes/callback queries/encoded delimiters/Unicode remain supported.
A legitimate URL over the bound is rejected too; owned-test authentication
callback sizes must be reviewed before enabling an integration.
A future static host must preserve request size/encoding restrictions. This is
defense in depth, not proof that every internal routing input is unreachable.
Native intents, integration callbacks and hostile same-origin scripts are not
claimed comprehensively mitigated or device-tested. No native/provider release
clearance follows from this browser boundary.

Only fixed decoder 0.5.0 is published; it violates `^0.2.2` and switches to an ESM
default export incompatible with the parent's direct CommonJS call. Latest
SDK57 Router and query-string7 publish no compatible fix. The previous isolated
artifact/API proof remains in dependency-remediation-decoder-compatibility.json.
No fork, backport, package patch or incompatible override was made. This remains
an openly documented **moderate runtime residual**, accepted for assessment under
the user's new gate, not silently repaired, waived as low or hidden from npm.

The dependency gate is only one publication condition. Independent complete-tree,
fresh-history, privacy/provenance, browser QA and post-publication CI review remain
with the rollout owner. No remote, push, publication, rename or live service use
is authorized in this workspace.
