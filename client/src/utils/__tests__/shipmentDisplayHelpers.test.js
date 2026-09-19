import { describe, expect, it } from "vitest";

import { STATUS } from "@src/constants/order";
import {
  buildCarrierTrackingLink,
  formatTrackingStatus,
  hasShipmentSummary,
  sortTrackingEventsChronological,
} from "@src/utils/shipmentDisplayHelpers";

describe("shipmentDisplayHelpers", () => {
  it("buildCarrierTrackingLink substitutes tracking placeholders", () => {
    expect(
      buildCarrierTrackingLink(
        "https://track.example/{trackingNumber}",
        "AWB123",
      ),
    ).toBe("https://track.example/AWB123");

    expect(buildCarrierTrackingLink("https://track.example/{awb}", "AWB123")).toBe(
      "https://track.example/AWB123",
    );

    expect(buildCarrierTrackingLink("", "AWB123")).toBeNull();
  });

  it("formatTrackingStatus uses shared order status labels", () => {
    expect(formatTrackingStatus(STATUS.IN_TRANSIT.value)).toBe("In transit");
  });

  it("detects shipment summary", () => {
    expect(hasShipmentSummary(null)).toBe(false);
    expect(
      hasShipmentSummary({
        carrierName: "Delhivery",
        trackingNumber: "",
        latestStepMessage: "",
      }),
    ).toBe(true);
  });

  it("sorts tracking events oldest to newest", () => {
    const sorted = sortTrackingEventsChronological([
      { id: "2", eventAt: "2026-05-22T10:00:00.000Z" },
      { id: "1", eventAt: "2026-05-20T10:00:00.000Z" },
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["1", "2"]);
  });
});
