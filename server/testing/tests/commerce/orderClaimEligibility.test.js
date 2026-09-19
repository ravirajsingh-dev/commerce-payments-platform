const {
  isOrderDelivered,
  isOrderCancelled,
  getDeliveredAt,
  isWithinClaimWindow,
  resolveEffectiveClaimPolicy,
  buildClaimScopeKey,
  hasOpenClaimForScope,
  canRequestClaimForOrder,
  buildUserClaimEligibility,
} = require("../../../modules/commerce/order/orderClaimEligibility");
const { pickClaimSummary } = require("../../../modules/commerce/order/orderClaimService");

describe("orderClaimEligibility helpers (Phase 01)", () => {
  it("requires delivered order and blocks cancelled orders", () => {
    expect(isOrderDelivered({ status: "delivered" })).toBe(true);
    expect(isOrderDelivered({ status: "shipped" })).toBe(false);
    expect(isOrderCancelled({ status: "cancelled" })).toBe(true);
    expect(isOrderCancelled({ status: "delivered" })).toBe(false);
  });

  it("prefers latest delivered tracking event timestamp", () => {
    const deliveredAt = getDeliveredAt({
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-12T10:00:00.000Z",
      },
      trackingEvents: [
        { status: "shipped", eventAt: "2026-05-10T10:00:00.000Z" },
        { status: "delivered", eventAt: "2026-05-11T10:00:00.000Z" },
        { status: "delivered", eventAt: "2026-05-13T10:00:00.000Z" },
      ],
    });
    expect(deliveredAt.toISOString()).toBe("2026-05-13T10:00:00.000Z");
  });

  it("uses shipment latest step when delivered event is missing", () => {
    const deliveredAt = getDeliveredAt({
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-12T10:00:00.000Z",
      },
      trackingEvents: [
        { status: "shipped", eventAt: "2026-05-10T10:00:00.000Z" },
      ],
    });
    expect(deliveredAt.toISOString()).toBe("2026-05-12T10:00:00.000Z");
  });

  it("checks claim windows against delivered milestone", () => {
    const deliveredAt = new Date("2026-05-01T00:00:00.000Z");
    expect(
      isWithinClaimWindow({
        deliveredAt,
        claimWindowDays: 7,
        now: new Date("2026-05-08T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isWithinClaimWindow({
        deliveredAt,
        claimWindowDays: 7,
        now: new Date("2026-05-09T00:00:00.001Z"),
      }),
    ).toBe(false);
  });

  it("resolves effective active policy from product reference", () => {
    const policy = {
      _id: "policy-1",
      isActive: true,
      eligibility: { claimsEnabled: true },
    };
    expect(
      resolveEffectiveClaimPolicy({
        product: { claimPolicyId: "policy-1" },
        claimPolicy: policy,
      }),
    ).toEqual(policy);
    expect(
      resolveEffectiveClaimPolicy({
        product: { claimPolicyId: "policy-2" },
        claimPolicy: policy,
      }),
    ).toBeNull();
    expect(
      resolveEffectiveClaimPolicy({
        product: { claimPolicyId: "policy-1" },
        claimPolicy: { ...policy, isActive: false },
      }),
    ).toBeNull();
  });

  it("builds stable scope keys and detects open claim dedupe", () => {
    const scopeKey = buildClaimScopeKey(["item-2", "item-1", "item-1"]);
    expect(scopeKey).toBe("item-1|item-2");
    expect(buildClaimScopeKey([])).toBe("whole_order");
    expect(
      hasOpenClaimForScope({
        scopeKey,
        claims: [
          { scopeKey, status: "pending" },
          { scopeKey: "other", status: "pending" },
          { scopeKey, status: "closed" },
        ],
      }),
    ).toBe(true);
    expect(
      hasOpenClaimForScope({
        scopeKey,
        claims: [{ scopeKey, status: "closed" }],
      }),
    ).toBe(false);
  });

  it("returns eligibility result for delivered and in-window order", () => {
    const result = canRequestClaimForOrder({
      order: { status: "delivered" },
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-12T10:00:00.000Z",
      },
      trackingEvents: [],
      claimWindowDays: 7,
      now: new Date("2026-05-15T10:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("blocks claims outside window", () => {
    const result = canRequestClaimForOrder({
      order: { status: "delivered" },
      shipment: {
        currentStatus: "delivered",
        latestStepAt: "2026-05-01T10:00:00.000Z",
      },
      trackingEvents: [],
      claimWindowDays: 7,
      now: new Date("2026-05-20T10:00:00.000Z"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("OUTSIDE_CLAIM_WINDOW");
  });

  describe("buildUserClaimEligibility (Phase 2)", () => {
    const policyItem = {
      claimPolicySnapshot: {
        eligibility: {
          claimsEnabled: true,
          claimWindowDays: 14,
          allowedClaimTypes: ["return"],
          allowedClaimReasons: ["damaged_or_defective"],
        },
      },
    };

    const deliveredOrder = { status: "delivered" };
    const shipment = {
      currentStatus: "delivered",
      latestStepAt: "2026-05-20T10:00:00.000Z",
    };

    it("allows claim request on eligible delivered order", () => {
      const result = buildUserClaimEligibility({
        order: deliveredOrder,
        items: [policyItem],
        shipment,
        trackingEvents: [],
        claim: null,
        now: new Date("2026-05-25T10:00:00.000Z"),
      });
      expect(result.canRequestClaim).toBe(true);
      expect(result.policyEligible).toBe(true);
      expect(result.claimWindowDays).toBe(14);
      expect(result.claimWindowDeadline).toBeTruthy();
    });

    it("blocks when open claim exists", () => {
      const result = buildUserClaimEligibility({
        order: deliveredOrder,
        items: [policyItem],
        shipment,
        trackingEvents: [],
        claim: { status: "pending" },
      });
      expect(result.canRequestClaim).toBe(false);
      expect(result.reason).toBe("OPEN_CLAIM_EXISTS");
    });

    it("allows resubmit after rejection", () => {
      const result = buildUserClaimEligibility({
        order: deliveredOrder,
        items: [policyItem],
        shipment,
        trackingEvents: [],
        claim: { status: "rejected" },
        now: new Date("2026-05-25T10:00:00.000Z"),
      });
      expect(result.canRequestClaim).toBe(true);
      expect(result.canResubmit).toBe(true);
    });

    it("blocks when claim window expired", () => {
      const result = buildUserClaimEligibility({
        order: deliveredOrder,
        items: [policyItem],
        shipment,
        trackingEvents: [],
        claim: null,
        now: new Date("2026-06-10T10:00:00.000Z"),
      });
      expect(result.canRequestClaim).toBe(false);
      expect(result.reason).toBe("OUTSIDE_CLAIM_WINDOW");
    });
  });

  describe("pickClaimSummary (Phase 2)", () => {
    it("exposes rejection, refund, logistics, and affected lines", () => {
      const rejected = pickClaimSummary({
        status: "rejected",
        type: "return",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        reasonCode: "damaged_or_defective",
        note: "Item torn",
        decisionNote: "Insufficient photos",
        resolutionCode: "rejected_missing_evidence",
        resolutionNote: "Ship to warehouse A",
        affectedLines: [
          { orderItemId: "item-1", quantity: 1, note: "Main item" },
        ],
        closedAt: new Date("2026-05-02T10:00:00.000Z"),
      });

      expect(rejected).toMatchObject({
        status: "rejected",
        rejectionReason: "Insufficient photos",
        customerNote: "Item torn",
        resolutionCode: "rejected_missing_evidence",
        resolutionNote: "Ship to warehouse A",
        affectedLines: [
          { orderItemId: "item-1", quantity: 1, note: "Main item" },
        ],
      });
      expect(rejected.refundAmount).toBeUndefined();

      const completed = pickClaimSummary({
        status: "completed",
        type: "return",
        reasonCode: "damaged_or_defective",
        refundAmount: 1200,
        resolutionNote: "Refund processed",
      });
      expect(completed.refundAmount).toBe(1200);
      expect(completed.resolutionNote).toBe("Refund processed");
    });
  });
});
