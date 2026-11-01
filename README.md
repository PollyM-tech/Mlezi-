# Mlezi

A Kenyan caregiver marketplace using **React + JavaScript + Convex**. Convex handles authentication, database functions and file storage.

```bash
cd frontend
npm install
npm run dev
```

See [current setup and checks](frontend/README.md), [security/identity implementation](Documentation/production-security-implementation.md), [SEO and regional discovery](Documentation/seo-and-regional-discovery.md), and [Flask retirement](Documentation/flask-retirement.md). Payment checkout remains disabled pending Paystack integration and production setup.

Lintech Telecom is the operator name supplied for the marketplace-only first version. See the [legal review handoff](Documentation/legal-review-handoff.md) and matching policy drafts; final legal particulars and qualified review remain pending.

## Phone application

The React Native + Expo app is in [`mobile`](mobile/README.md), connected to the same Convex backend. Start it with `cd mobile && npm start`; see its README for Expo Go setup and the [device testing checklist](Documentation/mobile-implementation.md). Mobile payments remain disabled.

## Earlier project notes

# Mlezi-
