# Backend proposal: Supabase, off by default

BORED. stays a local app. SQLite on the phone is the source of truth. Supabase is an optional backup that runs only after someone signs in on purpose. With the flag off, which is how the app ships, nothing in this proposal changes launch, onboarding, sessions, or Nullstill.

## Where sign-in will live

Signed-out and local-only is the normal state. Sign-in is fully optional.

It does not appear in onboarding or on first launch. The future product entry is a row on the **Deg** tab (`src/app/(tabs)/profile.tsx`, tab label «Deg»), working title **«Sikkerhetskopi»**. Design has not specced that screen, so it is not built. Opening it will be an opt-in. Until then, engineers can reach a throwaway console at `bored://dev/backup` in a dev build only. That route redirects away in production and is not linked from Deg, onboarding, or the first-launch path.

## Recommendation

Use Supabase (Postgres, Auth, Row Level Security) in an EU region. Keep the sync client in the repo, gated by `features.backendSync`. Turn it on by creating a project, running the migration, and setting three env vars. No custom native code is required for Expo Go on SDK 57.

Why this and not the neighbours:

| Option | Fit for BORED. |
| --- | --- |
| **Supabase** | Postgres you can read, EU regions, Apple and anonymous auth, row level security, a plain JS client that runs in Expo Go. We keep SQLite and write the sync ourselves, which matches a small data model. |
| **Firebase** | Auth is fine. Firestore is a different database, and its offline cache wants to be the source of truth. That fights the SQLite model already in the app. EU region exists, but security rules are a second dialect and exports are clumsier. |
| **iCloud / CloudKit** | Stays inside Apple's account, which is attractive for a privacy-minded iOS app. There is no Expo Go client for CloudKit. It needs a custom native module, it does not cover a later Android build, and the sync rules are opaque. |
| **PowerSync or ElectricSQL** | Real sync engines. They are the right tool if the model grows into collaborative or high-churn data. For a single-user log of sessions and settings they add a service, a bill, and an auth story we would still have to bolt on. |
| **InstantDB** | Fast to prototype, but the database is their model, not a Postgres database the team owns in an EU project. Harder to reason about for GDPR and for a later move. |

The data is a personal log: durations, a mood, a short note, a display name, a few settings. Last-write-wins on a timestamp is enough. A sync engine would not buy much yet.

## What is built, and what a human still has to do

Built in the repo, inert until the flag is on:

- `src/config/features.ts` — `features.backendSync` is off unless the explicit flag and both public env vars are set.
- `supabase/migrations/20261019120000_bored_init.sql` — tables, RLS, and idempotent upsert functions.
- `supabase/config.toml` — local CLI config. Anonymous sign-in is enabled there. The Apple provider is left off until a secret exists.
- `src/lib/supabase.ts` — supabase-js, session stored in chunked `expo-secure-store` (Expo Go, no AsyncStorage).
- `src/auth/backupAuth.ts` — Sign in with Apple via `expo-apple-authentication` and `signInWithIdToken`, plus anonymous sign-in. Neither is called from launch or onboarding.
- `src/sync/merge.ts` and `src/sync/engine.ts` — last-write-wins, soft-delete propagation, upserts keyed by client UUIDs.
- `src/data/migrateIds.ts` — rewrites any pre-UUID session or note id. New ids already come from `crypto.randomUUID()`.
- `src/app/dev/backup.tsx` — dev-only console.

A human still has to create the Supabase project, create the Apple key, and paste the URL and anon key. The checklist is at the bottom. Do not point the flag at a production project until the Nullstill decision below is settled.

## Data model

Local tables stay as they are: `sessions`, `journal_entries`, `settings`. Two bookkeeping tables were added (`sync_tombstones`, `sync_state`). They are empty while sync is off. Screens do not read them.

Cloud tables:

| Table | Columns that matter |
| --- | --- |
| `profiles` | `id` (auth user), `display_name`, `updated_at`, `deleted_at`. A trigger creates the row when the auth user is created. `display_name` is a mirror of `bored.profile.name`, written when that setting is pushed. The settings JSON remains what the app reads. |
| `sessions` | Client UUID. `chosen_duration_seconds` (planned), `actual_duration_seconds`, `started_at`, `ended_at`, `status`, generated `aborted` flag, `mood`, `note`, `created_at`, `updated_at`, `deleted_at`. |
| `settings` | `(user_id, key)`, `value`, `updated_at`, `deleted_at`. |

Not uploaded, on purpose:

- `notification_id` and `backgrounded_at` — they belong to one phone's in-progress session.
- Sessions with status `active` — an in-progress økt is not a backup row. Finished (`completed`) and stopped-early (`aborted`) sessions are.
- `bored.splashSeen` — whether this phone has played the intro.

