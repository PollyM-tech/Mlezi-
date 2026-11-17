# Mlezi

A Kenyan caregiver marketplace using **React + JavaScript + Convex**. Convex handles authentication, database functions and file storage.

```bash
cd frontend
npm install
npm run dev
```

Start with the [current project status](Documentation/current-status.md), [frontend setup](frontend/README.md) and [production acceptance checklist](Documentation/production-acceptance-checklist.md).

Customer checkout uses direct Daraja **M-Pesa STK Push**. The owner reports it working and confirmed completion of the production acceptance checklist on 17 November 2026. New manual Paybill receipt submissions are disabled; historical records remain available for administrator resolution. Paystack checkout is not implemented. See the [STK implementation and operating notes](Documentation/mpesa-stk-push.md).

Mlezi is the service name. Current legal configuration identifies Lintech Telecom as operator and describes a registered sole proprietorship; those configured labels are not independent evidence of registration. The owner confirmed completion of the operator-details and qualified-review checklist items on 17 November 2026; the underlying particulars and review records were not supplied in this conversation. See the [legal handoff](Documentation/legal-review-handoff.md).

Older dated reviews preserve historical findings. Use current status and the acceptance checklist for release decisions; neither source changes nor passing local tests establish a production deployment.
