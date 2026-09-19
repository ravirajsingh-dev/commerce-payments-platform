import { describe, expect, it } from "vitest";

import {
  formatOrderCancellationReason,
  hasOrderCancellationDetails,
  isOrderCancelledByAdmin,
} from "@src/constants/cancellationReasons";

describe("order cancellation display helpers", () => {
  it("detects admin cancellation reasons", () => {
    const order = {
      status: "cancelled",
      cancellation: {
        reason: "wrong_address",
        note: "Pincode not serviceable",
      },
    };
    expect(isOrderCancelledByAdmin(order)).toBe(true);
    expect(hasOrderCancellationDetails(order)).toBe(true);
    expect(formatOrderCancellationReason("wrong_address")).toContain("address");
  });

  it("formats customer cancellation reasons", () => {
    expect(formatOrderCancellationReason("changed_mind")).toBe("Changed my mind");
    expect(
      isOrderCancelledByAdmin({ status: "cancelled", cancellation: { reason: "changed_mind" } }),
    ).toBe(
      false,
    );
  });
});
