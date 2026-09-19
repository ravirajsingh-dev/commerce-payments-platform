import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Form } from "react-bootstrap";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomSelect from "@src/components/common/CustomSelect";
import ClaimEvidenceUploadField from "@src/features/orders/components/ClaimEvidenceUploadField";
import ClaimAffectedLinesField from "@src/features/orders/components/ClaimAffectedLinesField";
import OrderClaimReturnShipmentPanel from "@src/features/orders/components/OrderClaimReturnShipmentPanel";
import { setAlert } from "@src/app/state/actions/alert";
import { requestOrderClaim } from "@src/features/orders/orderActions";
import {
  CLAIM_EVIDENCE_FIELD_LABELS,
  computeClaimPhotoRequirements,
  createEmptyClaimEvidence,
  validateClaimPhotos,
} from "@src/features/orders/utils/claimEvidenceHelpers";
import {
  formatClaimWindowCountdown,
  resolveClaimEligibility,
} from "@src/features/orders/utils/claimEligibilityHelpers";
import {
  DEFAULT_CLAIM_REASONS,
  DEFAULT_CLAIM_TYPES,
  resolveClaimFormOptions,
} from "@src/features/orders/utils/claimPolicyHelpers";

const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

const getClaimStatusMessage = (claim) => {
  const status = claim?.status;
  const adminNote = claim.decisionNote || claim.resolutionNote || claim.rejectionReason;

  if (status === "rejected") {
    return adminNote || "Your request was not approved.";
  }
  if (status === "completed" || status === "closed") {
    return adminNote || "This request has been closed.";
  }
  if (status === "approved") {
    return adminNote || "Approved — use Return shipment when you have shipped the item.";
  }
  if (["in_transit", "received", "inspecting"].includes(status)) {
    return "Your request is being processed.";
  }
  return "We are reviewing your request.";
};

const OrderClaimHelpLine = ({ children }) => (
  <div className="order-claim-help">{children}</div>
);

OrderClaimHelpLine.propTypes = {
  children: PropTypes.node,
};

