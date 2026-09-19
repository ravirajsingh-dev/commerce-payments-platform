import PropTypes from "prop-types";
import { useState } from "react";
import { connect } from "react-redux";
import { Form } from "react-bootstrap";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import ClaimEvidenceUploadField from "@src/features/orders/components/ClaimEvidenceUploadField";
import { setAlert } from "@src/app/state/actions/alert";
import { submitOrderClaimReturnShipment } from "@src/features/orders/orderActions";
import {
  CLAIM_EVIDENCE_FIELD_LABELS,
  createEmptyReturnShipmentEvidence,
  validateReturnShipment,
} from "@src/features/orders/utils/claimEvidenceHelpers";

const PROOF_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,application/pdf";

const OrderClaimReturnShipmentPanel = ({
  order,
  claim,
  onOrderUpdated,
  setAlert,
  submitOrderClaimReturnShipment,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [evidence, setEvidence] = useState(createEmptyReturnShipmentEvidence);
  const [logistics, setLogistics] = useState({
    courierName: "",
    trackingNumber: "",
  });

  if (!claim?.needsReturnShipment) {
    return null;
  }

  const resetModal = () => {
    setShowModal(false);
    setFormError("");
    setEvidence(createEmptyReturnShipmentEvidence());
    setLogistics({ courierName: "", trackingNumber: "" });
  };

  const openModal = () => {
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const validationError = validateReturnShipment({
      evidence,
      customerLogistics: logistics,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const updated = await submitOrderClaimReturnShipment(order.orderNo, {
        evidence,
        customerLogistics: logistics,
      });
      resetModal();
      onOrderUpdated?.(updated);
      setAlert("Return shipment details submitted.", "success");
    } catch (err) {
      setFormError(err.errors?.[0]?.msg || err.message || "Unable to submit return shipment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="order-claim-help__link"
        onClick={openModal}
        disabled={submitting}
      >
        Return shipment
      </button>

      <AdvancedModal
        show={showModal}
        onHide={() => {
          if (!submitting) resetModal();
        }}
        title="Return shipment"
        size="md"
        closeButton
        bodyClassName="common-modal-body--start order-claim-modal__body"
        actions={[
          {
            label: "Close",
            onClick: resetModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: submitting,
          },
          {
            label: submitting ? "Submitting…" : "Submit return shipment",
            onClick: handleSubmit,
            className: "btn btn--theme",
            colSize: 7,
            disabled: submitting,
          },
        ]}
      >
        <p className="order-claim-modal__status-intro mb-3">
          Share courier receipt and tracking details once you have shipped the item.
        </p>

        <Form.Group className="mb-3">
          <Form.Label className="form-sub-label">Courier name</Form.Label>
          <Form.Control
            type="text"
            value={logistics.courierName}
            onChange={(e) =>
              setLogistics((prev) => ({ ...prev, courierName: e.target.value }))
            }
            disabled={submitting}
            placeholder="e.g. DTDC, Delhivery"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="form-sub-label">Tracking number *</Form.Label>
          <Form.Control
            type="text"
            value={logistics.trackingNumber}
            onChange={(e) =>
              setLogistics((prev) => ({ ...prev, trackingNumber: e.target.value }))
            }
            disabled={submitting}
            placeholder="Enter tracking number"
          />
        </Form.Group>

        <ClaimEvidenceUploadField
          orderNo={order.orderNo}
          category="courierReceipt"
          label={CLAIM_EVIDENCE_FIELD_LABELS.courierReceipt}
          value={evidence.courierReceipt}
          onChange={(files) => setEvidence({ courierReceipt: files })}
          minCount={1}
          maxCount={3}
          accept={PROOF_ACCEPT}
          disabled={submitting}
          required
        />

        {formError ? (
          <p className="order-claim-modal__error mt-3 mb-0" role="alert">
            {formError}
          </p>
        ) : null}
      </AdvancedModal>
    </>
  );
};

OrderClaimReturnShipmentPanel.propTypes = {
  order: PropTypes.object.isRequired,
  claim: PropTypes.object,
  onOrderUpdated: PropTypes.func,
  setAlert: PropTypes.func.isRequired,
};

export default connect(null, { submitOrderClaimReturnShipment, setAlert })(
  OrderClaimReturnShipmentPanel,
);
