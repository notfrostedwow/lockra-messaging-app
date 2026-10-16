# Restoration evidence

This is Zaheer's full source application, derived from private default commit
`7029d5b7fefdfa8ecd40270e25e8092230200fb5`. Original history was not imported.
Parent independently reconfirmed privacy/default SHA on 2026-10-15.
Intake verification: all 151 exported file hashes match the supplied intake manifest;
all 151 original hashes agree with the preservation manifest, including all 41 app
TypeScript paths. Only `supabase/.temp/cli-latest` was omitted.

## Actual baseline failures

Windows, Node 25.1.0, npm 11.6.2. On 2026-10-15,
`npm ci --ignore-scripts --legacy-peer-deps=false --no-audit --no-fund`
exited 1 with ERESOLVE: lucide-react-native 0.475.0 supports React up to 18,
but the app requires React 19. No lifecycle scripts executed.
The legacy `.npmrc` had concealed peer conflicts. The lock root also lists Resend,
which the manifest does not. ESLint/config are absent. AuthGuard imports a
nonexistent sibling AuthContext and requests missing provider properties.

Source-backed inventory: DM list/send/read/subscriptions and attachment workflows;
community discovery, private invite join, membership, messages, moderation, roles,
locking, topics/rules/pins; contacts (originally hardcoded), profile/settings,
Clerk sign-in/up/reset/verification and session sync; admin users/bans/reports,
analytics/database UI; subscription queries and premium UI; notifications,
logging/error abstractions; SQL schema and policy sources. Source presence is
not proof of functioning service integration. Database backup/optimization and
some moderation actions were placeholders. Original E2EE/calling copy had no
implementation evidence. SecureBoot currently supplies an unlocked stub.

## Dependency/documentation review — 2026-10-15

The supplied get-api-docs, frontend-design and vercel-react-best-practices skills
were read. `chub` is absent; official documentation and registry metadata are used
directly, as the user authorized. Supplemental React rule files were not supplied.
No redesign is authorized; existing visual language is retained.

- https://expo.dev/changelog/sdk-53 (React 19 / RN 0.79)
- https://raw.githubusercontent.com/expo/expo/sdk-53/packages/expo/bundledNativeModules.json
- https://raw.githubusercontent.com/expo/expo/sdk-53/docs/pages/versions/v53.0.0/sdk/securestore.mdx
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/develop/development-builds/introduction/
- https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3
- https://clerk.com/docs/expo/getting-started/quickstart
- https://supabase.com/docs/guides/auth/third-party/clerk

Versioned Expo website URLs redirect to latest docs, so SDK 53's official source
and installed bundledNativeModules metadata are the compatibility authority.
Clerk's old package is deprecated; @clerk/expo 3.7.8 declares Expo >=53 <58,
whereas 4.12.0 requires >=54. Peer declarations establish a candidate, not native
runtime verification. Expo 53 is an older SDK; current Expo Go is not assumed
compatible. Custom builds and iOS/Android verification remain separate work.

Original lock lifecycle flags reviewed against registry scripts: Clerk shared
postinstall; Sentry CLI binary downloader; browser-tabs-lock postinstall; core-js
postinstall notice; fsevents native build; ngrok binary downloader. First install
uses ignore-scripts. No Sentry/ngrok download or cloud configuration is needed.
Any later required lifecycle action must be inspected explicitly.

## Verified restored baseline

Node 22.23.3 / npm 10.9.9 on Windows: clean `npm ci --ignore-scripts`
installed 1,475 packages without peer bypasses. No lifecycle scripts ran.
After the explicit Router query-string and drawer dependency repairs,
22 assertion tests, strict TypeScript, zero-warning lint and web export passed.
Their actual outputs are retained in `docs/evidence/*-baseline.txt`.

The exported app actually ran at 127.0.0.1:4177. Browser QA at 390x844
and 1440x900 exercised synthetic sign-in, chat send/read/persistence, community
join plus confirmation/navigation and posting, and contacts search. Resource
inspection found no external requests. Screenshots in `docs/screenshots` are
actual synthetic app captures. Web Alert callbacks required a real accessible
dialog adapter because React Native Web's native Alert implementation is empty.
The iOS-only text prompt/MFA workflow remains unverified.

This proves local web behavior only. No native build, device test, live
authentication, database policy test, provider call or remote CI run occurred.
