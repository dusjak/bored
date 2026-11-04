# First TestFlight build

This is how to put bored. on your own iPhone through TestFlight. You do not need Xcode installed. The Apple Developer Program enrollment is still pending. You can install the CLI and read this now. The first build cannot finish until that enrollment is active, because Apple is who signs the app.

Nothing in this repo contains an Apple ID or a team id. Do not invent them. The Expo account owner (`thekingdule`) and the EAS project id live in `app.json` (`owner`, `extra.eas.projectId`). On the first build, EAS creates the distribution certificate and the provisioning profile after you sign in with your Apple ID.

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

## 3. EAS project

`eas init` has already been run. `app.json` has `owner` set to `thekingdule` and `extra.eas.projectId` set to `6fb5350f-f6a2-4f6b-ae86-05365f76b9ce`. Do not create a second project, and do not paste a different id. `app.config.js` keeps that id: it spreads `extra` from `app.json` and only replaces `backupMode` (default `preview`) and, during a build, `easBuildProfile`.

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

## Splash tiers

Three plates, all `#111110` with the S6 wordmark in `#F8F6F2`.

| Tier | When | What you should see |
| --- | --- | --- |
| MegaSplash | First launch, and after Nullstill (Profil → Nullstill) | The wordmark draws into the dot for 150 ms, then «Sluket» v5 preset C. About 3.45 s, then a cut into the app. |
| Splash (D2 Pust) | A later cold start. Also a return from background after 60 s or more away. | The wordmark holds, Klumpen scales up to 1.14 and back by 700 ms. Dark app: 200 ms fade. Light app: a cut. |
| Dråpe | Reduce Motion, the kill switch, a crash, and the native splash | The still wordmark. Reduce Motion holds 600 ms. A return under 60 s leaves as soon as the app is active. |

Tap anywhere on MegaSplash, Pust, or Dråpe to skip. An open session or a reflection never shows a plate. Control Center (`inactive`) does not either.

The 60 s background threshold is an open question. It lives in `BACKGROUND_RETURN_MIN_MS`.

`bored.splashSeen` is written when MegaSplash hands off, and immediately if that player crashes. Dråpe on a first launch does not write it, so MegaSplash still runs once motion is allowed. Backgrounding during MegaSplash does not count as seeing it.

## Native splash

The native splash is Dråpe: `assets/splash/splash-wordmark-s6-dark.png` at 160 pt wide on `#111110`, including the `@2x` and `@3x` files. `expo-splash-screen` bakes that into the native binary.

Expo Go does not show this image. On SDK 58 it shows the app icon instead of the splash screen configured in `app.json`. A development build also does not apply every splash-screen plugin property. Check the native splash in a TestFlight build or another release build: it should be the still S6 wordmark, then the JS plate (MegaSplash or Pust) should already be up when it hides, with no empty frame and no jump.

In Expo Go you can still check the JS tiers: delete the app data or use Nullstill for MegaSplash, relaunch for Pust, and turn on Reduce Motion for Dråpe. The theme exit (cut on light, fade on dark) is also visible in Expo Go. The native image itself is not.

## Profiles

| Profile | Use |
| --- | --- |
| `development` | Dev client, internal distribution. Not for TestFlight. The dev-client package is not installed yet. |
| `testflight` | The profile to use for this first TestFlight. Store distribution. |
| `production` | Store distribution for a later App Store release. Do not use it for the tester build. |

## Profiles that are not production

The splash work and the backup preview are both on master. Only the EAS profile named `production` counts as production. `testflight` does not.

`app.config.js` defaults `BACKUP_MODE` to `preview`. That is allowed for `testflight`, so a TestFlight build keeps the honest preview backup: the screens are real, and nothing leaves the phone. The same preview mode throws when `EAS_BUILD_PROFILE` is `production`. Use `BACKUP_MODE=off` or `BACKUP_MODE=live` for that profile.

The splash replay on «Jeg har allerede en konto» stays on for `testflight`. It stays off in a release binary whose profile was not baked in, and when that profile cannot be read. A failed read does not crash launch. The missing profile is not production, so preview backup stays available. Preview backup still fails when the profile is `production`. `app.config.js` copies `EAS_BUILD_PROFILE` into `extra.easBuildProfile` and omits the key when it is unset. Do not write `null` there. Expo's serializer turns `null` into `{}`.

The native splash is the always-dark S6 wordmark (`splash-wordmark-s6-dark.png`, `#111110`). Change it in `app.json` and ship a new binary. Expo Go will not show the change.
