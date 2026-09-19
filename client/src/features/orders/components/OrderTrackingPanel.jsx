import { useMemo } from "react";
import PropTypes from "prop-types";
import { FaCheck, FaExternalLinkAlt } from "react-icons/fa";

import CopyIcon from "@src/components/common/CopyIcon";
import {
  buildCarrierTrackingLink,
  formatTrackingDateTime,
  openCarrierTracking,
} from "@src/utils/shipmentDisplayHelpers";
import OrderTrackingStepContent from "./OrderTrackingStepContent";
import {
  buildOrderTrackingTimeline,
  getTrackingHeadline,
} from "@src/utils/orderTrackingTimeline";

const OrderTrackingPanel = ({
  orderStatus,
  orderCreatedAt,
  shipment,
  events = [],
  claim = null,
}) => {
  const timeline = useMemo(
    () =>
      buildOrderTrackingTimeline({
        orderStatus,
        orderCreatedAt,
        events,
        shipment,
        claim,
      }),
    [orderStatus, orderCreatedAt, events, shipment, claim],
  );

  const headline = useMemo(
    () => getTrackingHeadline({ shipment, orderStatus, timeline }),
    [shipment, orderStatus, timeline],
  );

  const trackHref = buildCarrierTrackingLink(
    shipment?.carrierTrackingUrl,
    shipment?.trackingNumber,
  );

  const handleOpenCarrier = (event) => {
    event.stopPropagation();
    openCarrierTracking(shipment?.carrierTrackingUrl, shipment?.trackingNumber);
  };

  const hasTrackingNumber = Boolean(shipment?.trackingNumber);
  const hasCarrier = Boolean(shipment?.carrierName);
  const hasEstimatedDelivery = Boolean(shipment?.estimatedDeliveryDate);
  const hasShipmentMeta = hasTrackingNumber || hasCarrier || hasEstimatedDelivery;

  return (
    <details className="order-detail-tracking">
      <summary className="order-detail-tracking__summary">
        <h2 id="order-detail-tracking-heading" className="order-detail-section__title">
          Track your order
          {headline ? (
            <span className="order-detail-section__count">{headline}</span>
          ) : null}
        </h2>
        <span className="order-detail-tracking__chevron" aria-hidden />
      </summary>

      <div className="order-detail-tracking__panel">
        <div className="order-detail-tracking__panel-inner">
          {hasShipmentMeta ? (
            <div className="order-detail-tracking__meta">
              {hasTrackingNumber ? (
                <div className="order-detail-tracking__group">
                  <span className="order-detail-sheet__strip-label">Tracking</span>
                  <span className="order-detail-tracking__awb">{shipment.trackingNumber}</span>
                  <span
                    className="order-detail-tracking__copy"
                    role="presentation"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <CopyIcon
                      textToCopy={shipment.trackingNumber}
                      iconSize={16}
                      className="copy-action"
                    />
                  </span>
                </div>
              ) : null}

              {hasTrackingNumber && hasCarrier ? (
                <span className="order-detail-tracking__sep" aria-hidden>
                  ·
                </span>
              ) : null}

              {hasCarrier ? (
                <div className="order-detail-tracking__group">
                  <span className="order-detail-sheet__strip-label">Courier</span>
                  <span className="order-detail-tracking__courier">{shipment.carrierName}</span>
                  {trackHref ? (
                    <button
                      type="button"
                      className="order-detail-tracking__icon-btn"
                      onClick={handleOpenCarrier}
                      aria-label={`Track on ${shipment.carrierName} website`}
                    >
                      <FaExternalLinkAlt aria-hidden />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {hasEstimatedDelivery ? (
                <>
                  {(hasTrackingNumber || hasCarrier) ? (
                    <span className="order-detail-tracking__sep" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <div className="order-detail-tracking__group">
                    <span className="order-detail-sheet__strip-label">Est. delivery</span>
                    <span className="order-detail-tracking__edd">
                      {shipment.estimatedDeliveryDate
                        ? formatTrackingDateTime(shipment.estimatedDeliveryDate)
                        : ""}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

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
  );
};

OrderTrackingPanel.propTypes = {
  orderStatus: PropTypes.string,
  orderCreatedAt: PropTypes.string,
  shipment: PropTypes.shape({
    carrierName: PropTypes.string,
    trackingNumber: PropTypes.string,
    carrierTrackingUrl: PropTypes.string,
    estimatedDeliveryDate: PropTypes.string,
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
  claim: PropTypes.shape({
    status: PropTypes.string,
  }),
};

export default OrderTrackingPanel;
