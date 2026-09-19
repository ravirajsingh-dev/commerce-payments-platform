const { pickClaimAdminPayload } = require("../../../modules/commerce/order/orderClaimAdminService");

describe("orderClaimAdmin payload (Phase 3)", () => {
  it("returns normalized flat claim fields", () => {
    const payload = pickClaimAdminPayload({
      _id: "claim-1",
      orderId: "order-1",
      orderNo: "RW-20260101-0001",
      userId: "user-1",
      type: "return",
      status: "pending",
      reasonCode: "damaged_or_defective",
      note: "Torn seam",
      affectedLines: [{ orderItemId: "item-1", quantity: 1, note: "Main" }],
      scopeKey: "item-1",
      images: [{ url: "https://example.com/a.jpg", key: "a.jpg" }],
      courierName: "DTDC",
      trackingNumber: "DTDC123",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    });

    expect(payload.reasonCode).toBe("damaged_or_defective");
    expect(payload.note).toBe("Torn seam");
    expect(payload.trackingNumber).toBe("DTDC123");
    expect(payload.affectedLines).toEqual([
      { orderItemId: "item-1", quantity: 1, note: "Main" },
    ]);
  });
});
