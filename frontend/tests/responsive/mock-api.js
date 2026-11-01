import { profile, parent, plans } from "./data.js";
export const hasSession = () => !window.__RESPONSIVE_SIGNED_OUT__;
export const clearSession = async () => {};
export const configureConvexSession = () => {};
export class ApiError extends Error {}
export async function api(path, { method = "GET" } = {}) {
  if (method !== "GET")
    throw new Error("Responsive fixtures do not accept writes.");
  const role = window.__RESPONSIVE_ROLE__ || "employer";
  if (path === "/auth/me")
    return {
      user: {
        ...parent,
        role,
        profile: role === "caregiver" ? profile : parent,
      },
    };
  if (path === "/caregivers/profile" || path === "/caregivers/sample1")
    return { profile };
  if (path.startsWith("/caregivers/sample1/reviews"))
    return {
      reviews: [
        {
          id: "r1",
          author_name: "Example Parent",
          rating: 5,
          comment: "Clear communication and reliable care. ".repeat(8),
          created_at: "2026-11-01",
        },
      ],
      total: 1,
    };
  if (path.endsWith("/review/mine")) return { review: null };
  if (path.startsWith("/contact/unlock/"))
    return { unlocked: false, can_unlock: false, available: true };
  if (path.startsWith("/caregivers?") || path === "/shortlist")
    return {
      profiles: [
        profile,
        { ...profile, id: "sample2", name: "Another Example Caregiver" },
        { ...profile, id: "sample3" },
      ],
      total: 3,
      rotation: "1",
    };
  if (path === "/employers/dashboard")
    return {
      profile: parent,
      counts: { shortlist: 3, contacts: 1, reviews: 1 },
    };
  if (path === "/employers/profile") return { profile: parent };
  if (path.startsWith("/employers/contacts"))
    return {
      contacts: [
        {
          profile,
          contact: { phone: parent.phone, email: parent.email },
          unlocked_at: "2026-11-01",
        },
      ],
      total: 1,
    };
  if (path === "/verification/status")
    return {
      verification_status: "rejected",
      submission: { rejection_reason: "Please provide a clearer image." },
    };
  if (path === "/memberships")
    return {
      active: false,
      expires_at: null,
      payments_enabled: false,
      manual_payment: {
        enabled: true,
        paybill: "4125123",
        account: "mlezicare",
      },
      plans: plans.filter((p) => p.role === role),
    };
  if (path === "/payments") return { payments: [] };
  if (path === "/admin/reports") return { reports: [] };
  if (path === "/admin/verification") return { submissions: [] };
  throw new Error(`Missing responsive fixture for ${path}`);
}
