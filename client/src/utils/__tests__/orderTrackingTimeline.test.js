import { describe, expect, it } from "vitest";

import { STATUS } from "@src/constants/order";
import {
  buildOrderTrackingTimeline,
  getTrackingHeadline,
} from "@src/utils/orderTrackingTimeline";

describe("orderTrackingTimeline", () => {
  it("uses STATUS labels and real event data per step", () => {
    const timeline = buildOrderTrackingTimeline({
      orderStatus: STATUS.IN_TRANSIT.value,
      orderCreatedAt: "2026-05-23T05:21:00.000Z",
      events: [
        {
          id: "1",
          status: STATUS.SHIPPED.value,
          message: "handed to blue dart",
          location: "jaipur hub",
          eventAt: "2026-05-24T07:27:00.000Z",
        },
        {
          id: "2",
          status: STATUS.IN_TRANSIT.value,
          message: "Reached about to delhi",
          location: "Near Delhi Hub",
          eventAt: "2026-05-26T13:00:00.000Z",
        },
      ],
      shipment: {
        currentStatus: STATUS.IN_TRANSIT.value,
        latestStepMessage: "Reached about to delhi",
      },
    });

    expect(timeline[0].label).toBe(STATUS.ORDER_PLACED.label);
    expect(timeline[0].status).toBe(STATUS.ORDER_PLACED.value);
    expect(timeline[0].state).toBe("completed");
    expect(timeline[0].eventAt).toBe("2026-05-23T05:21:00.000Z");

    expect(timeline[4].label).toBe(STATUS.SHIPPED.label);
    expect(timeline[4].state).toBe("completed");
    expect(timeline[4].message).toBe("handed to blue dart");
    expect(timeline[4].location).toBe("jaipur hub");

    expect(timeline[6].label).toBe(STATUS.IN_TRANSIT.label);
    expect(timeline[6].state).toBe("current");
    expect(timeline[6].message).toBe("Reached about to delhi");

    expect(timeline[7].state).toBe("pending");
    expect(timeline[9].state).toBe("pending");
  });

  it("uses shipment headline when available", () => {
    const timeline = buildOrderTrackingTimeline({
      orderStatus: STATUS.SHIPPED.value,
      events: [],
    });

    expect(
      getTrackingHeadline({
        shipment: { latestStepMessage: "On the way" },
        orderStatus: STATUS.SHIPPED.value,
        timeline,
      }),
    ).toBe("On the way");
  });

  it("falls back to status label for headline", () => {
    expect(
      getTrackingHeadline({
        shipment: null,
        orderStatus: STATUS.PACKED.value,
        timeline: buildOrderTrackingTimeline({ orderStatus: STATUS.PACKED.value }),
      }),
    ).toBe(STATUS.PACKED.label);
  });

  it("keeps all events for a status with multiple updates", () => {
    const timeline = buildOrderTrackingTimeline({
      orderStatus: STATUS.DELIVERED.value,
      events: [
        {
          id: "t1",
          status: STATUS.IN_TRANSIT.value,
          message: "Departed Paota",
          location: "Kotputli Highway Route",
          eventAt: "2026-05-26T13:14:00.000Z",
        },
        {
          id: "t2",
          status: STATUS.IN_TRANSIT.value,
          message: "Arrived Gurugram",
          location: "Gurugram Mega Hub",
          eventAt: "2026-05-26T13:15:00.000Z",
        },
        {
          id: "t3",
          status: STATUS.IN_TRANSIT.value,
          message: "Departed Gurugram",
          location: "Delhi Transport Corridor",
          eventAt: "2026-05-26T13:16:00.000Z",
        },
        {
          id: "d1",
          status: STATUS.DELIVERED.value,
          message: "Delivered to customer",
          eventAt: "2026-05-27T09:00:00.000Z",
        },
      ],
    });

    const inTransit = timeline.find((step) => step.status === STATUS.IN_TRANSIT.value);
    expect(inTransit.events).toHaveLength(3);
    expect(inTransit.message).toBe("Departed Gurugram");
    expect(inTransit.location).toBe("Delhi Transport Corridor");
    expect(inTransit.events[0].id).toBe("t1");
    expect(inTransit.events[2].id).toBe("t3");
  });

  it("marks all fulfillment steps completed when delivered", () => {
    const timeline = buildOrderTrackingTimeline({
      orderStatus: STATUS.DELIVERED.value,
      orderCreatedAt: "2026-05-20T10:00:00.000Z",
      events: [
        {
          id: "d1",
          status: STATUS.DELIVERED.value,
          message: "Delivered to customer",
          eventAt: "2026-05-27T09:00:00.000Z",
        },
      ],
    });

    expect(timeline.every((step) => step.state === "completed")).toBe(true);
    expect(timeline[9].label).toBe(STATUS.DELIVERED.label);
    expect(timeline[9].message).toBe("Delivered to customer");
  });

  it("keeps forward timeline terminal at delivered when open claim exists", () => {
    const timeline = buildOrderTrackingTimeline({
      orderStatus: STATUS.RETURN_COMPLETED.value,
      claim: { status: "in_transit" },
      events: [
        {
          id: "r1",
          status: STATUS.RETURN_COMPLETED.value,
          message: "Return completed",
          eventAt: "2026-05-28T10:00:00.000Z",
        },
      ],
    });

    expect(timeline.some((step) => step.status === STATUS.RETURN_INITIATED.value)).toBe(false);
    expect(timeline[timeline.length - 1].status).toBe(STATUS.DELIVERED.value);
  });
});
