import { it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema.js";
import { api } from "../../convex/_generated/api.js";
import { DAY } from "../../convex/lib/marketplace.js";
const modules = import.meta.glob("../../convex/**/*.js");
const make = () => convexTest(schema, modules);
afterEach(() => vi.restoreAllMocks());
async function person(t, role = "employer", suffix = role) {
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `${suffix}@example.test`,
      emailVerificationTime: Date.now(),
    });
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: Date.now() + 30 * DAY,
    });
    const accountId = await ctx.db.insert("accounts", {
      authSubject: userId,
      email: `${suffix}@example.test`,
      role,
      phone: "0712345678",
      createdAt: Date.now(),
    });
    let profileId;
    if (role === "employer")
      profileId = await ctx.db.insert("employers", {
        accountId,
        name: "Example Parent",
      });
    if (role === "admin")
      await ctx.db.insert("adminSessions", {
        accountId,
        sessionId,
        expiresAt: Date.now() + DAY,
      });
    return { userId, sessionId, accountId, profileId };
  });
  return {
    ...ids,
    client: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }),
  };
}
const report = (who, receipt = "TESTCODE01", planCode = "employer_30_days") =>
  who.client.mutation(api.manualPayments.submit, {
    receipt,
    planCode,
    phone: "0712345678",
  });
const confirm = (who, id, extra = {}) =>
  who.client.mutation(api.manualPayments.review, {
    id,
    approve: true,
    confirmed: true,
    ...extra,
  });
