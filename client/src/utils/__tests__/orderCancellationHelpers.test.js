import { describe, expect, it } from "vitest";

import { STATUS } from "@src/constants/order";
import {
  canRequestOrderCancellation,
  hasPendingCancellationRequest,
} from "@src/constants/cancellationReasons";

describe("order cancellation helpers", () => {
  it("allows cancellation request for pending orders without a prior request", () => {
    expect(
      canRequestOrderCancellation({
        orderNo: "RW-20260517-0001",
        status: STATUS.ORDER_PLACED.value,
        cancellation: { requestedAt: null },
      }),
    ).toBe(true);
  });

  it("blocks request when cancellation is already pending", () => {
    expect(
      canRequestOrderCancellation({
        orderNo: "RW-20260517-0001",
        status: STATUS.ORDER_PLACED.value,
        cancellation: { requestedAt: "2026-05-17T12:00:00.000Z" },
      }),
    ).toBe(false);
    expect(
      hasPendingCancellationRequest({
        status: STATUS.ORDER_PLACED.value,
        cancellation: { requestedAt: "2026-05-17T12:00:00.000Z" },
      }),
    ).toBe(true);
  });

  it("blocks request after order ships", () => {
    expect(
      canRequestOrderCancellation({
        orderNo: "RW-20260517-0001",
        status: STATUS.SHIPPED.value,
      }),
    ).toBe(false);
  });
});
