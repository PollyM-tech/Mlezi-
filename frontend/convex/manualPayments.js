import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { requireAccount, hasProfilePhoto } from "./lib/permissions.js";
import {
  PLANS,
  DAY,
  fail,
  phone,
  text,
  paymentData,
} from "./lib/marketplace.js";
import { MANUAL_MPESA } from "./lib/manualPaymentPolicy.js";
import { consume, audit } from "./lib/security.js";

export const submit = mutation({
  args: { planCode: v.string(), receipt: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx, "employer", "caregiver");
    if (!MANUAL_MPESA.enabled)
      fail("Manual payments are currently unavailable", 503);
    const plan = PLANS[args.planCode];
    if (!plan || plan.role !== account.role)
      fail("Choose a plan for your account");
    const receipt = args.receipt.trim().toUpperCase(),
      payer = phone(args.phone);
    if (!/^[A-Z0-9]{10}$/.test(receipt))
      fail("Enter the 10-character M-Pesa receipt code");
    const used = await ctx.db
      .query("payments")
      .withIndex("by_receipt", (q) => q.eq("mpesaRef", receipt))
      .collect();
    const existing = used.find((p) => p.status !== "failed");
    if (existing) {
      if (
        existing.accountId === account._id &&
        existing.provider === "manual_mpesa" &&
        existing.planCode === args.planCode &&
        existing.status === "pending"
      )
        return { payment: paymentData(existing) };
      fail(
        "This receipt has already been submitted or confirmed. Check your payment history or contact support.",
        409,
      );
    }
    const own = await ctx.db
      .query("payments")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "manual_mpesa"),
          q.eq(q.field("status"), "pending"),
        ),
      )
      .first();
    if (own)
      fail(
        "A payment is already awaiting review. Check its status before submitting another.",
        409,
      );
    await consume(ctx, `manual-payment:${account._id}`, 5, DAY);
    const now = Date.now();
    const id = await ctx.db.insert("payments", {
      accountId: account._id,
      provider: "manual_mpesa",
      type: plan.type,
      planCode: args.planCode,
      durationDays: plan.days,
      amount: plan.amount,
      mpesaRef: receipt,
      phone: payer,
      status: "pending",
      resultDescription:
        "Awaiting administrator confirmation against the M-Pesa business statement.",
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, account._id, "manual_payment_submitted", id);
    return { payment: paymentData(await ctx.db.get(id)) };
  },
});

export const pending = query({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    await requireAccount(ctx, "admin");
    const page = await ctx.db
      .query("payments")
      .withIndex("by_manual_status", (q) =>
        q.eq("provider", "manual_mpesa").eq("status", "pending"),
      )
      .order("asc")
      .paginate({ numItems: 25, cursor: cursor || null });
    return {
      payments: await Promise.all(
        page.page.map(async (p) => {
          const a = await ctx.db.get(p.accountId);
          return {
            ...paymentData(p),
            id: p._id,
            account: {
              name: a?.name || "",
              email: a?.email || "",
              role: a?.role || "",
              restricted: !!(a?.suspendedAt || a?.deletionRequestedAt),
            },
          };
        }),
      ),
      cursor: page.isDone ? null : page.continueCursor,
    };
  },
});

export const review = mutation({
  args: {
    id: v.id("payments"),
    approve: v.boolean(),
    confirmed: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAccount(ctx, "admin"),
      p = await ctx.db.get(args.id);
    if (!p || p.provider !== "manual_mpesa")
      fail("Manual payment not found", 404);
    if (p.status === "completed" && args.approve)
      return { payment: paymentData(p) };
    if (p.status !== "pending")
      fail("This payment has already been reviewed", 409);
    const now = Date.now();
    let description;
    if (args.approve) {
      if (args.confirmed !== true)
        fail(
          "Confirm that the receipt, amount, sender and payment destination match the business statement",
        );
      const a = await ctx.db.get(p.accountId),
        plan = PLANS[p.planCode];
      if (!a || a.suspendedAt || a.deletionRequestedAt)
        fail(
          "Resolve the account restriction before activating membership",
          409,
        );
      if (
        !plan ||
        plan.role !== a.role ||
        plan.amount !== p.amount ||
        plan.days !== p.durationDays ||
        plan.type !== p.type
      )
        fail("Payment details need administrator investigation", 409);
      const duplicate = await ctx.db
        .query("payments")
        .withIndex("by_receipt", (q) => q.eq("mpesaRef", p.mpesaRef))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .first();
      if (duplicate)
        fail("This receipt has already activated a membership", 409);
      if (!(await hasProfilePhoto(ctx, a)))
        fail(
          "A caregiver profile photo is required before activating Premium",
          409,
        );
      const table = a.role === "employer" ? "employers" : "caregivers";
      const profile = await ctx.db
        .query(table)
        .withIndex("by_account", (q) => q.eq("accountId", a._id))
        .unique();
      if (!profile) fail("Complete the account profile before activation", 409);
      const field =
        a.role === "employer" ? "accessExpiresAt" : "premiumExpiresAt";
      await ctx.db.patch(profile._id, {
        [field]: Math.max(now, profile[field] || 0) + plan.days * DAY,
      });
      description =
        "Payment confirmed by an administrator. Membership activated.";
    } else
      description = text(args.reason || "", "a rejection reason", 1000, true);
    await ctx.db.patch(p._id, {
      status: args.approve ? "completed" : "failed",
      reviewedBy: admin._id,
      reviewedAt: now,
      updatedAt: now,
      resultDescription: description,
    });
    await audit(
      ctx,
      admin._id,
      args.approve ? "manual_payment_approved" : "manual_payment_rejected",
      p._id,
    );
    return { payment: paymentData(await ctx.db.get(p._id)) };
  },
});
