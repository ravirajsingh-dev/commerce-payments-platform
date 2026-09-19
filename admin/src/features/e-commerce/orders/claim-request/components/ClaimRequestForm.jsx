import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import {
  CLAIM_NOTE_MAX_LENGTH,
  CLAIM_TYPE_OPTIONS,
  CUSTOMER_CLAIM_REASON_OPTIONS,
  getSelectOptionByValue,
} from "../claimRequestHelpers";

const ClaimRequestForm = ({ values, onChange, disabled = false }) => {
  const loadTypeOptions = useCallback(() => CLAIM_TYPE_OPTIONS, []);
  const loadReasonOptions = useCallback(() => CUSTOMER_CLAIM_REASON_OPTIONS, []);

  return (
    <div className="claim-request-form">
      <Row className="g-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Order number</Form.Label>
            <Form.Control
              name="orderNo"
              value={values.orderNo || ""}
              onChange={onChange}
              placeholder="e.g. RW-20250101-0001"
              disabled={disabled}
              autoComplete="off"
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Claim type</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={getSelectOptionByValue(CLAIM_TYPE_OPTIONS, values.type || "exchange")}
              onChange={(option) =>
                onChange({
                  target: { name: "type", value: option?.value ?? "" },
                })
              }
              loadOptions={loadTypeOptions}
              placeholder="Select claim type"
              isDisabled={disabled}
              isRequired
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Reason</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={getSelectOptionByValue(
                CUSTOMER_CLAIM_REASON_OPTIONS,
                values.reasonCode || "size_or_fit_issue",
              )}
              onChange={(option) =>
                onChange({
                  target: { name: "reasonCode", value: option?.value ?? "" },
                })
              }
              loadOptions={loadReasonOptions}
              placeholder="Select reason"
              isDisabled={disabled}
              isRequired
            />
          </Form.Group>
        </Col>
        <Col xs={12}>
          <Form.Group>
            <Form.Label>Customer note (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="note"
              value={values.note || ""}
              onChange={onChange}
              maxLength={CLAIM_NOTE_MAX_LENGTH}
              disabled={disabled}
              placeholder="Additional context for this claim request"
            />
            <Form.Text className="claim-request-form__hint">
              {(values.note || "").length}/{CLAIM_NOTE_MAX_LENGTH} characters
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
};

export default ClaimRequestForm;
