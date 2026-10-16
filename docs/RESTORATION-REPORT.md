# Lockra restoration handoff — 2026-10-16

Implemented only in `<WORKSPACE>`.
This remains an unpublished, isolated source copy of Zaheer's substantial app.
No remote was created, no push/publication/visibility/pin action occurred, and
no original project or history was modified. The shortener and other projects
were untouched. No live service, SQL, provider room, account or spending was used.

## Source, authorship and complete preservation

Source: private `notfrostedwow/lockra-messaging`, default SHA
`7029d5b7fefdfa8ecd40270e25e8092230200fb5`. The parent independently reconfirmed
privacy and the SHA before authorizing this job. This implementation used the
complete supplied sanitized snapshot, without original `.git` or history.
It did not use the incomplete 16-file staging copy.

All **151 intake hashes** and their **151 original hashes** were verified against
the supplied manifests before editing. The full contract covers **152 original
tracked paths**, with only `supabase/.temp/cli-latest` omitted; **all 41 original
app TS/TSX paths** have preserved source mappings. The final verifier checks
original/intake agreement, unique path coverage, that sole omission and every
current target hash. All mapped targets are tracked in this fresh repository.

The complete path-by-path mapping is [preservation.json](evidence/preservation.json).
Original and intake receipts are [original-manifest.json](evidence/original-manifest.json)
and [intake-manifest.json](evidence/intake-manifest.json). They retain the original
hashes; current hashes describe reviewed restoration changes, not identical source.
[FEATURE-PRESERVATION.md](FEATURE-PRESERVATION.md) maps capabilities and relocations.

| Original capability | Preserved implementation and boundary |
|---|---|
| DM screens, list/history/read/send/realtime/media contracts | Existing chat and service entry points remain. Synthetic repository exercises local interactions. DM text now encrypts before persistence and decrypts reads/events in memory; cloud attachments are blocked pending encrypted-file support. |
| Community discovery, private codes, membership, messages, roles, moderation, topics/rules/pins | Existing UI and service algorithms retained; repository extraction makes actual logic injectable for offline tests. Browser private-code join and first post worked. Community text is outside DM E2EE. |
| Contacts/new chat/user directory | Existing components/routes remain, with synthetic directory and working search. |
| Clerk forms, session/profile sync, callbacks, guards | Existing source retained. Missing AuthContext import repaired; providers/support modules moved outside Router discovery. Demo profiles are explicitly synthetic. Real provisioning requires a reviewed server; unsigned JWT decoding and cached JSON grant no authority. |
| Admin users/bans/reports/analytics/database | All source screens remain. Ordinary users are denied before mounting; real admin execution stays blocked even with a client profile role. Arbitrary SQL and fabricated maintenance success are unavailable. |
| Billing/premium/subscriptions | Existing UI, queries and schema references remain. No purchase creation, fabricated subscription or live billing. |
| Profile/settings/device/privacy/security/storage | Existing screens retained. Device measurements use actual readable constants or unavailable. Demo cleanup cannot erase device/auth data. Fabricated sample callbacks remain as non-runnable references. SecureBoot's original unlocked stub is disclosed. |
| Notifications/uploads/ads/email/logging | Contracts remain. External execution defaults off. Privileged client logging is disabled; no LogSnag secret is exposed through Expo public configuration. Retired ads accurately report unavailable. Future logging belongs on a reviewed server. |
| Database SQL/admin scripts/live auth diagnostic | Original SQL and privileged script bodies retained verbatim in docs/legacy outside migration/route discovery. Executable script entries fail closed. Offline assertion tests replace the live diagnostic. No SQL/RLS verification is claimed. |
| Original assets and third-party material | Both PNGs remain byte-preserved. Original comments/notices are retained where present; no blanket MIT grant was added. Rights/privacy review is pending. |

See [ATTRIBUTION.md](../ATTRIBUTION.md) and
[THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md). Restoration and new features
are attributed as changes to Zaheer's app, not fabricated original authorship.

## Sequential implementation and local commits

All project commits use verified local author
`notfrostedwow <105129603+notfrostedwow@users.noreply.github.com>`.

| Commit | Phase and actual verification |
|---|---|
| `e1bac9943b93a161b54c5b41ca09159a341e26c2` | Full source baseline; 22 tests, strict types, lint, export and actual synthetic web QA. |
| `8984d4e97f2d4590a4ab2a8a7b41e384f0e983e2` | DM encryption wired through send/read/storage; 28 tests and real browser ciphertext inspection. |
| `7d7c7325da5ae69e65559fd426491ca43fc55244` | Authenticated calling API, LiveKit adapters/UI and cleanup; 41 tests with explicit SDK/service mocks, types/lint/export; offline rejection QA. |
| `f599c2c1ada9738bb8112440d5d9ce6a4e66851e` | Maintained Expo 57 migration, authorization/data-boundary repairs, final 45 tests and current web QA/screenshots. |

