import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { act, render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import Membership from "../../src/components/Membership.jsx";
import AdminManualPayments from "../../src/components/AdminManualPayments.jsx";
const state = vi.hoisted(() => ({
  read: vi.fn(),
  submit: vi.fn(),
  review: vi.fn(),
  history: [],
  active: false,
  pending: { payments: [], cursor: null },
}));
vi.mock("../../src/lib/api", () => ({ api: (...args) => state.read(...args) }));
vi.mock("convex/react", () => ({
  useMutation: (ref) =>
    getFunctionName(ref) === "manualPayments:submit"
      ? state.submit
      : state.review,
  useQuery: () => state.pending,
}));
const plans = [
  { code: "employer_30_days", amount: 300, days: 30 },
  { code: "employer_90_days", amount: 500, days: 90 },
];
beforeEach(() => {
  state.active = false;
  state.history = [];
  state.pending = { payments: [], cursor: null };
  state.submit.mockReset();
  state.review.mockReset().mockResolvedValue({});
  state.read
    .mockReset()
    .mockImplementation(async (path) =>
      path === "/memberships"
        ? {
            active: state.active,
            expires_at: null,
            payments_enabled: false,
            manual_payment: {
              enabled: true,
              paybill: "4125123",
              account: "mlezicare",
            },
            plans,
          }
        : { payments: state.history },
    );
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it("shows the manual destination and sends only the selected plan, receipt and paying phone for review", async () => {
  const user = userEvent.setup();
  state.submit.mockImplementation(async () => {
    state.history = [
      {
        id: "p1",
        provider: "manual_mpesa",
        amount: 500,
        plan_code: "employer_90_days",
        receipt: "TESTCODE01",
        status: "pending",
      },
    ];
    return { payment: state.history[0] };
  });
  render(<Membership user={{ role: "employer", phone: "0712345678" }} />);
  expect(await screen.findByText("4125123")).toBeTruthy();
  expect(screen.getByText("mlezicare")).toBeTruthy();
  await user.selectOptions(
    screen.getByLabelText("Choose your plan"),
    "employer_90_days",
  );
  await user.type(screen.getByLabelText("M-Pesa receipt code"), "TESTCODE01");
  await user.click(
    screen.getByRole("button", { name: "Submit payment for confirmation" }),
  );
  expect(state.submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox"));
  await user.click(
    screen.getByRole("button", { name: "Submit payment for confirmation" }),
  );
  await waitFor(() =>
    expect(state.submit).toHaveBeenCalledWith({
      planCode: "employer_90_days",
      receipt: "TESTCODE01",
      phone: "0712345678",
    }),
  );
  expect(
    await screen.findByText(/is awaiting administrator review/),
  ).toBeTruthy();
  expect(screen.getByText("Inactive")).toBeTruthy();
  expect(
    screen.queryByText(/Check your phone for the M-Pesa prompt/),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Refresh payment status" })).toBeNull();
});
it("requires administrator statement confirmation or a rejection reason before submitting a decision", async () => {
  const user = userEvent.setup();
  state.pending = {
    payments: [
      {
        id: "p1",
        amount: 300,
        plan_code: "employer_30_days",
        receipt: "TESTCODE01",
        phone: "0712345678",
        created_at: "2026-11-01",
        account: {
          name: "Example",
          email: "parent@example.test",
          role: "employer",
          restricted: false,
        },
      },
    ],
    cursor: null,
  };
  render(<AdminManualPayments />);
  await user.click(
    screen.getByRole("button", { name: "Confirm and activate" }),
  );
  expect(state.review).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("business statement");
  await user.click(screen.getByRole("button", { name: "Reject report" }));
  expect(state.review).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("reason");
  await user.click(screen.getByRole("checkbox"));
  await user.click(
    screen.getByRole("button", { name: "Confirm and activate" }),
  );
  expect(state.review).toHaveBeenCalledWith({
    id: "p1",
    approve: true,
    confirmed: true,
    reason: "",
  });
});

it('automatically updates a pending manual payment without a refresh button or page reload',async()=>{
 vi.useFakeTimers();vi.spyOn(document,'hidden','get').mockReturnValue(false);
 state.history=[{id:'auto-payment',provider:'manual_mpesa',amount:300,plan_code:'employer_30_days',receipt:'TESTCODE02',status:'pending'}];
 await act(async()=>{render(<Membership user={{role:'employer'}}/>)});
 expect(screen.getByText(/Status updates automatically/)).toBeTruthy();
 state.active=true;state.history=[{...state.history[0],status:'completed'}];
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000)});
 expect(screen.getByText('Active')).toBeTruthy();expect(screen.queryByText(/awaiting administrator review/)).toBeNull();
 const reads=state.read.mock.calls.length;await act(async()=>{await vi.advanceTimersByTimeAsync(30000)});expect(state.read.mock.calls.length).toBe(reads);
});
