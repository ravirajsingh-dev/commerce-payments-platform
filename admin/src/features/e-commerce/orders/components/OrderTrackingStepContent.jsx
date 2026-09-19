import PropTypes from "prop-types";
import { FaMapMarkerAlt } from "react-icons/fa";

import { formatTrackingDateTime } from "../shipment/shipmentHelpers";

const OrderTrackingEventBlock = ({ eventAt, message, location }) => (
  <div className="order-track-stepper__event">
    {eventAt ? (
      <time className="order-track-stepper__time" dateTime={eventAt}>
        {formatTrackingDateTime(eventAt)}
      </time>
    ) : null}
    {message ? <p className="order-track-stepper__message">{message}</p> : null}
    {location ? (
      <p className="order-track-stepper__location">
        <FaMapMarkerAlt className="order-track-stepper__location-icon" aria-hidden />
        <span>{location}</span>
      </p>
    ) : null}
  </div>
);

OrderTrackingEventBlock.propTypes = {
  eventAt: PropTypes.string,
  message: PropTypes.string,
  location: PropTypes.string,
};

const OrderTrackingStepContent = ({ events = [] }) => {
  if (!events.length) {
    return null;
  }

  if (events.length === 1) {
    const event = events[0];
    return (
      <OrderTrackingEventBlock
        eventAt={event.eventAt}
        message={event.message?.trim() || null}
        location={event.location?.trim() || null}
      />
    );
  }

  const latest = events[events.length - 1];
  const earlierEvents = events.slice(0, -1);

  return (
    <details className="order-track-stepper__accordion">
      <summary className="order-track-stepper__accordion-summary">
        <div className="order-track-stepper__accordion-head">
          <OrderTrackingEventBlock
            eventAt={latest.eventAt}
            message={latest.message?.trim() || null}
            location={latest.location?.trim() || null}
          />
          <div className="order-track-stepper__accordion-meta">
            <span className="order-track-stepper__accordion-count">
              {events.length} updates
            </span>
            <span className="order-track-stepper__accordion-chevron" aria-hidden />
          </div>
        </div>
      </summary>
      {earlierEvents.length > 0 ? (
        <div className="order-track-stepper__accordion-panel">
          <div className="order-track-stepper__accordion-panel-inner">
            <ol className="order-track-stepper__accordion-list">
              {[...earlierEvents].reverse().map((event) => (
                <li key={event.id} className="order-track-stepper__accordion-item">
                  <OrderTrackingEventBlock
                    eventAt={event.eventAt}
                    message={event.message?.trim() || null}
                    location={event.location?.trim() || null}
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </details>
  );
};

OrderTrackingStepContent.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      eventAt: PropTypes.string,
      message: PropTypes.string,
      location: PropTypes.string,
    }),
  ),
};

export default OrderTrackingStepContent;