The final documentation/scan handoff is a subsequent local commit; its exact hash
and final clean status are supplied in the completion response. No remote CI has
run. Host-managed `refs/t3/checkpoints/*` are separate internal snapshots, not
original private Git history or project publication commits.

The first three unpublished project commits received a targeted privacy rewrite
after discovery of a legacy support contact in terms and an early lint source
echo. Authors, dates, messages and check outcomes were retained; affected hashes
were updated. [fresh-history-sanitization.json](evidence/fresh-history-sanitization.json)
records exact old/new commit IDs. This never touched the private original.

## Final verification

Windows, Node **22.23.3**, npm **10.9.9**. Heavy jobs ran serially with bounded
workers/heaps; no second implementation job was launched.

| Command | Actual result and output |
|---|---|
| `npm ci --ignore-scripts` | Exit 0; clean 1,116-package install in seven minutes. [Raw output](evidence/npm-ci-final-verified.txt). |
| `npm test` | Exit 0; **45 passed, 0 failed/skipped/cancelled/todo**. [TAP output](evidence/tests-final-verified.txt). |
| `npm run typecheck` | Exit 0; strict TypeScript. [Output](evidence/types-final-verified.txt). |
| `npm run lint` | Exit 0; zero errors/warnings, no rules disabled. [Output](evidence/lint-final-verified.txt). |
| `npm run build:web` | Exit 0; 3,406 modules, six web bundles, exported dist. [Output](evidence/export-final-verified.txt). |
| `npm start` | Actually started localhost Metro and rendered the app; intentionally stopped its verified process before final export. [Output](evidence/start-final.txt). CI-mode launcher disables hot reload; restart after edits. |
| `npm run verify:preservation` | Exit 0; all 151 mappings/41 original app paths and original/intake/current hashes checked. [Output](evidence/preservation-final-verified.txt). |
| `git diff --check` | Passed after trimming whitespace from 38 added source lines; no tokens or line counts changed. |
| `npm audit --json` | **Exit 1: 33 findings, 21 high/12 moderate/0 critical**. [Actual JSON](evidence/npm-audit-final-verified.json). Unresolved release blocker. |

Command captures use their original PowerShell encodings; stderr informational
output may be wrapped as NativeCommandError even when the checked process exit
is 0. Failures were not erased: initial peer resolution, six migration type errors,
84 newer lint errors, navigation export failure, privacy-helper lint failure and
a deliberately stale preservation receipt are recorded separately. A current
receipt was then generated and verified. No lifecycle scripts, force, legacy peer
mode, dependency override or installed-package patch hides resolution failures.

Tests exercise actual existing send/community/directory logic, auth/role and SQL
denial, profile impersonation guards, alert behavior, encryption roundtrip/tamper/
wrong-key/context/replay/missing-key/legacy behavior, signed JWT authorization,
scoped tokens, invite permissions, call failure/permission/cleanup races and SDK
bridge behavior. They do not prove Supabase RLS or provider/device operation.

SDK 53 was first restored, then migrated because its maintenance/audit status was
unacceptable. Current Expo **57.0.30**, RN **0.86.3**, React **19.2.9**, Clerk Expo
**4.12.0** and Supabase JS **2.118.0** are recorded with official sources/date and
resolved versions. [SDK-MAINTENANCE.md](SDK-MAINTENANCE.md),
[DEPENDENCIES.md](DEPENDENCIES.md) and [dependency receipt](evidence/dependencies-final.json)
explain selection, remaining advisories and unsupported transitive/tooling warnings.
Declared peers/types do not establish native runtime compatibility.

## Actual browser QA and screenshot paths

The final export ran at **http://127.0.0.1:4177**, using only synthetic data.
At **390×844** and **1440×900**, QA exercised the authentication chooser,
chat navigation, explicit key comparison, encrypted local send, ciphertext
inspection, contacts filtering, private-code community join plus the real web
confirmation/navigation, and first community post. Same-document navigation to
admin/users as ordinary Zaheer returned to chats without mounting admin UI.
Signed-out deep admin navigation showed a safe public landing; its URL initially
remained the requested path, and Sign In navigated correctly. No secret or private
application data appeared. Calling failed closed before permission/provider use.

New DM text displayed while the persisted row had empty content, version 1 and
ciphertext without that plaintext. Reload preserved ciphertext but discarded web
keys/session; after synthetic sign-in, explicit missing-key placeholders appeared.
Observed resource entries contained **no external requests**. This is observed
scope, not a comprehensive network/security audit. Transient preview disconnects
and animation-obstructed clicks were retried and not counted as successes.

Genuine, unedited captures:

- [Authentication](screenshots/authentication-final.png)
- [Chat, narrow](screenshots/chat-final.png) and [wide](screenshots/chat-wide-final.png)
- [Contacts search](screenshots/contacts-final.png)
- [Private community](screenshots/community-final.png)
- [Calling disabled explanation](screenshots/calling-disabled-final.png)

