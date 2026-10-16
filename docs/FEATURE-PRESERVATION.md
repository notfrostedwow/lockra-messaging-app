# Source and capability preservation

The intake contains 151 of 152 original tracked paths, including all 41 app TS/TSX
paths. `supabase/.temp/cli-latest` is the sole original omission. All original
hashes agree with the source preservation manifest; all intake bytes were checked
against `docs/evidence/intake-manifest.json` before editing. The supplied manifests
contain hashes and decisions, not original Git history.

The supported SDK57 follow-up preserves the legacy linking object in
`docs/legacy/app-linking.json`; scheme and file-based auth/tab routes remain.
It aligns React/DOM/TypeScript, omits the unused optional RSC/webpack transport
added during restoration (there is no original RSC feature), and adds browser
URL input checks without changing screen design, encryption or calling source.
See `sdk57-residual-lock-delta.json` and the current preservation record for
transparent path/hash reasons. No original application module was removed.

| Existing source/capability | Restoration boundary |
|---|---|
| `app/(tabs)/index.tsx`, `app/chat/**` | Existing DM UI, list/read/send, local subscriptions; synthetic repository replaces service execution in demo. Attachments stay as source, cloud uploads disabled. |
| `lib/communityService.ts`, `app/community/**`, community screens | Existing service algorithms retained in injectable `lib/communityRepository.ts`; original public entry point remains. Membership/role checks also enforced by demo repository. |
| `app/contacts.tsx`, `app/new-chat.tsx`, `components/UserList.tsx` | Existing UI retained; contacts now use the same synthetic directory and actual search input. |
| Sign-in/up/reset/verification/callback routes | Original forms and integration flows retained; explicit synthetic-profile chooser added. Missing legacy email verification helper fails closed. |
| `app/contexts/AuthContext.tsx` | Relocated to `contexts/AuthContext.tsx` outside route discovery. Demo and deliberately configured real providers share the existing contract. Client-side verified-user provisioning removed in favor of server provisioning. |
| `app/contexts/SecureBootContext.tsx` | Relocated to `contexts/SecureBootContext.tsx`; original unlocked stub is honestly documented. No biometric-security claim. |
| `contexts/AuthGuard.tsx`, `components/AuthWrapper.tsx` | Preserved guard entry points; shared complete route policy, no cached-JSON authority, non-admin routes denied before mounting. |
| `app/components/NotificationListener.tsx` | Relocated to `components/NotificationListener.tsx`; subscription source retained, no live notifications. |
| `app/types.ts` | Relocated to `types/user-profile.ts`; type contract retained outside route discovery. |
| `app/admin/**`, `app/admin-panel.tsx` | All admin screens retained; synthetic role only in demo. Real admin requires a server boundary. No arbitrary SQL route; maintenance reports unavailable rather than fabricated success. |
| `app/premium.tsx`, `lib/billingService.ts`, subscription SQL | Preserved premium/subscription architecture; no payment creation, billing call or pretend active subscription. |
| `lib/logsnag.ts`, `lib/errorTracking.ts`, callers | Existing event/error contracts retained. Client sink disabled; no privileged public env key or device/user telemetry. |
| Ad reward UI in `components/Sidebar.tsx` | Workflow source retained; retired AdMob dependency replaced by an explicitly unavailable adapter. No reward is manufactured. |
| `lib/clerkAuth.ts`, `lib/supabase.ts`, session/cache helpers | Existing interfaces retained; no unsigned JWT authorization, anonymous service fallback or implicit deployment configuration. Real SDKs load through the integration-only boundary. |
| All original SQL/fix references | Relocated verbatim to `docs/legacy/<original-path>.txt`. Non-runnable, outside migrations and routes. Unsafe policies/functions have not been executed. |
| Privileged `scripts/*.js` | Existing paths are fail-closed entry points; original bodies retained in `docs/legacy/scripts/*.js.txt`. |
| `test_auth.js` | Live diagnostic retained as `docs/legacy/test_auth.js.txt`; original entry point rejects execution and directs to offline assertion tests. |
| App/Metro/EAS config, manifests and launchers | Structures preserved; deployment identifiers removed, update/upload/tunnel/env discovery disabled, dependency graph reconciled. |
| Original assets | Both PNGs retained pending independent privacy/license/provenance review. No redistribution rights inferred. |

Targeted intake redactions were six replacements in `app.json`, per the parent
manifest. Restoration additionally replaces the embedded AdMob unit identifier,
public invite/deep-link deployment URLs, Sentry build associations, Expo project
association and client logging config; it removes diagnostic payloads that could
contain tokens, message text or user data. The final per-file hash mapping records
all changed and relocated paths. No whole auth, admin, database or billing feature
has been excluded to make the build smaller.

Mock repository checks do not prove backend authorization. Real RLS and native
features remain unverified. New message encryption and calling are distinct
implementation phases; they were not present in the original source.

New phase mapping: `lib/e2ee/*`, `DMEncryptionPanel`, the existing send helper and
Supabase query/realtime adapter implement DM text encryption. `lib/calling/*`,
`server/calling/*`, CallingContext, CallControls and platform media renderers
implement the calling boundary. The original chat route/service remains in use.
DM attachment execution is explicitly blocked until encrypted files exist; all
original attachment source remains present. Communities remain outside DM E2EE.
Logging/error entry points remain disabled-safe; unused client Sentry/LogSnag SDK
packages were removed, with a future server adapter documented. Unused
expo-module-scripts tooling was removed after confirming no project script or
test uses it; no existing assertion tests, coverage or rules were deleted.

The maintained SDK migration keeps all source mappings. Device settings sample
callbacks are archived outside executable discovery; current measurements use
actual readable platform constants or say unavailable. The terms screen's legacy
support contact and an early lint source echo received targeted example-address
redactions, documented with before/after hashes in privacy-redactions.json.
Original/intake hash receipts remain unchanged. Internal host checkpoint refs are
preserved and excluded from any future project publication; see SECURITY.md.
