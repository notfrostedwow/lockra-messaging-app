# DM text encryption implementation and limits

Reviewed official maintainer docs on 2026-10-16:
[noble-ciphers](https://github.com/paulmillr/noble-ciphers),
[noble-curves](https://github.com/paulmillr/noble-curves),
[noble-hashes](https://github.com/paulmillr/noble-hashes), and SDK 53's
[SecureStore source docs](https://github.com/expo/expo/blob/sdk-53/docs/pages/versions/v53.0.0/sdk/securestore.mdx).
Selected exact versions: all three noble packages 2.4.0, with MIT licenses retained
in the installed dependency distribution. Their package engines accept Node >=20.19;
the verified runtime is Node 22.23.3. They are maintained JavaScript libraries whose
docs include React Native support; no custom native crypto module is required.
The first phase used SDK 53's Crypto 14.1.5 and SecureStore 14.2.4. The current
maintenance migration uses SDK 57's Crypto 57.0.4 and SecureStore 57.0.4, following
its official bundled-module metadata. The SecureStore config plugin enables its
Android backup exclusions. Only web export/runtime and mocked Node tests have
been exercised. Hermes/native execution, SecureStore hardware behavior and custom
builds for either SDK remain untested.
Current Expo Go compatibility is not assumed.

`lib/e2ee/protocol.ts` wires the libraries' X25519, HKDF-SHA256 and
XChaCha20-Poly1305. It implements no cipher, curve or KDF primitive. Each message
uses a fresh cryptographic 24-byte nonce. Authenticated context includes protocol
version, message ID, immutable sender/recipient IDs, timestamp, both key fingerprints
and nonce. Usernames remain mutable display/routing fields. Plaintext is absent
from newly persisted DM rows: content is empty, ciphertext contains a versioned
envelope, encryption_version is 1 and recipient_id is immutable.

The actual send helper encrypts before insertion. The Supabase-shaped adapter
decrypts query results and realtime events in memory for existing conversation and
preview screens. Local persistence contains ciphertext. There is no plaintext
fallback: missing/changed/unverified keys block sends, and failed integrity or lost
keys produce an explicit unavailable placeholder. Duplicate message IDs are denied;
conflicting ciphertext for an already observed ID is rejected. Re-reading identical
history is allowed. This is not an independently audited asynchronous messaging
protocol, a Double Ratchet, or a durable anti-rollback/anti-omission protocol.

Before sending, compare **both full public-key SHA-256 fingerprints** over a separate
trusted channel. The key controls explicitly confirm that comparison. Trust is
scoped to the current local key and recipient key; rotation requires comparison
again. A malicious directory can substitute first-contact keys until users actually
compare them. A recipient with the shared secret can forge the conversation; no
non-repudiation or message-signature claim is made. Identity publication requires
backend ownership authorization as well as this client guard.
Incoming text decrypted before a comparison is explicitly labelled Unverified
identity key. Only the compared key can produce a verified display status.

Native private keys and trust decisions use SecureStore, one small record per key,
WHEN_UNLOCKED_THIS_DEVICE_ONLY. Rotation retains old local keys for old history.
No private key is uploaded. **Web uses memory only**, including trust decisions:
reload loses keys and encrypted history becomes unreadable. localStorage contains
synthetic tables/ciphertext, never device private keys. Memory is vulnerable to XSS,
malicious extensions, compromised client code and a compromised endpoint; immutable
JavaScript strings cannot be reliably zeroized. Native backup/reinstall/keychain
behavior also needs device review. There is no multi-device enrollment, recovery,
key export, forward secrecy or post-compromise security.

The synthetic demo deliberately holds every synthetic participant's keys in one
browser process, enabling local interactions. It demonstrates the code path and
ciphertext storage, **not two-device confidentiality**. Never enter real messages.

Original messages remain plaintext and are displayed with a Legacy plaintext label.
They are not silently migrated or retroactively secured. Legacy attachments remain
source-preserved, but new DM attachment sends are blocked until an encrypted file
protocol exists. Community messages remain explicitly outside this DM-only design.
Read receipts, participant/timing metadata and message lengths are not hidden.

The server schema contract is a non-runnable reference at
`docs/schema/dm-encryption.sql.txt`; actual guarded DDL is supplied in
`docs/schema/dm-encryption-draft.sql.txt`. Its first statement deliberately aborts.
The draft includes immutable public-key history, ciphertext columns, column grants
and narrowly scoped policy helpers with fixed search_path; their ownership,
grants, identity mapping and policies still require independent isolated review.
No SQL or live service was used. Before enabling
real integration, independently review and test schema migration, immutable key
history, Clerk JWT validation, participant RLS and rollback/replay behavior in an
isolated database. Client encryption never replaces authorization. Independent
security review remains required; no production-security guarantee is made.

Phase verification: 28 total assertion tests, strict TypeScript, zero-warning lint
and web export passed. A real browser send displayed decrypted synthetic text while
the persisted row had empty content, version 1 and ciphertext without the sent
plaintext. Browser resource inspection found no external requests. See
`docs/evidence/e2ee-browser-qa.json` and `docs/screenshots/chat-encrypted-wide.png`.
Those are the initial SDK 53 phase results. Current framework/final verification
is recorded separately in the restoration report; no historical output is relabelled.
