import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import ClaimEvidenceViewer from "./ClaimEvidenceViewer";
import ClaimRestockLinesField from "./ClaimRestockLinesField";
import {
  ADMIN_RESOLUTION_OPTIONS,
  CLAIM_MUTABLE_STATUS_OPTIONS,
  CLAIM_NOTE_MAX_LENGTH,
  PAYMENT_STATUS_OPTIONS,
  claimStatusBadgeClass,
  getSelectOptionByValue,
  labelClaimReason,
  labelClaimStatus,
  labelClaimType,
  resolveOrderItemLabel,
} from "../claimRequestHelpers";

const ClaimRequestManagePanel = ({
  claim,
  orderItems = [],
  loadingClaim,
  loadingSubmit,
  claimDecisionNote,
  setClaimDecisionNote,
  claimAdminNote,
  setClaimAdminNote,
  claimStatus,
  setClaimStatus,
  claimLogistics,
  setClaimLogistics,
  claimResolution,
  setClaimResolution,
  restockLines,
  setRestockLines,
  adminConfirmQc,
  setAdminConfirmQc,
  canDecide,
  canComplete,
  isTerminal,
  onApprove,
  onReject,
  onPatch,
  onComplete,
}) => {
  const loadClaimStatusOptions = useCallback(() => CLAIM_MUTABLE_STATUS_OPTIONS, []);
  const loadResolutionOptions = useCallback(() => ADMIN_RESOLUTION_OPTIONS, []);
  const loadPaymentStatusOptions = useCallback(() => PAYMENT_STATUS_OPTIONS, []);

  if (loadingClaim && !claim) {
    return (
      <Card className="common-panel-card">
        <Card.Body>
          <p className="mb-0">Loading claim request...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!claim) {
    return (
      <Card className="common-panel-card">
        <Card.Body>
          <p className="mb-0 claim-request-empty-hint">Claim request not found for this order.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="claim-request-manage">
      <Card className="common-panel-card mb-3">
        <Card.Header className="claim-request-manage__head">
          <div>
            <Card.Title as="h6" className="mb-1">
              Overview
            </Card.Title>
            <span className="claim-request-manage__order">{claim.orderNo}</span>
          </div>
          <div className="claim-request-manage__head-actions">
            <Link
              to={`/admin/orders/${encodeURIComponent(claim.orderNo)}`}
              className="btn btn--outline btn-sm"
            >
              View order
            </Link>
            <span className={claimStatusBadgeClass(claim.status)}>{labelClaimStatus(claim.status)}</span>
          </div>
        </Card.Header>
        <Card.Body>
          <dl className="claim-request-manage__facts">
            <div>
              <dt>Type</dt>
              <dd>{labelClaimType(claim.type)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{labelClaimReason(claim.reasonCode)}</dd>
            </div>
            <div className="claim-request-manage__facts-wide">
              <dt>Customer note</dt>
              <dd>{claim.note || "—"}</dd>
            </div>
            {claim.decisionNote ? (
              <div className="claim-request-manage__facts-wide">
                <dt>Decision note</dt>
                <dd>{claim.decisionNote}</dd>
              </div>
            ) : null}
            {Array.isArray(claim.affectedLines) && claim.affectedLines.length > 0 ? (
              <div className="claim-request-manage__facts-wide">
                <dt>Affected items</dt>
                <dd>
                  <ul className="claim-request-manage__affected-list mb-0">
                    {claim.affectedLines.map((line) => (
                      <li key={line.orderItemId}>
                        {resolveOrderItemLabel(line.orderItemId, orderItems)}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                        {line.note ? ` — ${line.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        </Card.Body>
      </Card>

      <ClaimEvidenceViewer claim={claim} />

      {canDecide ? (
        <Card className="common-panel-card mb-3">
          <Card.Header>
            <Card.Title as="h6" className="mb-0">
              Approve or reject
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Label>Decision note</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={claimDecisionNote}
                onChange={(e) => setClaimDecisionNote(e.target.value)}
                maxLength={CLAIM_NOTE_MAX_LENGTH}
                disabled={loadingSubmit}
                placeholder="Required for rejection; optional for approval"
              />
              <Form.Text className="claim-request-form__hint">
                {claimDecisionNote.length}/{CLAIM_NOTE_MAX_LENGTH} characters
              </Form.Text>
            </Form.Group>
            <div className="claim-request-form-actions d-flex flex-column flex-sm-row gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onApprove}
                disabled={loadingSubmit}
              >
                Approve claim
              </Button>
              <Button
                type="button"
                className="btn btn--outline"
                onClick={onReject}
                disabled={loadingSubmit || !claimDecisionNote.trim()}
              >
                Reject claim
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : null}

      {!isTerminal ? (
        <Card className="common-panel-card mb-3">
          <Card.Header>
            <Card.Title as="h6" className="mb-0">
              Update progress
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Claim status</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={getSelectOptionByValue(CLAIM_MUTABLE_STATUS_OPTIONS, claimStatus)}
                    onChange={(option) => setClaimStatus(option?.value ?? "")}
                    loadOptions={loadClaimStatusOptions}
                    placeholder="Select claim status"
                    isDisabled={loadingSubmit}
                    isRequired
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Admin note</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={claimAdminNote}
                    onChange={(e) => setClaimAdminNote(e.target.value)}
                    maxLength={CLAIM_NOTE_MAX_LENGTH}
                    disabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
            </Row>

            <p className="claim-request-manage__subheading">Return shipment</p>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Courier</Form.Label>
                  <Form.Control
                    type="text"
                    value={claimLogistics.courierName}
                    onChange={(e) =>
                      setClaimLogistics((prev) => ({ ...prev, courierName: e.target.value }))
                    }
                    disabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Tracking number</Form.Label>
                  <Form.Control
                    type="text"
                    value={claimLogistics.trackingNumber}
                    onChange={(e) =>
                      setClaimLogistics((prev) => ({ ...prev, trackingNumber: e.target.value }))
                    }
                    disabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="claim-request-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={onPatch}
                disabled={loadingSubmit}
              >
                Save updates
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : null}

      {canComplete ? (
        <Card className="common-panel-card mb-3">
          <Card.Header>
            <Card.Title as="h6" className="mb-0">
              Complete claim
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Resolution code</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={getSelectOptionByValue(
                      ADMIN_RESOLUTION_OPTIONS,
                      claimResolution.resolutionCode,
                    )}
                    onChange={(option) =>
                      setClaimResolution((prev) => ({
                        ...prev,
                        resolutionCode: option?.value ?? "",
                      }))
                    }
                    loadOptions={loadResolutionOptions}
                    placeholder="Select resolution"
                    isDisabled={loadingSubmit}
                    isRequired
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Payment status</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={getSelectOptionByValue(
                      PAYMENT_STATUS_OPTIONS,
                      claimResolution.paymentStatus ?? "",
                    )}
                    onChange={(option) =>
                      setClaimResolution((prev) => ({
                        ...prev,
                        paymentStatus: option?.value ?? "",
                      }))
                    }
                    loadOptions={loadPaymentStatusOptions}
                    placeholder="No change"
                    isDisabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Refund amount</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={claimResolution.refundAmount}
                    onChange={(e) =>
                      setClaimResolution((prev) => ({
                        ...prev,
                        refundAmount: e.target.value,
                      }))
                    }
                    disabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Resolution note</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={claimResolution.resolutionNote}
                    onChange={(e) =>
                      setClaimResolution((prev) => ({
                        ...prev,
                        resolutionNote: e.target.value,
                      }))
                    }
                    maxLength={CLAIM_NOTE_MAX_LENGTH}
                    disabled={loadingSubmit}
                  />
                </Form.Group>
              </Col>
            </Row>

            <ClaimRestockLinesField
              orderItems={orderItems}
              restockLines={restockLines}
              onChange={setRestockLines}
              adminConfirmQc={adminConfirmQc}
              onAdminConfirmQcChange={setAdminConfirmQc}
              disabled={loadingSubmit}
            />

            <div className="claim-request-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--theme"
                onClick={onComplete}
                disabled={loadingSubmit || !claimResolution.resolutionCode}
              >
                Complete claim
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
};

export default ClaimRequestManagePanel;