Uploaded settings: theme, default duration, onboarded flag, profile JSON (name and onboarding answers), countdown preference.

Row level security: each policy is `auth.uid() = user_id` (or `id` on profiles). The anon key with no session sees nothing. Anonymous sign-in is still the `authenticated` role, so a person who chose the fallback gets a private backup too. Deletes of the auth user cascade to their rows.

Upserts go through `upsert_session`, `upsert_setting`, and `upsert_profile`. The SQL ignores a write whose `updated_at` is older than the stored row, so a retry or a slow phone cannot roll the backup backwards.

## Sync strategy

1. If the flag is off, or there is no session, return. No database read for sync, no network.
2. If this phone was already bound to a different account, return `account-mismatch` and upload nothing. One local database must not be poured into a second account.
3. Pull this user's sessions and settings.
4. Merge each id by `updated_at`. The later stamp wins. Equal stamps do nothing, so a second sync is quiet. If the stamps are equal and only one side is deleted, the delete wins.
5. Apply remote winners to SQLite, including a soft delete (the local row is removed). A remote delete for a row this phone already removed is left alone.
6. Push local winners, including tombstones for sessions deleted on the phone while sync was on. The push is an upsert on the client UUID.
7. After a successful push of a tombstone, drop the local tombstone.

The first successful pass stores the auth user id in `sync_state`. Nullstill clears that bookmark along with the other local rows. It does **not** tell the server.

Clocks: the client `updated_at` is the merge clock. A phone with a very wrong clock can win or lose unfairly. Acceptable at this size; a server-side clock would be a later change.

Notes: the cloud session carries `mood` and `note` because each session has at most one note. Locally the note is still `journal_entries`. Editing or clearing a note bumps the session's `updated_at`, so an older cloud note cannot restore a note the person just deleted.

Local deletes stay hard deletes. The cloud row gets `deleted_at`. A tombstone is written only when the flag is on, and only for a finished session. That keeps every existing screen query the same while sync is off. A delete made while the flag is off is not recorded. If that session had already been backed up, the next sync will pull it back down. Leave the flag on for the life of a backup.

## Auth

Primary: Sign in with Apple. The dev console (and later Sikkerhetskopi) requests a nonce, hashes it with SHA-256, and calls `supabase.auth.signInWithIdToken`. Apple's name is stored on the auth user the first time Apple returns it. It is not written into the local profile.

Fallback: `signInAnonymously()`, only after an explicit tap. The project must enable anonymous sign-ins. Losing that phone's session token means losing access to that anonymous backup. Apple is the durable identity.

Sign-out clears the Supabase session in SecureStore and leaves SQLite untouched.

There is no automatic sign-in, no anonymous session on first launch, and no account linking. An anonymous backup and a later Apple sign-in are two user ids. The mismatch guard stops the second one from absorbing the phone's rows. Linking is an open decision.

Expo Go can exercise Apple sign-in. Add the Expo Go bundle id `host.exp.Exponent` to the Apple provider's client ids. `ios.usesAppleSignIn` is already set for a later EAS build. `expo-apple-authentication`, `expo-secure-store`, `expo-crypto`, and `expo-sqlite` all ship inside Expo Go for SDK 57. `@supabase/supabase-js` is plain JavaScript.

## Nullstill

Today, Nullstill wipes this phone only: sessions, notes, settings, scheduled alerts, and the local sync bookmark. It does not delete cloud rows. That behaviour is unchanged.

That is a product decision, not an oversight. Three options:

| | What the person experiences | Cloud |
| --- | --- | --- |
| **A. Local only** (what the code does now) | This phone looks new. | The backup remains. The next sign-in on this phone, or on a new phone, pulls the sessions back. That can feel like Nullstill failed. |
| **B. Local wipe plus soft-delete the backup** | This phone looks new, and the backup of those sessions is marked deleted. The account remains. | Matches «start over» better, if they think of Sikkerhetskopi as part of the phone. A second device would also lose those sessions on its next sync. |
| **C. Delete the account** | The Apple (or anonymous) identity and every row are removed. | This is the App Store account-deletion action. It is a different button from Nullstill. |

**Proposal:** ship B for Nullstill once someone is signed in, with a confirmation line that the backup is cleared too. Ship C as a separate «Slett konto» action inside Sikkerhetskopi, which the App Store requires before release if the app creates accounts. Until that is chosen and built, do not enable the flag for anyone but the team. A team member who Nullstills and then syncs on the dev console will otherwise see their backup return.

## Privacy and GDPR

