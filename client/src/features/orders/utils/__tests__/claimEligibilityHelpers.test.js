import { describe, expect, it } from "vitest";

import {
  resolveClaimEligibility,
  shouldShowClaimSection,
  formatClaimWindowCountdown,
} from "../claimEligibilityHelpers";

const policyItem = {
  claimPolicySnapshot: {
    eligibility: {
      claimsEnabled: true,
      claimWindowDays: 14,
      allowedClaimTypes: ["return", "exchange"],
      allowedClaimReasons: ["damaged_or_defective"],
    },
  },
};

describe("claimEligibilityHelpers", () => {
  it("shows claim section when delivered and eligible", () => {
    expect(
      shouldShowClaimSection({
        status: "delivered",
        items: [policyItem],
        shipment: {
          currentStatus: "delivered",
          latestStepAt: "2026-05-20T10:00:00.000Z",
        },
        claimEligibility: {
          policyEligible: true,
          canRequestClaim: true,
          claimWindowDeadline: "2026-06-03T10:00:00.000Z",
        },
      }),
    ).toBe(true);
  });

  it("hides claim section for delivered orders outside eligibility", () => {
    expect(
      shouldShowClaimSection({
        status: "delivered",
        items: [policyItem],
        shipment: {
          currentStatus: "delivered",
          latestStepAt: "2026-05-01T10:00:00.000Z",
        },
      }),
    ).toBe(false);
  });

  it("hides claim section for cancelled orders", () => {
    expect(shouldShowClaimSection({ status: "cancelled" })).toBe(false);
  });

  it("allows claim action when delivered, in window, and eligible", () => {
    const order = {
      status: "delivered",
      items: [policyItem],
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-20T10:00:00.000Z",
      },
      claimEligibility: {
        policyEligible: true,
        canRequestClaim: true,
        claimWindowDays: 14,
        deliveredAt: "2026-05-20T10:00:00.000Z",
        claimWindowDeadline: "2026-06-03T10:00:00.000Z",
      },
    };

    expect(resolveClaimEligibility(order).canRequestClaim).toBe(true);
    const countdown = formatClaimWindowCountdown(order.claimEligibility.claimWindowDeadline);
    expect(countdown?.expired).toBe(false);
  });

  it("blocks claim action outside the claim window", () => {
    const order = {
      status: "delivered",
      items: [policyItem],
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-01T10:00:00.000Z",
      },
    };

    const eligibility = resolveClaimEligibility(order);
    expect(eligibility.reason).toBe("OUTSIDE_CLAIM_WINDOW");
    const countdown = formatClaimWindowCountdown(eligibility.claimWindowDeadline);
    expect(countdown?.expired).not.toBe(false);
  });

  it("allows resubmit after rejection", () => {
    const order = {
      status: "delivered",
      items: [policyItem],
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-20T10:00:00.000Z",
      },
      claim: { status: "rejected" },
      claimEligibility: {
        policyEligible: true,
        canRequestClaim: true,
        canResubmit: true,
        claimWindowDeadline: "2026-06-03T10:00:00.000Z",
      },
    };

    expect(resolveClaimEligibility(order).canResubmit).toBe(true);
    const countdown = formatClaimWindowCountdown(order.claimEligibility.claimWindowDeadline);
    expect(countdown?.expired).toBe(false);
  });
});
