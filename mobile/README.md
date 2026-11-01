# Mlezi Care mobile

React Native + JavaScript, Expo SDK 57 and Expo Router. This app uses the same Convex accounts, data and private uploads as the website. It does not need Flask or a second database. Keep Vercel’s Root Directory set to `frontend`; `mobile` is a separate phone application.

## Start on your phone

Use Node 24 LTS (24.3 or later). From the repository:

```bash
cd mobile
npm ci
cp .env.example .env.local
npm start
```

Install the SDK 57-compatible Expo Go application on your phone and scan the terminal QR code. Keep your computer and phone on the same network. If WSL networking prevents a connection, make the development server reachable from your phone or use Expo’s tunnel option (`npx expo start --tunnel`; it may prompt to install its tunnel helper). Do not expose Convex admin/deploy credentials.

The example selects the existing **development** deployment. All `EXPO_PUBLIC_*` values are embedded in the app and must be public. Resend API keys, Convex deploy keys, encryption keys and payment credentials belong only in backend configuration. The app has public development URL defaults so you can also start before creating the local file.

Password, verification-code and password-reset-code flows are available in Expo Go. Magic links are hidden there: the `mlezicare://auth` app link needs an installed development/standalone build. No authentication email was sent as part of implementing or validating this app. Existing Resend test-sender restrictions still apply until the production email domain is verified.

## Included

- Email/password registration and sign-in, email OTP, reset codes, and installed-app magic-link handling; role selection and terms acceptance after email verification.
- Native secure token storage through Expo SecureStore. Browser preview uses temporary memory only. No optional advertising, analytics or browser cookie persistence is added.
- Caregiver profile setup/editing, required photo, private ID/selfie uploads, consent, availability, languages, travel arrangements and identity-review status. An administrator still grants identity approval and confirms adult age.
- Employer search and filters, travel nannies, shortlists, unlocked contacts, public reviews, caregiver replies and safety reports.
- Plans shown at the existing prices, with checkout disabled.
- Private signed-in support conversations; administrator support requires the existing authenticator step. Signed-out support opens the website’s protected form, which needs hosting, Turnstile and email setup before public use.
- Local FAQ help, shared legal drafts, account details, private account-summary export through the device share sheet, privacy requests and deletion/cancellation.

Full administrator identity-document review and moderation remain in the website. This is the first mobile version, not an App Store or Play Store release.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run export:check
npx expo-doctor
```

Android/iOS exports validate JavaScript/native-module bundling; they are not signed installable binaries or proof of device behaviour. See [mobile implementation and device checklist](../Documentation/mobile-implementation.md).

Expo Go SDK guidance: [Expo setup](https://docs.expo.dev/get-started/create-a-project/). Native token storage: [SDK 57 SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/). Follow the current [EAS build setup](https://docs.expo.dev/build/setup/) when preparing signed binaries; it requires the operator’s Expo project and signing/store accounts. No cloud build or store submission has been started.