[browser-final-qa.json](evidence/browser-final-qa.json) records actions, boolean
storage observations, viewport sizes and limitations. Older baseline/phase
captures remain clearly associated with their original verification. Browser
history contains accessibility-focus and native-driver fallback warnings; no
comprehensive accessibility or device audit is claimed.

## Encryption, calling and platform limits

DM text uses maintained noble ciphers/curves/hashes **2.4.0**, wired into existing
send/history/realtime code, plus explicit full fingerprint comparison. Primitives
are library implementations; the application protocol is custom and unaudited.
Native SecureStore/private-key persistence is implemented but device-untested.
Web private keys/trust are memory-only, vulnerable to compromised client code and
lost on reload. The synthetic demo holds both identities in one process.
No secure-localStorage, two-device confidentiality, forward secrecy, recovery,
multi-device, encrypted attachments or group-encryption claim is made. Old
plaintext stays labelled; there is no silent plaintext send fallback. The guarded
schema draft aborts outside migration discovery and has never been executed.
See [E2EE.md](E2EE.md) for identity, rotation, migration and threat-model details.

Calling uses LiveKit client **2.22.4**, RN **3.0.0**, WebRTC fork **144.2.0**,
server SDK **2.19.1**, Expo plugin **1.0.3**, WebRTC Expo plugin **15.0.2** and
JOSE **6.2.12**. Real adapters, UI join/leave/accept/reject/permissions/cleanup,
signed-session signaling and short scoped server tokens are implemented and
mock-tested. Provider secrets remain server-only. No public room or client-side
provider credential is used. Production directory/signaling persistence,
revocation hooks, credentials, HTTPS setup and real two-client/provider QA remain
blockers. Development in-memory authorization is not a production data boundary.
Issued-token rejoin/revocation behavior still requires independent provider tests.
Message encryption does not encrypt calls end to end; only WebRTC transport
encryption is described. See [CALLING.md](CALLING.md).

**LiveKit cannot run in Expo Go.** Native calling requires reviewed config plugins
and a custom development build. Initial SDK 53 peers never established native
compatibility; current SDK 57/plugin peers do not establish it either. iOS,
Android, Hermes, SecureStore, biometric/MFA, notifications, media permissions,
background behavior, CocoaPods and Gradle were not built/tested. Native APIs that
have no web implementation remain unavailable; Windows/web verification is not
device proof. No real Clerk/Supabase integration, isolated SQL/RLS tests or remote
GitHub Actions run is claimed.

## Sanitization, scans and publication blockers

The parent intake performed six targeted app.json replacements. Restoration
replaced deployment associations/identifiers, public invitation URLs, AdMob unit
and client logging configuration, removed sensitive diagnostic payloads and
disabled unsafe service execution without excluding whole feature modules.
The original anon Supabase client was not treated as a privileged service-role
credential. A legacy support contact/source echo was later replaced with
support@example.invalid; [privacy-redactions.json](evidence/privacy-redactions.json)
contains counts and before/after hashes without disclosing the address.

Forced Gitleaks 8.30.1 scans use default rules, redaction, ignored inline allows,
unlimited target size and `git --log-opts=--all`. No .gitleaksignore exists.
The complete current source/docs/tests/env examples and dist are in scope;
generated dependencies/tools/caches and raw Git objects are excluded from the
directory pass, with reachable history scanned separately. JSON reports were
empty and exit codes 0. A post-implementation receipt and final post-handoff scan
are checked separately; the completion response states the final result.
The post-implementation history pass scanned seven commits (four project commits
plus three internal snapshots), exit 0, with no detected leaks:
[JSON](evidence/gitleaks-history-post-implementation.json) and
[raw output](evidence/gitleaks-history-post-implementation.txt). The handoff tree
pass, including this report and dist, also exited 0 with no detected leaks:
[JSON](evidence/gitleaks-tree-handoff.json) and [raw output](evidence/gitleaks-tree-handoff.txt).
Scanner success does not establish absence of private data or asset rights.

**Host-owned refs/t3/checkpoints remain unchanged and may retain legacy contact
or deployment literals. Never mirror/publish those internal refs.** The parent
must independently scan and manually review every ref before any source/history
export. The project branch's three unpublished commits were sanitized; that is
not a claim that every host checkpoint is privacy-cleared.

The original two PNGs were inspected visually and structurally; no metadata
chunks/trailing data or apparent personal subject were found. Their provenance
and redistribution rights remain unverified. [assets.json](evidence/assets.json)
records exact hashes/chunks and limitations. No blanket license clears inherited
code, art or bundled dependency assets.

Publication remains blocked on the **33 dependency findings**, independent
security review of encryption/calling and backend authorization, isolated policy
tests before integration, native/provider QA for those claims, and manual
privacy/provenance/license review. The parent must independently inspect the full
current tree and all fresh history, rerun forced scans and runtime QA, and read
actual GitHub Actions results after any separately authorized publication.
The private original stays private. No remote/publication/pin is authorized here.
