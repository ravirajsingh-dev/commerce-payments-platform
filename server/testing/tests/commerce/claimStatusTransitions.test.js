const {
  assertClaimStatusTransition,
} = require("../../../modules/commerce/order/claimStatusTransitions");

describe("claimStatusTransitions (Phase 4)", () => {
  it("allows operational progress from approved through inspecting", () => {
    expect(assertClaimStatusTransition("approved", "in_transit").ok).toBe(true);
    expect(assertClaimStatusTransition("in_transit", "received").ok).toBe(true);
    expect(assertClaimStatusTransition("received", "inspecting").ok).toBe(true);
    expect(assertClaimStatusTransition("inspecting", "closed").ok).toBe(true);
  });

  it("blocks arbitrary jumps and dedicated endpoint statuses", () => {
    expect(assertClaimStatusTransition("pending", "received").ok).toBe(false);
    expect(assertClaimStatusTransition("approved", "completed").ok).toBe(false);
    expect(assertClaimStatusTransition("approved", "rejected").ok).toBe(false);
    expect(assertClaimStatusTransition("pending", "approved").ok).toBe(false);
  });
});
