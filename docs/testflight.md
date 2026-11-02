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

## Profiles that are not production

The splash work and the backup preview are both on master. Only the EAS profile named `production` counts as production. `testflight` does not.

`app.config.js` defaults `BACKUP_MODE` to `preview`. That is allowed for `testflight`, so a TestFlight build keeps the honest preview backup: the screens are real, and nothing leaves the phone. The same preview mode throws when `EAS_BUILD_PROFILE` is `production`. Use `BACKUP_MODE=off` or `BACKUP_MODE=live` for that profile.

The splash replay on «Jeg har allerede en konto» stays on for `testflight`. It stays off in a release binary whose profile was not baked in. `app.config.js` copies `EAS_BUILD_PROFILE` into `extra.easBuildProfile` and omits the key when it is unset. Do not write `null` there. Expo's serializer turns `null` into `{}`.

The native splash config is the always-dark v4 setup from master. Leave it as it is.