const OrderClaimPanel = ({
  order,
  onOrderUpdated,
  setAlert,
  requestOrderClaim,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("submit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    type: "exchange",
    reasonCode: "size_or_fit_issue",
    note: "",
  });
  const [evidence, setEvidence] = useState(createEmptyClaimEvidence);
  const [affectedLines, setAffectedLines] = useState([]);

  const claim = order?.claim || null;
  const eligibility = useMemo(() => resolveClaimEligibility(order), [order]);
  const windowCountdown = useMemo(
    () => formatClaimWindowCountdown(eligibility.claimWindowDeadline),
    [eligibility.claimWindowDeadline],
  );

  const itemPolicies = useMemo(
    () =>
      (Array.isArray(order?.items) ? order.items : [])
        .map((item) => item?.claimPolicySnapshot)
        .filter(Boolean),
    [order?.items],
  );

  const { policyAllowsClaims, allowedTypes, allowedReasons } = useMemo(
    () =>
      resolveClaimFormOptions(itemPolicies, {
        allTypes: DEFAULT_CLAIM_TYPES,
        allReasons: DEFAULT_CLAIM_REASONS,
      }),
    [itemPolicies],
  );

  const photoRequirements = useMemo(
    () => computeClaimPhotoRequirements(itemPolicies),
    [itemPolicies],
  );
  const defaultType = allowedTypes[0]?.value || "";
  const defaultReason = allowedReasons[0]?.value || "";

  const canSubmitNewClaim =
    (eligibility.canRequestClaim || eligibility.canResubmit) &&
    !windowCountdown?.expired &&
    policyAllowsClaims &&
    allowedTypes.length > 0 &&
    allowedReasons.length > 0;
  const showSubmitForm = canSubmitNewClaim && (!claim || eligibility.canResubmit);
  const showStatusOnly = claim && !showSubmitForm;

  const selectedTypeOption =
    allowedTypes.find((row) => row.value === form.type) ||
    allowedTypes.find((row) => row.value === defaultType) ||
    null;
  const selectedReasonOption =
    allowedReasons.find((row) => row.value === form.reasonCode) ||
    allowedReasons.find((row) => row.value === defaultReason) ||
    null;

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      type: allowedTypes.some((row) => row.value === prev.type) ? prev.type : defaultType,
      reasonCode: allowedReasons.some((row) => row.value === prev.reasonCode)
        ? prev.reasonCode
        : defaultReason,
    }));
  }, [allowedTypes, allowedReasons, defaultType, defaultReason]);

  if (!order) {
    return null;
  }

  const closeModal = () => {
    if (!submitting) {
      setShowModal(false);
      setFormError("");
      setEvidence(createEmptyClaimEvidence());
      setAffectedLines([]);
      setForm((prev) => ({
        ...prev,
        type: defaultType,
        reasonCode: defaultReason,
      }));
    }
  };

  const openHelpModal = () => {
    setError("");
    setModalMode(showSubmitForm ? "submit" : "status");
    setShowModal(true);
  };

  const updateEvidenceField = (field, files) => {
    setEvidence((prev) => ({
      ...prev,
      [field]: files,
    }));
  };

  const submitClaim = async () => {
    if (!form.type || !form.reasonCode) {
      setFormError("Please select claim type and reason.");
      return;
    }

    const evidenceError = validateClaimPhotos(evidence, photoRequirements);
    if (evidenceError) {
      setFormError(evidenceError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        evidence: { images: evidence.images },
      };
      if (affectedLines.length > 0) {
        payload.affectedLines = affectedLines;
      }

      const updated = await requestOrderClaim(order.orderNo, payload);
      setShowModal(false);
      setAffectedLines([]);
      onOrderUpdated?.(updated);
      setAlert("Claim request submitted.", "success");
    } catch (err) {
      const fieldMsg = err.errors?.[0]?.msg;
      if (fieldMsg) {
        setFormError(fieldMsg);
      } else {
        setError(err.message || "Unable to submit claim request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!showStatusOnly && !showSubmitForm) {
    return null;
  }

  const statusMessage = claim ? getClaimStatusMessage(claim) : "";

  return (
    <>
      <OrderClaimHelpLine>
        {error ? (
          <span className="order-claim-help__error" role="alert">
            {error}
          </span>
        ) : null}
        <button
          type="button"
          className="order-claim-help__link"
          onClick={openHelpModal}
          disabled={submitting}
        >
          Need help?
        </button>
        {showStatusOnly && claim?.needsReturnShipment ? (
          <OrderClaimReturnShipmentPanel
            order={order}
            claim={claim}
            onOrderUpdated={onOrderUpdated}
          />
        ) : null}
      </OrderClaimHelpLine>

      <AdvancedModal
        show={showModal}
        onHide={closeModal}
        title="Need help"
        size="md"
        closeButton
        bodyClassName="common-modal-body--start order-claim-modal__body"
        actions={
          modalMode === "status"
            ? [
                {
                  label: "Close",
                  onClick: closeModal,
                  className: "btn btn--outline",
                  colSize: 12,
                },
              ]
            : [
                {
                  label: "Close",
                  onClick: closeModal,
                  className: "btn btn--outline",
                  colSize: 5,
                  disabled: submitting,
                },
                {
                  label: submitting ? "Submitting…" : "Send request",
                  onClick: submitClaim,
                  className: "btn btn--theme",
                  colSize: 7,
                  disabled: submitting,
                },
              ]
        }
      >
        {modalMode === "status" ? (
          <div className="order-claim-modal__status">
            <p className="order-claim-modal__status-intro">
              You have already submitted a request for this order.
            </p>
            <p className="order-claim-modal__status-text" role="status">
              {statusMessage}
            </p>
          </div>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="form-sub-label">Claim type</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={selectedTypeOption}
                onChange={(option) =>
                  setForm((prev) => ({ ...prev, type: option?.value || defaultType }))
                }
                loadOptions={() => allowedTypes}
                isDisabled={submitting}
                isRequired
                placeholder="Select claim type"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="form-sub-label">Reason</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={selectedReasonOption}
                onChange={(option) =>
                  setForm((prev) => ({ ...prev, reasonCode: option?.value || defaultReason }))
                }
                loadOptions={() => allowedReasons}
                isDisabled={submitting}
                isRequired
                placeholder="Select claim reason"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label className="form-sub-label">Short note (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                disabled={submitting}
                maxLength={500}
                placeholder="Describe the issue in short."
              />
            </Form.Group>

            <ClaimAffectedLinesField
              items={order.items}
              selectedLines={affectedLines}
              onChange={setAffectedLines}
              disabled={submitting}
            />

            <div className="order-claim-modal__evidence">
              <p className="order-claim-modal__evidence-title">Supporting evidence</p>
              <ClaimEvidenceUploadField
                orderNo={order.orderNo}
                category="images"
                label={CLAIM_EVIDENCE_FIELD_LABELS.images}
                value={evidence.images}
                onChange={(files) => updateEvidenceField("images", files)}
                minCount={photoRequirements.minImages}
                maxCount={photoRequirements.maxImages}
                accept={IMAGE_ACCEPT}
                disabled={submitting}
                required={photoRequirements.minImages > 0}
              />
            </div>

            {formError ? (
              <p className="order-claim-modal__error mt-3 mb-0" role="alert">
                {formError}
              </p>
            ) : null}
          </>
        )}
      </AdvancedModal>
    </>
  );
};

OrderClaimPanel.propTypes = {
  order: PropTypes.object,
  onOrderUpdated: PropTypes.func,
  setAlert: PropTypes.func.isRequired,
};

export default connect(null, { requestOrderClaim, setAlert })(OrderClaimPanel);
