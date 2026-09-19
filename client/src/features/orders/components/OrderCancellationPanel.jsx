import PropTypes from "prop-types";
import { useCallback, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Form } from "react-bootstrap";
import { FaBan, FaClock, FaExclamationTriangle } from "react-icons/fa";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomSelect from "@src/components/common/CustomSelect";
import { setAlert } from "@src/app/state/actions/alert";
import { requestOrderCancellation } from "@src/features/orders/orderActions";
import {
  CANCELLATION_NOTE_MAX_LENGTH,
  findCancellationReasonOption,
  getCancellationReasonLabel,
  loadCancellationReasonOptions,
} from "@src/constants/cancellationReasons";
import {
  canRequestOrderCancellation,
  hasPendingCancellationRequest,
} from "@src/constants/cancellationReasons";
import { formatOrderDate } from "@src/utils/orderDisplayHelpers";

const OrderCancellationPanel = ({
  order,
  onOrderUpdated,
  compact = false,
  setAlert,
  requestOrderCancellation,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const noteRequired = reason === "other";
  const noteTooLong = note.length > CANCELLATION_NOTE_MAX_LENGTH;

  const selectedReasonOption = useMemo(
    () => findCancellationReasonOption(reason),
    [reason],
  );

  const loadReasonOptions = useCallback(
    () => loadCancellationReasonOptions(),
    [],
  );

  const reasonFieldError =
    formError && (!reason || formError.toLowerCase().includes("reason"))
      ? formError
      : null;

  const canSubmit = useMemo(() => {
    if (!reason || noteTooLong) return false;
    if (noteRequired && !note.trim()) return false;
    return true;
  }, [reason, note, noteRequired, noteTooLong]);

  if (!order || order.status === "cancelled") {
    return null;
  }

  const pendingRequest = hasPendingCancellationRequest(order);
  const canRequest = canRequestOrderCancellation(order);

  if (!pendingRequest && !canRequest) {
    return null;
  }

  const resetModal = () => {
    setReason("");
    setNote("");
    setFormError("");
    setShowModal(false);
  };

  const openModal = () => {
    setFormError("");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setFormError(
        noteRequired
          ? "Please select a reason and add a short note."
          : "Please select a cancellation reason.",
      );
      return;
    }

    setSubmitting(true);
    setFormError("");
    setError("");
    try {
      const updated = await requestOrderCancellation(order.orderNo, {
        reason,
        note: note.trim(),
      });
      resetModal();
      onOrderUpdated?.(updated);
    } catch (err) {
      const fieldMsg = err.errors?.[0]?.msg;
      if (fieldMsg) {
        setFormError(fieldMsg);
      } else {
        const message = err.message || "Unable to submit cancellation request.";
        if (compact) {
          setAlert(message, "danger");
          resetModal();
        } else {
          setError(message);
          resetModal();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <AdvancedModal
      show={showModal}
      onHide={resetModal}
      title="Request cancellation"
      size="md"
      className="order-cancel-modal"
      bodyClassName="common-modal-body--start order-cancel-modal__body"
      icon={<FaExclamationTriangle className="common-modal-icon is-warning" />}
      actions={[
        {
          label: "Close",
          onClick: resetModal,
          className: "btn btn--outline",
          colSize: 5,
          disabled: submitting,
        },
        {
          label: submitting ? "Please wait…" : "Submit request",
          onClick: handleSubmit,
          className: "btn btn--theme",
          colSize: 7,
          disabled: submitting || !canSubmit,
        },
      ]}
    >
      <p className="order-cancel-modal__intro mb-3">
        Your order will not be cancelled automatically. Our team will review your
        request and confirm by email or phone.
      </p>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="cancel-reason" className="form-sub-label">
          Reason for cancellation
        </Form.Label>
        <CustomSelect
          className="order-cancel-modal__select"
          value={selectedReasonOption}
          onChange={(option) => {
            setReason(option?.value ?? "");
            setFormError("");
          }}
          loadOptions={loadReasonOptions}
          isDisabled={submitting}
          isRequired
          placeholder="Select a reason"
          error={reasonFieldError}
        />
      </Form.Group>

      <Form.Group className="mb-0">
        <Form.Label htmlFor="cancel-note" className="form-sub-label">
          Short note
          {noteRequired ? " (required)" : " (optional)"}
        </Form.Label>
        <Form.Control
          as="textarea"
          id="cancel-note"
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setFormError("");
          }}
          disabled={submitting}
          maxLength={CANCELLATION_NOTE_MAX_LENGTH}
          placeholder={
            noteRequired
              ? "Please describe why you want to cancel"
              : "Add any details that may help our team (optional)"
          }
          aria-invalid={Boolean(formError && noteRequired && !note.trim())}
        />
        <div className="order-cancel-modal__note-footer">
          <span className="order-cancel-modal__char-count">
            {note.length}/{CANCELLATION_NOTE_MAX_LENGTH}
          </span>
        </div>
      </Form.Group>

      {formError ? (
        <p className="order-cancel-modal__error mt-3 mb-0" role="alert">
          {formError}
        </p>
      ) : null}
    </AdvancedModal>
  );

  if (pendingRequest) {
    const requestedOn = formatOrderDate(order.cancellation?.requestedAt);
    const title = requestedOn
      ? `Cancellation requested on ${requestedOn}`
      : "Cancellation requested";

    if (compact) {
      return (
        <span
          className="order-cancel-trigger order-cancel-trigger--pending"
          title={title}
          role="status"
        >
          <FaClock aria-hidden />
          <span className="visually-hidden">{title}</span>
        </span>
      );
    }

    const reasonLabel = order.cancellation?.reason
      ? getCancellationReasonLabel(order.cancellation.reason)
      : null;

    return (
      <div
        className="order-cancellation-panel order-cancellation-panel--pending"
        role="status"
      >
        <p className="order-cancellation-panel__title">Cancellation requested</p>
        <p className="order-cancellation-panel__text">
          We received your request on {requestedOn}. Our team will update you once
          it is processed.
        </p>
        {reasonLabel ? (
          <dl className="order-cancellation-panel__meta">
            <div>
              <dt>Reason</dt>
              <dd>{reasonLabel}</dd>
            </div>
            {order.cancellation?.note ? (
              <div>
                <dt>Your note</dt>
                <dd>{order.cancellation.note}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <button
          type="button"
          className="order-cancel-trigger"
          onClick={openModal}
          disabled={submitting}
          aria-label="Request cancellation"
          title="Request cancellation"
        >
          <FaBan aria-hidden />
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <div className="order-cancellation-panel">
        <p className="order-cancellation-panel__title">Need to cancel?</p>
        <p className="order-cancellation-panel__text">
          You can request cancellation while your order has not shipped yet. Tell
          us why so we can process your request faster.
        </p>
        {error ? (
          <p className="order-cancellation-panel__error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn--outline order-cancellation-panel__btn"
          onClick={openModal}
          disabled={submitting}
        >
          Request cancellation
        </button>
      </div>
      {modal}
    </>
  );
};

OrderCancellationPanel.propTypes = {
  order: PropTypes.object,
  onOrderUpdated: PropTypes.func,
  compact: PropTypes.bool,
  setAlert: PropTypes.func.isRequired,
};

export default connect(null, { requestOrderCancellation, setAlert })(
  OrderCancellationPanel,
);
