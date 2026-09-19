import { useMemo } from "react";
import PropTypes from "prop-types";
import { FaCheck } from "react-icons/fa";

import OrderTrackingStepContent from "./OrderTrackingStepContent";
import {
  buildOrderTrackingTimeline,
  getTrackingHeadline,
} from "../orderTrackingHelpers";

const OrderTrackingPreview = ({
  orderStatus,
  orderCreatedAt,
  shipment,
  events = [],
}) => {
  const timeline = useMemo(
    () =>
      buildOrderTrackingTimeline({
        orderStatus,
        orderCreatedAt,
        events,
        shipment,
      }),
    [orderStatus, orderCreatedAt, events, shipment],
  );

  const headline = useMemo(
    () => getTrackingHeadline({ shipment, orderStatus, timeline }),
    [shipment, orderStatus, timeline],
  );

  return (
    <section
      className="order-detail-section order-detail-section--tracking admin-customer-tracking-preview"
      aria-label="Customer tracking preview"
    >
      <details className="order-detail-tracking">
        <summary className="order-detail-tracking__summary">
          <h2 className="order-detail-section__title">
            Track your order
            {headline ? (
              <span className="order-detail-section__count">{headline}</span>
            ) : null}
          </h2>
          <span className="order-detail-tracking__chevron" aria-hidden />
        </summary>

        <div className="order-detail-tracking__panel">
          <div className="order-detail-tracking__panel-inner">
            <ol className="order-track-stepper" aria-label="Order progress">
              {timeline.map((step, index) => {
                const isLast = index === timeline.length - 1;
                const stateClass = `order-track-stepper__item--${step.state}`;

                return (
                  <li
                    key={step.status}
                    className={`order-track-stepper__item ${stateClass}${isLast ? " order-track-stepper__item--last" : ""}`}
                  >
                    <div className="order-track-stepper__marker" aria-hidden>
                      {step.state === "completed" ? <FaCheck /> : null}
                    </div>
                    <div className="order-track-stepper__content">
                      <p className="order-track-stepper__title">{step.label}</p>
                      <OrderTrackingStepContent
                        events={
                          step.events?.length
                            ? step.events
                            : step.eventAt
                              ? [
                                  {
                                    id: `${step.status}-summary`,
                                    eventAt: step.eventAt,
                                    message: step.message,
                                    location: step.location,
                                  },
                                ]
                              : []
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </details>
    </section>
  );
};

OrderTrackingPreview.propTypes = {
  orderStatus: PropTypes.string,
  orderCreatedAt: PropTypes.string,
  shipment: PropTypes.shape({
    carrierName: PropTypes.string,
    trackingNumber: PropTypes.string,
    carrierTrackingUrl: PropTypes.string,
    currentStatus: PropTypes.string,
    latestStepMessage: PropTypes.string,
  }),
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      message: PropTypes.string,
      location: PropTypes.string,
      eventAt: PropTypes.string.isRequired,
    }),
  ),
};

export default OrderTrackingPreview;
