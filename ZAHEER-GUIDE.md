# Zaheer's walkthrough

Start by explaining that this is your existing Expo/React Native application,
preserved from your private source at the SHA in ATTRIBUTION.md. The restoration
retains messaging/community services, original screen design, account/session
workflows, admin tools, premium UI and database architecture. It is not a small
replacement application built to imitate screenshots.

For a verified web walkthrough, run `npm ci`, `npm run build:web`, then
`npm run preview:web`, and choose a clearly
marked synthetic identity on Sign In. Show the DM list, open Alice's conversation,
open Verify keys and explicitly confirm the synthetic fingerprint comparison,
send a local message, inspect contacts and search, then open communities. Sign out
and choose another synthetic profile to explain identity isolation. An ordinary
profile must not render an admin route. The synthetic admin can inspect preserved
tools; maintenance actions accurately report that no server job ran.

Explain the data boundary: existing screens use the existing service/query
contracts. Demo mode supplies a local repository. Integration mode is deliberate,
requires complete configuration, and remains runtime-unverified against real
services. Clerk owns real identity; signed tokens and database/server policies
must authorize every operation. Cached JSON and JWT decoding are not authority.

Discuss a concrete restoration finding: the original guard imported a nonexistent
AuthContext, the dependency graph relied on legacy peer resolution, and the auth
diagnostic called live services without assertions. The evidence directory records
actual repair checks and failures, rather than invented green results.

Be candid about limitations. Source presence does not prove calls, encryption,
payments, push notifications, attachments or device behavior work. Use the final
README/status evidence for additions and their exact verification scope. Web
screenshots do not prove iOS/Android support. Provider mock tests do not prove a
real two-client call or real RLS. Rights/security review and publication are still
separate parent responsibilities; the original repository stays private.

Show the actual DM boundary: the browser displays decrypted text, while the
namespaced synthetic message row has empty content and a ciphertext envelope.
Explain that both synthetic users' keys share one browser and that reload loses
web keys. Old messages are labelled plaintext; this is not two-device security
proof. The calling buttons accurately report unavailable in demo. Walk through
the real LiveKit adapters and signed-session invite/token server using the mocked
integration tests, without calling them a verified live call.