- Create the project in an EU region. For a Norwegian app, prefer **eu-north-1 (Stockholm)**. **eu-central-1 (Frankfurt)** is the other straightforward choice. Say which region you picked in the privacy policy.
- The team is the controller. Supabase is the processor. Accept their DPA in the dashboard before any real user's notes are stored.
- Data minimisation: durations, start and end, aborted or not, an optional mood, an optional note, the onboarding answers and display name, theme, duration, countdown. No notification ids, no push tokens, no location, no contacts, no analytics in this proposal.
- Apple may give an email or a private relay address, and a stable Apple subject. That lives in Supabase Auth, not in the session tables.
- Transport is HTTPS. Supabase encrypts the database at rest. The on-device SQLite file is not encrypted; that was already true before this proposal.
- Anonymous backups are still personal data. The notes are the sensitive part, not the account email.
- App Store Review Guideline 5.1.1(v): if the app lets someone create an account, it must let them delete it inside the app, including a Sign in with Apple account. The cascade above is the server half. The button is not built. Do not submit to the App Store with accounts enabled before «Slett konto» exists, plus a privacy policy URL.
- A person can ask for export or erasure. Export can be a JSON dump of their rows. Erasure is deleting the auth user. Neither endpoint is implemented yet.

## Cost at MVP

Checked against Supabase's pricing page in October 2026. Recheck before buying.

A prototype with the team and a small TestFlight sits inside the **Free** plan: $0, 50,000 monthly active users, 500 MB database, 5 GB egress, unlimited API requests. A few thousand session rows are kilobytes. Free projects **pause after a week of inactivity**, and an organisation can only have two active free projects. Pausing is a bad surprise for a beta.

Move to **Pro** (from $25 per month, includes one Micro compute instance and 7-day backups) before people outside the team depend on the backup. 100,000 MAU included, then about $0.00325 per MAU. At a few hundred or a few thousand people the bill stays at the base price. Auth, Apple, and anonymous sign-in are included. This proposal does not use Storage, Realtime, or Edge Functions.

## Turn it on

1. Create a Supabase project in an EU region. Prefer `eu-north-1` (Stockholm).
2. In Authentication → Providers, enable **Anonymous sign-ins**.
3. Create a Sign in with Apple key in the Apple Developer account (Team ID, Key ID, `.p8`). Enable the capability on the app id. In the Supabase Apple provider, set the client ids to `host.exp.Exponent` (Expo Go) and, later, the real bundle id. Native sign-in does not need a Services ID. Leave the secret out of git.
4. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from the repo root:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   `db push` applies `supabase/migrations/20261019120000_bored_init.sql`. The SQL editor in the dashboard is a fallback if the CLI is not available.

5. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from Project Settings → API. Use the anon (public) key, never the service role key.
6. Set `EXPO_PUBLIC_BACKEND_SYNC=1`.
7. Restart Metro (`npx expo start`). The flag is read from `EXPO_PUBLIC_*` at bundle time.
8. On a dev build, open `bored://dev/backup`. Sign in with Apple, or use the anonymous fallback, then tap Sync now. Confirm a finished session appears in the Supabase table editor and that a second sync does not duplicate it.
9. Confirm a normal launch with the flag set back to `0` never shows that screen and never calls the network.

`features.backendSync` is true only when the flag is exactly `1` or `true` **and** both URL and anon key are non-empty. Shipping without the env vars keeps the app local even if someone flips the flag.

## Adjustments to the original sketch

- **Soft deletes live in the cloud, not in the local session queries.** Local code still hard-deletes. While the flag is on, a finished delete also writes a tombstone that the next sync upserts with `deleted_at`. Filtering `deleted_at` out of every screen query would have touched the session paths another change is already editing, for no user-visible difference while sync is off.
- **In-progress sessions are not synced.** The live row carries a notification id and a background timestamp that are meaningless on another phone.
- **Sign-in is not wired into navigation** beyond the dev console, and that console is not on the first-launch path. Sikkerhetskopi on Deg is the planned home.
- **Anonymous sign-in does not run by itself.** It is a button, not a startup step.
- **Session storage is chunked SecureStore**, not AsyncStorage. The auth session is a credential, and a single Keychain value has historically failed above about 2048 bytes. Both modules are in Expo Go. Expo's SQLite `localStorage` polyfill would also work; it stores the token in plaintext in the app database, so it was not used.
- **A second account cannot take over the phone's database.** That guard is stricter than a silent merge, and it is there until account linking is designed.

## Open decisions

1. Nullstill: A, B, or C above. The code implements A only.
2. Whether an anonymous backup can later be linked to Apple, and what happens to the rows.
3. Whether onboarding answers in `bored.profile` should travel with the backup (they do in this draft) or stay on the phone.
4. Stockholm versus Frankfurt.
5. Free (pauses) versus Pro before anyone outside the team turns the flag on.
6. The in-app account-deletion flow required for the App Store, and the privacy policy URL.
7. Whether a badly set device clock is acceptable as the merge clock.
