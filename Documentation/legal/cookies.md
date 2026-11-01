# Mlezi Cookie policy

Prepared 1 November 2026 · Version 2026-11-01

**Pre-launch review copy. Not a legal approval or publication authorization.**

Operator name supplied: Lintech Telecom
Business structure: To be confirmed before launch
Registration: Confirm if applicable
Service address: Service address to be confirmed before launch
Support route: /support/ and /privacy-account

## 1. Essential storage

The mlezi-cookie-consent cookie remembers the optional accepted/declined choice for up to 180 days, with SameSite=Lax and Secure on HTTPS. Authentication credentials use sessionStorage in the browser tab. During account creation, a registration draft containing your role, name, phone and email is held in sessionStorage and localStorage so a magic link can continue setup in another tab. Drafts are accepted for 30 minutes, cleared after account completion or sign-out, and expired copies are removed when next accessed. Passwords and email codes are not included in these drafts. Availability also depends on browser tab/session-restoration behavior: closing a tab is not a substitute for signing out.


## 2. Optional features

Only after acceptance do we remember search filters in sessionStorage and load Google Fonts. Google receives IP address and browser request information. Declining leaves browsing, registration and sign-in available with local fallback fonts. There are currently no analytics or advertising trackers. New trackers need their own assessment and appropriate permission.


## 3. Guest support anti-spam check

When you choose to load the guest-support check, Cloudflare Turnstile processes browser/network information to assess automated abuse. This is required for guest submission, not ordinary browsing or signed-in support. It is separate from optional fonts/search permission and still needs the applicable privacy/storage assessment before launch.


## 4. Change your choice

Use Cookie settings on any page. Declining clears optional search preferences and stops further optional font loading; it cannot undo earlier requests or instantly remove data already received by a provider. If the browser blocks a new preference, the banner explains that limitation and optional use is disabled for the current page.

Authentication/security requests, requested profile photos and normal service requests still operate as needed. The Privacy notice explains purposes, providers, retention and rights.


Source: frontend/src/lib/legal-content.js. Export again after changing the live policy text.
