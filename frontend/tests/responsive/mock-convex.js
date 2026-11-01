import { getFunctionName } from "convex/server";
import { tickets, thread } from "./data.js";
export function useQuery(ref, args) {
  if (args === "skip") return undefined;
  const name = getFunctionName(ref);
  if (name === "accounts:authSettings")
    return { emailReady: true, testSender: true };
  if (name === "manualPayments:pending")
    return {
      payments: [
        {
          id: "sample-payment",
          amount: 300,
          plan_code: "employer_30_days",
          receipt: "TESTCODE01",
          phone: "0712345678",
          created_at: "2026-11-01",
          account: {
            name: "Example Parent",
            email: "sample.parent.with.a.long.address@example.test",
            role: "employer",
            restricted: false,
          },
        },
      ],
      cursor: null,
    };
  if (name === "support:list") return tickets;
  if (name === "support:thread") return thread;
  if (name === "privacy:status")
    return { deletionRequestedAt: null, requests: [] };
  if (name === "adminSecurity:status")
    return { configured: true, enrolled: true };
  return [];
}
export function useMutation() {
  return async () => {
    throw new Error("Responsive fixtures do not accept mutations.");
  };
}
export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: false };
}