async function caregiver(t) {
  const who = await person(t, "caregiver");
  const body = {
    name: "Caregiver",
    service_category: "nanny",
    service_types: ["live_in"],
    consent: "true",
  };
  for (const purpose of ["photo", "national_id", "selfie"]) {
    body[purpose] = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(["fixture"], { type: "image/jpeg" }),
      );
      await ctx.db.insert("uploadedAssets", {
        accountId: who.accountId,
        storageId,
        purpose,
        claimed: false,
        createdAt: Date.now(),
      });
      return storageId;
    });
  }
  const result = await who.client.mutation(api.marketplace.write, {
    path: "/caregivers/profile",
    method: "POST",
    body,
  });
  return { ...who, profileId: result.profile.id };
}
it("prices reports on the server and grants no access until a stepped-up administrator confirms", async () => {
  const t = make(),
    e = await person(t),
    a = await person(t, "admin"),
    { payment } = await report(e, " testcode01 ");
  expect(payment).toMatchObject({
    status: "pending",
    amount: 300,
    receipt: "TESTCODE01",
    provider: "manual_mpesa",
  });
  expect(
    (await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt,
  ).toBeUndefined();
  await expect(confirm(e, payment.id)).rejects.toThrow("permission");
  await expect(confirm(a, payment.id, { confirmed: false })).rejects.toThrow(
    "Confirm",
  );
  const before = Date.now();
  await confirm(a, payment.id);
  expect(
    (await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt,
  ).toBeGreaterThanOrEqual(before + 30 * DAY);
  const approved = await t.run((ctx) => ctx.db.get(e.profileId));
  await confirm(a, payment.id);
  expect((await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt).toBe(
    approved.accessExpiresAt,
  );
  expect(
    (await t.run((ctx) => ctx.db.query("securityAudit").collect())).filter(
      (r) => r.action === "manual_payment_approved",
    ),
  ).toHaveLength(1);
});
it("prevents duplicate receipts, repeat pending submissions, wrong plans and client-priced amounts", async () => {
  const t = make(),
    e = await person(t),
    other = await person(t, "employer", "other"),
    a = await person(t, "admin");
  const first = await report(e);
  expect((await report(e)).payment.id).toBe(first.payment.id);
  await expect(report(other)).rejects.toThrow("already been submitted");
  await expect(report(e, "TESTCODE02")).rejects.toThrow(
    "already awaiting review",
  );
  await expect(
    report(other, "TESTCODE03", "caregiver_365_days"),
  ).rejects.toThrow("Choose a plan");
  await expect(report(other, "bad")).rejects.toThrow("10-character");
  await expect(
    other.client.mutation(api.manualPayments.submit, {
      receipt: "TESTCODE03",
      planCode: "employer_30_days",
      phone: "0712345678",
      amount: 1,
    }),
  ).rejects.toThrow();
  await confirm(a, first.payment.id);
  await expect(report(e)).rejects.toThrow(
    "already been submitted or confirmed",
  );
  await expect(report(other)).rejects.toThrow(
    "already been submitted or confirmed",
  );
});
it("extends early renewals by 90 days and starts expired renewals at approval time", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1800000000000);
  const t = make(),
    e = await person(t),
    a = await person(t, "admin");
  await confirm(a, (await report(e)).payment.id);
  const initialExpiry = (await t.run((ctx) => ctx.db.get(e.profileId)))
    .accessExpiresAt;
  await confirm(
    a,
    (await report(e, "TESTCODE02", "employer_90_days")).payment.id,
  );
  expect((await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt).toBe(
    initialExpiry + 90 * DAY,
  );
  await t.run((ctx) =>
    ctx.db.patch(e.profileId, { accessExpiresAt: Date.now() - DAY }),
  );
  const late = await report(e, "TESTCODE03");
  await confirm(a, late.payment.id);
  const confirmed = await t.run((ctx) => ctx.db.get(late.payment.id));
  expect((await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt).toBe(
    confirmed.reviewedAt + 30 * DAY,
  );
});
it("activates caregiver Premium for 365 days without granting identity approval or changing ratings", async () => {
  const t = make(),
    c = await caregiver(t),
    a = await person(t, "admin"),
    before = Date.now();
  await confirm(
    a,
    (await report(c, "TESTCODE01", "caregiver_365_days")).payment.id,
  );
  const p = await t.run((ctx) => ctx.db.get(c.profileId));
  expect(p.premiumExpiresAt).toBeGreaterThanOrEqual(before + 365 * DAY);
  expect(p.identityStatus).toBe("pending");
  expect(p.adultConfirmedAt).toBeUndefined();
  expect(p.ratingAverage).toBe(0);
});
it("requires rejection reasons, allows corrected reports and protects the queue and other users histories", async () => {
  const t = make(),
    e = await person(t),
    other = await person(t, "employer", "other"),
    a = await person(t, "admin"),
    { payment } = await report(e);
  await expect(
    a.client.mutation(api.manualPayments.review, {
      id: payment.id,
      approve: false,
    }),
  ).rejects.toThrow("rejection reason");
  await a.client.mutation(api.manualPayments.review, {
    id: payment.id,
    approve: false,
    reason: "Receipt not found in the statement.",
  });
  expect(
    (await t.run((ctx) => ctx.db.get(e.profileId))).accessExpiresAt,
  ).toBeUndefined();
  expect((await report(e, "TESTCODE02")).payment.status).toBe("pending");
  await expect(
    other.client.query(api.marketplace.read, {
      path: `/payments/${payment.id}`,
    }),
  ).rejects.toThrow("Payment not found");
  await expect(
    other.client.query(api.manualPayments.pending, {}),
  ).rejects.toThrow("permission");
  const queue = await a.client.query(api.manualPayments.pending, {});
  expect(queue.payments).toHaveLength(1);
  await t.run(async (ctx) => {
    for (const row of await ctx.db.query("adminSessions").collect())
      await ctx.db.delete(row._id);
  });
  await expect(a.client.query(api.manualPayments.pending, {})).rejects.toThrow(
    "authenticator",
  );
});
it("does not activate restricted accounts or missing-profile caregivers", async () => {
  const t = make(),
    e = await person(t),
    a = await person(t, "admin"),
    { payment } = await report(e);
  await t.run((ctx) => ctx.db.patch(e.accountId, { suspendedAt: Date.now() }));
  await expect(confirm(a, payment.id)).rejects.toThrow("restriction");
  const c = await person(t, "caregiver");
  await expect(report(c, "TESTCODE04", "caregiver_365_days")).rejects.toThrow(
    "photo",
  );
});
