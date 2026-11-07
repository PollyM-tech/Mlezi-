# Google signup

Google is available on public sign-in and signup screens when the selected
Convex backend reports `googleReady: true`. It does not depend on email delivery.
The administrator entry keeps its existing authentication methods and MFA.

## Production setup

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview).
   Select the Mlezi project and configure an External audience, the Mlezi name,
   support contact, homepage `https://mlezicare.com`, privacy policy
   `https://mlezicare.com/privacy/` and terms `https://mlezicare.com/terms/`.
2. Create a **Web application** OAuth client. Use
   `https://mlezicare.com` as an authorized JavaScript origin. If serving the
   `www` hostname too, also add `https://www.mlezicare.com`.
3. Add this exact authorized redirect URI:

   ```text
   https://tangible-alpaca-39.eu-west-1.convex.site/api/auth/callback/google
   ```

4. In the [Mlezi production Convex dashboard](https://dashboard.convex.dev/t/pmoraa431/mlezi/tangible-alpaca-39),
   open Settings → Environment Variables and save the Google client ID as
   `AUTH_GOOGLE_ID` and the client secret as `AUTH_GOOGLE_SECRET`.
   Keep both on the backend; never add the secret to `VITE_` variables, Git or chat.
   `SITE_URL` must remain `https://mlezicare.com`.
5. Publish the frontend and deploy the backend changes in this repository.
   Deploy the production backend from `frontend` with `npx convex deploy`.
   Use the existing Vercel release workflow for the frontend.
6. While the Google app is in Testing, add the intended test Google accounts
   under Audience. Before allowing everyone, move its publishing status to
   Production and complete any requirements shown by Google.

Use a separate OAuth client for development, with its own callback URI:
`https://tidy-perch-115.eu-west-1.convex.site/api/auth/callback/google`.
Do not replace production credentials with development credentials.

## Member behavior and verification

- A nanny or employer can select **Continue with Google** without first entering
  an email, password or phone number. The selected role survives the redirect.
- Google must report a verified email. Only that verified Google identity can
  link to an existing verified account with the same email. Existing roles are
  preserved; an OAuth identity never grants an administrator role by itself.
- New members still complete their name, phone and role and accept the current
  terms. Caregivers still need the required profile and identity review.
- Email/password, magic-link and email-code authentication remain available.

Automated tests cover Google profile validation, the trusted callback/code
handoff, both roles through onboarding, existing verified-account linking,
credential readiness, frontend redirect parameters and retry errors. They use
synthetic identities and do not contact Google. After configuring credentials,
complete a real Google signup for each role and a returning-account sign-in.

Provider setup reference: [Convex Auth Google guide](https://labs.convex.dev/auth/config/oauth/google).
