# First TestFlight build

This is how to put bored. on your own iPhone through TestFlight. You do not need Xcode installed. The Apple Developer Program enrollment is still pending. You can install the CLI and read this now. The first build cannot finish until that enrollment is active, because Apple is who signs the app.

Nothing in this repo contains an Apple ID, a team id, or an EAS project id. Do not invent them. `eas init` writes the project id when you run it. On the first build, EAS creates the distribution certificate and the provisioning profile after you sign in with your Apple ID.

## What is already set

| Setting | Value |
| --- | --- |
| Display name | `BORED.` (already in `app.json`; left as it was) |
| Bundle id | `no.bored.app` (permanent) |
| Android package | `no.bored.app` |
| User-facing version | `1.0.0` |
| iOS build number seed | `1` |
| Icon | `assets/icon/icon-1024.png` (opaque RGB, no rounded corners added) |
| Icon source | `assets/icon/icon.svg` (not used by the app config) |
| Export compliance | `ios.config.usesNonExemptEncryption: false` |
| Notification prompt | `bored. varsler når økta er ferdig.` |
| Push entitlement | off (`enableRemoteNotifications: false`). The app only schedules local alerts. |

The TestFlight command uses the profile named `testflight`. That profile is not `production`.

## 1. Install EAS CLI

From the repo root, with Node installed:

```sh
npm install -g eas-cli
eas --version
```

`eas.json` asks for EAS CLI 16 or newer. Install the current CLI. `npx eas-cli` works too if you would rather not install it globally. The examples below use `eas`.

## 2. Log in to Expo

```sh
eas login
```

Use the Expo account that should own this project. This is not the Apple ID. Apple sign-in happens later, during the build.

## 3. Create the EAS project

```sh
eas init
```

This creates the project on Expo's servers and writes `extra.eas.projectId` into the app config. Commit that change. If the command prints a project id, that is the real one. Do not paste an id from somewhere else.

## 4. Build for TestFlight

```sh
eas build -p ios --profile testflight
```

What this profile does:

- `distribution` is `store`. TestFlight only accepts store builds. An internal EAS build is a different thing (a link-installed ad hoc build) and cannot be uploaded to TestFlight.
- The profile name is `testflight`, so `EAS_BUILD_PROFILE` is `testflight`. It is not `production`. See the last section for the open pull requests.
- `autoIncrement` is on, and `cli.appVersionSource` is `remote`. EAS stores the iOS build number on its servers. `ios.buildNumber` in `app.json` is `"1"` and seeds that counter. You do not edit the build number by hand before each upload. After EAS has a remote counter, the number in `app.json` is not what Apple receives. Each later `testflight` or `production` build uses the next number, so two uploads cannot share one.

The first time you build, the CLI asks you to sign in with your Apple ID in the terminal and to complete two-factor authentication. Use the Apple ID that the Developer Program enrollment is for. When it offers to create a distribution certificate and a provisioning profile, let it. You do not create those in the Apple developer site yourself, and you do not commit them.

The build runs on Expo's servers. When it finishes, the CLI prints a link to the build page. Wait until the status is finished.

`development` is a separate profile for a dev client. `expo-dev-client` is not installed, so do not use `--profile development` for this first build.

## 5. Send the build to App Store Connect

```sh
eas submit -p ios --profile testflight
```

Pick the build you just made if the CLI asks. Submit uploads the `.ipa` to App Store Connect. It does not release the app on the App Store.

`submit.testflight.ios` and `submit.production.ios` in `eas.json` are empty on purpose. After the app exists in App Store Connect you can fill in:

- `appleId`: the Apple ID email you use for App Store Connect
- `ascAppId`: the numeric Apple ID on the app's App Information page. It is a number, not `no.bored.app`.

Leave both out until you have the real values. The CLI asks for them when they are missing.

You can later add `--auto-submit` to the build command so upload starts when the build finishes. The first time, run build and submit as two commands so you can see each step.

## 6. Add yourself as an internal tester

1. Open [App Store Connect](https://appstoreconnect.apple.com) and sign in with the same Apple ID.
2. Open the app (bundle id `no.bored.app`). The first successful submit creates the record if it was not there yet.
3. Open the TestFlight tab.
4. Wait until the build finishes processing. This often takes several minutes and sometimes longer. Export compliance is already declared (`usesNonExemptEncryption: false`), so the build should not sit on Missing Compliance.
5. Under Internal Testing, open the internal group (App Store Connect creates one for users on the team).
6. Add the build to that group once processing has finished.
7. Add yourself as a tester with the Apple ID email on your iPhone.

Internal testers are people on the App Store Connect team. You do not need a beta-app review for the internal group.

## 7. Install it on the iPhone

1. On the iPhone, install Apple's TestFlight app from the App Store.
2. Open the invite email, or open TestFlight and accept the app.
3. Install bored. The home-screen name is `BORED.`

## Native splash

`expo-splash-screen` is baked into the native binary. You can only check that splash in a TestFlight build or another release build. Expo Go shows Expo Go's own splash, so it is not a check of this app's native splash.

## Profiles

| Profile | Use |
| --- | --- |
| `development` | Dev client, internal distribution. Not for TestFlight. The dev-client package is not installed yet. |
| `testflight` | The profile to use for this first TestFlight. Store distribution. |
| `production` | Store distribution for a later App Store release. Do not use it for the tester build. |

## Open pull requests

Two unmerged pull requests branch on whether the EAS profile is `production`. The `testflight` profile is not that name.

**PR #6** (backup preview) throws while Expo evaluates the config if `BACKUP_MODE` is `preview` and the profile is `production`. Any other profile, including `testflight`, keeps the preview backup, which is the honest TestFlight behavior (the screens are real, nothing leaves the phone).

Hook it up by replacing the inline check in `src/backup/mode.ts`:

```ts
import { isProductionBuildProfile } from '../config/buildProfile.ts';

if (mode === 'preview' && isProductionBuildProfile(easBuildProfile)) {
  throw new Error(
    "BACKUP_MODE 'preview' cannot ship when EAS_BUILD_PROFILE is 'production'. Use 'off' or 'live'.",
  );
}
```

`assertBackupMode` already receives `process.env.EAS_BUILD_PROFILE` from `app.config.ts`. Pass that same value through. Do not treat `testflight` as production.

When that `app.config.ts` lands, Expo will load it instead of `app.config.js`. Copy the profile into `extra` there as well, or a release binary cannot see the profile name:

```ts
const easBuildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
const extra = { ...config.extra, backupMode };
if (typeof easBuildProfile === 'string' && easBuildProfile.length > 0) {
  extra.easBuildProfile = easBuildProfile;
}
```

**PR #7** (splash) adds `app.config.js` and `src/config/buildProfile.ts`. The temporary «Jeg har allerede en konto» hook replays the splash when `__DEV__` is true, or when the baked profile is set and is not `production`. `testflight` keeps the hook on. A release build with no profile baked in turns the hook off, which is why the `extra.easBuildProfile` copy has to survive the merge.

`src/config/buildProfile.ts` on this branch already uses PR #7's names (`easBuildProfile`, `isDevBuild`) and reads `extra.easBuildProfile`. It also reads `process.env.EAS_BUILD_PROFILE` first, and it adds `isProductionBuildProfile`. When the two copies of the file meet, keep all of that. Leave `expo-constants` inside the function. A top-level import would run while `app.config.ts` loads this module.

PR #7's `app.config.js` assigns `null` when the env var is missing. Expo's config serializer turns that `null` into `{}`. This branch omits the key instead. Keep that omission when the files are merged, in both `app.config.js` and the `app.config.ts` snippet above.
