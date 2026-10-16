# Framework maintenance migration

Current follow-up: [SDK57-RESIDUAL-REVIEW.md](SDK57-RESIDUAL-REVIEW.md) records the
user-authorized supported alignment and residual-risk decision from a69de52.
React/DOM now follow the exact SDK57 recommendation, 19.2.3; TypeScript follows
~6.0.3. The unused optional RSC transport was omitted from this existing non-RSC
SPA, preserving all application features and source. No vulnerable RSC version
or incompatible peer was forced to satisfy alignment. The migration account
below describes the earlier reviewed graph and remains historical evidence.

The original SDK 53 baseline, DM encryption and calling phases were restored and
checked sequentially before this migration. Their actual failure/pass outputs and
commits remain in the fresh local history. A dependency audit found SDK 53 was
outside the maintained window and still carried 45 graph findings after compatible
fixes. Green functional checks were not treated as a clean dependency audit.

Official sources reviewed on 2026-10-16 before implementation:

- https://expo.dev/changelog/sdk-54
- https://expo.dev/changelog/sdk-55
- https://expo.dev/changelog/sdk-56
- https://expo.dev/changelog/sdk-57
- https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/router/migrate/sdk-55-to-56/
- https://clerk.com/docs/expo/getting-started/quickstart

Selected Expo 57.0.30 / React Native 0.86.3, following the SDK's official bundled
module ranges. This is a maintained release family according to Expo's documented
approximately one-year window. React, React DOM and React Server DOM Webpack are
pinned to the compatible patched 19.2.9 branch. Clerk Expo 4.12.0 declares Expo
>=54 <58 and retains the legacy custom-form exports used by the preserved screens.
Registry peer/script receipts are retained. Peer acceptance is not native runtime
proof. No lifecycle scripts, native builds or service configuration were run.

Source repairs preserve existing behavior and design:

- Legacy file APIs now import expo-file-system/legacy, as the official migration
  documents require. Removed options/constants were updated to supported equivalents.
- Navigation imports use Expo Router's documented entry points. The first export
  caught a remaining external DrawerActions import; it was fixed without setting
  the check-disabling environment variable. Unused direct external navigation
  packages were removed. The existing drawer/sidebar/tab design remains.
- The newer hooks rules remain fully enabled. Components defined inside render
  were moved to module scope with their own theme context, animation instances use
  stable lazy state, search results derive directly from contacts/query, and theme
  follows the system until an explicit user selection. Loader callbacks use the
  existing stable-event hook and explicit effect dependencies. Declaration order
  was repaired. No lint rules, assertions or coverage were removed.
- Stacks reset per identity so a prior account's mounted screen state is discarded.
- Device settings no longer invent capacities, granted permissions or cache deletion.
  Replaced legacy sample callbacks are retained as non-runnable source references.
  Default demo storage cleanup cannot delete device files or authentication data.
- Legacy real-client RPC execution is now always quarantined before SDK invocation;
  the local demo's safe directory mock remains separate. All original SQL remains
  non-runnable. The new DM schema draft also aborts deliberately and is untested SQL.

Native compatibility remains unverified. SDK 57 requires the New Architecture,
modern native toolchains and a new custom development build. LiveKit still cannot
run in Expo Go. Its plugin now uses 15.0.2 (peer Expo >=56); the upstream plugin
table and LiveKit's newer WebRTC fork are not a device-compatibility guarantee.
The original SDK 53 combination was never claimed device-tested. See CALLING.md
and E2EE.md for the platform/storage boundaries and setup blockers.

The first SDK 57 source check exposed six type errors and 84 newer lint errors;
they were repaired. Subsequent strict types, all 43 tests and zero-warning lint
passed before the final clean-install/export verification. The final suite has 45
tests, including denial of real admin routes despite a client-side admin profile.
Browser testing caught a denied deep-link fallback; the root now redirects only
after navigation mounts, with a public landing route first and stacks reset per
identity. Privacy settings also require a session. No remote CI is claimed.
