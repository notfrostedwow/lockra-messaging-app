# Calling implementation, configuration and verification limits

This phase adds real LiveKit SDK adapters and authenticated signaling code. Calling
is disabled in the offline demo. No provider account, room, media connection,
microphone/camera permission, cloud spending or real-user session was used here.
Mock tests and successful builds do **not** establish a working two-client call.

## Official documentation and dependency selection

Reviewed 2026-10-16, using official docs directly because chub is absent:

- [LiveKit Expo quickstart](https://docs.livekit.io/transport/sdk-platforms/expo/)
- [JavaScript SDK](https://github.com/livekit/client-sdk-js)
- [React Native SDK](https://github.com/livekit/client-sdk-react-native)
- [Server SDK](https://github.com/livekit/node-sdks)
- [Token grants](https://docs.livekit.io/frontends/reference/tokens-grants/)
- [Expo WebRTC plugin version table](https://github.com/expo/config-plugins/tree/main/packages/react-native-webrtc)
- [JOSE signed JWT verification](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md)

Selected SDKs: livekit-client 2.22.4; livekit-server-sdk 2.19.1; @livekit/react-native
3.0.0; @livekit/react-native-webrtc 144.2.0; @livekit/react-native-expo-plugin
1.0.3; jose 6.2.12. The initial SDK 53 phase selected the compatible Expo plugin
12.0.0; the current SDK 57 migration uses **15.0.2**, whose Expo peer is >=56.
Registry scripts/engines/peers are retained in the evidence directory. Install
lifecycle scripts are ignored. Published JS/types are present; no prepare/build
script or native binary download was executed. Third-party licenses remain theirs.

Compatibility history: WebRTC Expo plugin 15.0.2 requires Expo >=56. Plugin 12 declares Expo
^53 and its official table pairs SDK 53 with upstream WebRTC 124.0.5. LiveKit's
current fork is **144.2.0**, not that table's upstream version. Its declared RN
peer >=0.60 and the RN SDK's broad peers accept this graph, but those declarations
do **not** prove SDK 53 native compatibility. The current RN SDK develops against
newer React Native. This combination needs real native compilation and device QA;
it may need a separately reviewed Expo upgrade or provider-compatible version
adjustment. No forced peers/overrides conceal that limitation. SDK 53 was then
migrated to maintained Expo 57.0.30 / RN 0.86.3. The current plugin peer accepts
that SDK, but its upstream compatibility table still does not establish LiveKit
fork/native runtime compatibility. Both combinations remain device-untested.

**LiveKit is not supported in Expo Go.** It requires a custom development build
with native WebRTC, audio-session setup and config plugins. `app.config.js` adds
the plugins only with deliberate LOCKRA_ENABLE_NATIVE_CALLING=true. Their Android
permissions and iOS settings require review. Native `registerGlobals`, Expo Camera
permission checks, AudioSession and VideoTrack integration are implemented and
type checked, but were not compiled/run on iOS or Android. A custom dev client
compatible with the current SDK is also required for the development-client workflow;
expo-dev-client 57.0.20 is now included. SDK 57 requires the New Architecture and
modern native toolchains; no iOS/Android build was attempted.
Windows/web export does not validate native autolinking, CocoaPods, Gradle,
permissions, microphone routing, video rendering, background behavior or Hermes.

## Actual client/server boundary

The original chat header now offers voice/video actions. In demo they report
unavailable before token lookup, SDK import, permissions or traffic. Integration
requires complete HTTPS API and WSS provider URLs plus EXPO_PUBLIC_ENABLE_CALLS=true.
The token response must match the configured media URL and the invite's generated
room. The existing demo build/preview commands never enable integrations.

`CallController` owns ringing/incoming/connecting/active/ended/error states,
accept/reject/join/leave, permission/connection failures, late completion cancellation,
microphone/camera toggles and SDK/listener/track cleanup. A root provider polls the
authenticated invite API; background/signout/unmount ends local media. Browser
page-unload server cleanup is best effort; server expiry is still necessary.
Web rendering attaches actual LiveKit media tracks; native rendering uses the SDK's
VideoTrack. An active local connection alone does not prove the peer joined.

The server verifies **RS256 signatures**, pinned issuer, calling audience, exp/iat,
session ID and authorized-party origin with JOSE and configured Clerk public JWKS.
There is no decode-only authorization. A server-operator-owned development
directory maps signed Clerk subjects to provisioned profile IDs and explicitly
allowed pairs. It is not supplied by an HTTP caller. Disabled profiles and
unlisted pairs are denied. No client-selected room, identity, role or provider
secret is accepted. Production profile, bans, bilateral blocks and relationship
authorization require a reviewed database-backed directory adapter; that adapter
is not claimed implemented or tested against Supabase.

The browser token contract now requires `azp` to be present, a nonempty string and
an exact configured origin. `sid` must be a nonempty string; whitespace-only
values are denied. JOSE requiredClaims enforces presence in addition to explicit
value checks. Missing azp is never accepted as a native/nonbrowser exemption.
The HTTP handler independently requires an exact allowed `Origin` on every
request, including GET and OPTIONS. Invalid/missing/opaque-null origins are denied
before JWT verification; an allowed Origin does not replace JWT claim checks.
These are two allowlist checks, not proof that a caller is a browser or a binding
between two different allowed origins. CORS is not authentication.

This is currently a **cross-origin browser API contract**. A browser supplies
Origin on cross-origin fetches; the client does not fabricate that header.
Origin-less same-origin GETs, native/nonbrowser transports and any different
token contract remain unsupported pending deliberate review. Native SDK/media
adapters remain source-preserved, not verified as a complete native calling flow.

Official docs rechecked 2026-10-16 before the boundary repair:
[Clerk session claims](https://clerk.com/docs/guides/sessions/session-tokens),
[authorized parties](https://clerk.com/docs/reference/backend/verify-token),
[custom session tokens](https://clerk.com/docs/guides/sessions/customize-session-tokens),
[JWT templates](https://clerk.com/docs/guides/sessions/jwt-templates), and
[JOSE 6.2.12 required claims](https://github.com/panva/jose/blob/v6.2.12/docs/types/interfaces/JWTClaimVerificationOptions.md).
Clerk may omit azp for some token-issuing requests; this application deliberately
rejects such tokens. Its custom JWT templates cannot include session-bound sid.
Calling therefore requests the ordinary session token via getToken(), not the
old lockra-calls JWT template. Signed local tests use generated keys, not Clerk
accounts, and establish only the application verifier/HTTP policy.

Invites expire after 60 seconds; only the invited callee can accept/reject. Only
participants can inspect/end. Tokens are minted only after acceptance, scoped to
the server-generated invite room and authenticated profile ID, with 60-second TTL,
camera/microphone sources only, no data publishing or admin/create/list grants.
The server bounds request rate, concurrent calls and total in-memory records.
Permission revocation/expiry ends the call; provider room deletion is attempted and
failures are surfaced/retried. The development repository is in memory and loses
invites on restart; it is not a durable production signaling store.

Issued provider JWTs cannot be assumed revoked by an application state change.
Room deletion is best effort, and a previously issued token may remain usable
within its lifetime depending on provider behavior. Independent review must test
rejoin/revocation and add durable lifecycle enforcement/provider hooks before
production. Session revocation relies on short signed-session expiry; no live
Clerk session-introspection/revocation call was performed. No production guarantee.

Calls use the SDK's WebRTC transport encryption. **Message E2EE does not establish
call E2EE.** No LiveKit E2EE key-provider configuration, group encryption, recording,
screen sharing, push ringing, OS call UI or background-call guarantee is claimed.

## Deliberate future setup (not executed)

Provider use, account creation, spending and deployment require separate approval.
Configure only an owned isolated test environment after independent security review.
Do not copy production identifiers or credentials. No server credential belongs in
Expo public configuration, app.json, client imports or CI.

The optional Node service reads explicit process variables, never dotenv files:

| Server variable | Purpose |
|---|---|
| LOCKRA_ENABLE_CALL_SERVER=true | Explicitly enable the local integration service |
| LOCKRA_CLERK_ISSUER | Owned test Clerk issuer, HTTPS |
| LOCKRA_CALL_AUDIENCE | Calling JWT audience (for example lockra-calls) |
| LOCKRA_CALL_ORIGINS | Comma-separated exact allowed browser origins |
| LOCKRA_CALL_DIRECTORY_FILE | Private operator-created JSON within artifacts/private |
| LOCKRA_LIVEKIT_URL | Owned test WSS media server |
| LOCKRA_LIVEKIT_API_KEY / LOCKRA_LIVEKIT_API_SECRET | SERVER ONLY provider credentials |

Directory shape (synthetic examples; do not commit actual users):

```json
{"profiles":[{"id":"test-profile-a","subject":"test-clerk-a","enabled":true},{"id":"test-profile-b","subject":"test-clerk-b","enabled":true}],"allowedPairs":[["test-profile-a","test-profile-b"]]}
```

After explicit configuration, the unexecuted command is:

```powershell
node --import tsx server/calling/start.ts
```

It binds 127.0.0.1:4178 only. A separately reviewed HTTPS proxy/origin policy is
required for the client's HTTPS API contract. An owned test Clerk instance must
deliberately configure its **session token** with the calling audience expected
by the server, preserving any other integration-required audiences/claims. This
requires separate review alongside the Supabase token contract; no audience or
service configuration was changed here. A custom JWT template cannot supply sid
and is not an alternative. The private directory must map the signed sub to actual
provisioned profile IDs. Integration startup additionally needs the original
Clerk/Supabase public configuration and reviewed database policies. No provider
setup or deployment command has been executed.

The current SDK 57 native build would additionally set LOCKRA_ENABLE_NATIVE_CALLING=true
and use a compatible custom development client. Default npm android/ios commands
force offline demo and sanitize inherited environment; they do not enable this
integration. No native build command was executed here.

## Verified scope

Mocked SDK and server tests exercise actual controller, SDK bridge, JWT verifier,
HTTP handler, directory, token minting and invite lifecycle code. They cover
authorization denial, grants, cancellation, rejection, denied permissions, failed
connections, disconnect/track/audio cleanup and provider cleanup failure. Remaining
blockers: provider/test identity configuration, HTTPS setup, persistent production
authorization/signaling, native build compatibility, actual permissions/media
and real two-client/provider QA. These are explicit unverified capabilities.
