import { useCallback, useEffect, useMemo, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import {
  buildEvidenceOptions,
  EVIDENCE_FIELD_OPTIONS,
  formatEvidenceLabel,
  normalizeEvidenceKey,
  getUnifiedRequiredEvidence,
} from "../claimPolicyHelpers";

const STATUS_OPTIONS = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

const getStatusOptionByValue = (value) => {
  const normalized = value === true || value === "true";
  return STATUS_OPTIONS.find((item) => item.value === normalized) || null;
};

const toMultiValue = (values = [], options = []) =>
  (values || [])
    .map((value) => {
      const key = normalizeEvidenceKey(value);
      return options.find((item) => item.value === key) || { value: key, label: formatEvidenceLabel(key) };
    })
    .filter((item) => item?.value);

const ClaimPolicyForm = ({
  formData,
  onInputChange,
  onTypesChange,
  onReasonsChange,
  onRequiredEvidenceChange,
  onFieldBlur,
  localErrors = {},
  claimTypeOptions = [],
  claimReasonOptions = [],
  showStatus = false,
}) => {
  const [evidenceOptions, setEvidenceOptions] = useState(EVIDENCE_FIELD_OPTIONS);

  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadTypeOptions = useCallback(() => claimTypeOptions, [claimTypeOptions]);
  const loadReasonOptions = useCallback(() => claimReasonOptions, [claimReasonOptions]);
  const loadEvidenceOptions = useCallback(() => evidenceOptions, [evidenceOptions]);

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  const selectedTypeOptions = useMemo(
    () =>
      (formData.allowedClaimTypes || []).map(
        (value) =>
          claimTypeOptions.find((item) => item.value === value) || {
            value,
            label: String(value).replace(/_/g, " "),
          },
      ),
    [formData.allowedClaimTypes, claimTypeOptions],
  );
  const selectedReasonOptions = useMemo(
    () =>
      (formData.allowedClaimReasons || []).map(
        (value) =>
          claimReasonOptions.find((item) => item.value === value) || {
            value,
            label: String(value).replace(/_/g, " "),
          },
      ),
    [formData.allowedClaimReasons, claimReasonOptions],
  );

  const canConfigureRequiredEvidence = useMemo(() => {
    const types = formData.allowedClaimTypes || [];
    const reasons = formData.allowedClaimReasons || [];
    return types.length > 0 && reasons.length > 0;
  }, [formData.allowedClaimTypes, formData.allowedClaimReasons]);

  const unifiedRequiredEvidence = useMemo(
    () => getUnifiedRequiredEvidence(formData.requiredByTypeReason),
    [formData.requiredByTypeReason],
  );

  useEffect(() => {
    setEvidenceOptions(buildEvidenceOptions(formData.requiredByTypeReason));
  }, [formData.requiredByTypeReason]);

  const selectProps = useMemo(
    () => ({
      classNamePrefix: "claim-policy-select",
      menuPortalTarget: typeof document !== "undefined" ? document.body : null,
      menuPosition: "fixed",
      maxMenuHeight: 280,
    }),
    [],
  );

  const selectedRequiredEvidence = useMemo(
    () => toMultiValue(unifiedRequiredEvidence, evidenceOptions),
    [unifiedRequiredEvidence, evidenceOptions],
  );

  const handleEvidenceCreate = useCallback(
    (inputValue, meta) => {
      if (meta?.action !== "create-option") return;
      const value = normalizeEvidenceKey(inputValue);
      if (!value) return;

      const option = { value, label: formatEvidenceLabel(value) };
      setEvidenceOptions((prev) => {
        if (prev.some((item) => item.value === value)) return prev;
        return [...prev, option].sort((a, b) => a.label.localeCompare(b.label));
      });

      const nextValues = [...new Set([...unifiedRequiredEvidence, value])];
      onRequiredEvidenceChange(
        nextValues.map((key) => ({ value: key, label: formatEvidenceLabel(key) })),
      );
    },
    [onRequiredEvidenceChange, unifiedRequiredEvidence],
  );

  return (
    <div className="claim-policy-form">
      <Row className="g-3">
        <Col xs={12}>
          <h6 className="claim-policy-form__section-title">Basic info</h6>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Name *</Form.Label>
            <Form.Control
              name="name"
              value={formData.name}
              onChange={onInputChange}
              onBlur={handleBlur}
              maxLength={120}
            />
            <Errors current_key="name" message={localErrors.name} />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Code *</Form.Label>
            <Form.Control name="code" value={formData.code} readOnly maxLength={60} />
            <span className="claim-policy-form__hint">Auto generated from name</span>
            <Errors current_key="code" message={localErrors.code} />
          </Form.Group>
        </Col>
        {showStatus ? (
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <CustomSelect
                className="entity-form__select"
                value={getStatusOptionByValue(formData.isActive)}
                onChange={(option) =>
                  onInputChange({
                    target: { name: "isActive", value: option?.value ?? true },
                  })
                }
                loadOptions={loadStatusOptions}
                placeholder="Select status"
              />
            </Form.Group>
          </Col>
        ) : null}

        <Col xs={12}>
          <h6 className="claim-policy-form__section-title mt-2">Eligibility</h6>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Form.Group>
            <Form.Label>Claim window (days)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              name="claimWindowDays"
              value={formData.claimWindowDays}
              onChange={onInputChange}
              onBlur={handleBlur}
            />
            <Errors current_key="claimWindowDays" message={localErrors.claimWindowDays} />
          </Form.Group>
        </Col>
        <Col xs={12} sm={6} md={8} className="d-flex align-items-center">
          <Form.Group className="mb-2 w-100">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.claimsEnabled}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "claimsEnabled", value: e.target.checked },
                  })
                }
              />
              <span>Claims enabled</span>
            </label>
          </Form.Group>
        </Col>
        <Col xs={12} lg={6}>
          <Form.Group>
            <Form.Label>Allowed claim types *</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={selectedTypeOptions}
              onChange={onTypesChange}
              loadOptions={loadTypeOptions}
              isMulti
              isCreatable
              selectProps={selectProps}
              placeholder="Select claim types"
            />
            <Errors current_key="allowedClaimTypes" message={localErrors.allowedClaimTypes} />
          </Form.Group>
        </Col>
        <Col xs={12} lg={6}>
          <Form.Group>
            <Form.Label>Allowed claim reasons</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={selectedReasonOptions}
              onChange={onReasonsChange}
              loadOptions={loadReasonOptions}
              isMulti
              isCreatable
              selectProps={selectProps}
              placeholder="Select or create claim reasons"
            />
            <Errors current_key="allowedClaimReasons" message={localErrors.allowedClaimReasons} />
          </Form.Group>
        </Col>

        <Col xs={12}>
          <h6 className="claim-policy-form__section-title mt-2">Evidence rules</h6>
          <span className="claim-policy-form__hint">
            Global image limits and proof requirements apply to every claim under this policy.
          </span>
        </Col>
        <Col xs={6} md={3}>
          <Form.Group>
            <Form.Label>Min images</Form.Label>
            <Form.Control
              type="number"
              min="0"
              name="minImages"
              value={formData.minImages}
              onChange={onInputChange}
              onBlur={handleBlur}
            />
            <Errors current_key="minImages" message={localErrors.minImages} />
          </Form.Group>
        </Col>
        <Col xs={6} md={3}>
          <Form.Group>
            <Form.Label>Max images</Form.Label>
            <Form.Control
              type="number"
              min="0"
              name="maxImages"
              value={formData.maxImages}
              onChange={onInputChange}
              onBlur={handleBlur}
            />
            <Errors current_key="maxImages" message={localErrors.maxImages} />
          </Form.Group>
        </Col>
        <Col xs={12}>
          <div className="claim-policy-form__checks">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.requireCourierReceipt}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "requireCourierReceipt", value: e.target.checked },
                  })
                }
              />
              <span>Require courier receipt</span>
            </label>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.requireDamageProof}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "requireDamageProof", value: e.target.checked },
                  })
                }
              />
              <span>Require damage proof</span>
            </label>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.requireFitProof}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "requireFitProof", value: e.target.checked },
                  })
                }
              />
              <span>Require fit proof</span>
            </label>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.requireProductProof}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "requireProductProof", value: e.target.checked },
                  })
                }
              />
              <span>Require product proof</span>
            </label>
          </div>
        </Col>

        {canConfigureRequiredEvidence ? (
          <Col xs={12}>
            <div className="claim-policy-matrix">
              <h6 className="claim-policy-form__section-title mb-0">Evidence by type &amp; reason</h6>
              <span className="claim-policy-form__hint">
                Applies to every allowed claim type and reason selected above.
              </span>
              <div className="claim-policy-matrix__panel">
                <Form.Group>
                  <Form.Label>Required evidence</Form.Label>
                  <CustomSelect
                    className="entity-form__select"
                    value={selectedRequiredEvidence}
                    onChange={onRequiredEvidenceChange}
                    loadOptions={loadEvidenceOptions}
                    onInputChange={handleEvidenceCreate}
                    isMulti
                    isCreatable
                    selectProps={selectProps}
                    placeholder="Select or create evidence fields"
                  />
                </Form.Group>
              </div>
            </div>
          </Col>
        ) : (
          <Col xs={12}>
            <p className="claim-policy-empty-hint mb-0">
              Select at least one allowed claim type and one allowed claim reason above to set
              required evidence.
            </p>
          </Col>
        )}

        <Col xs={12}>
          <h6 className="claim-policy-form__section-title mt-2">Restock policy</h6>
        </Col>
        <Col xs={12}>
          <div className="claim-policy-form__checks">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.restockableByDefault}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "restockableByDefault", value: e.target.checked },
                  })
                }
              />
              <span>Restockable by default</span>
            </label>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.requireQcForRestock}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "requireQcForRestock", value: e.target.checked },
                  })
                }
              />
              <span>Require QC for restock</span>
            </label>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={formData.bespokeNonRestockableByDefault}
                onChange={(e) =>
                  onInputChange({
                    target: { name: "bespokeNonRestockableByDefault", value: e.target.checked },
                  })
                }
              />
              <span>Bespoke non-restockable by default</span>
            </label>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ClaimPolicyForm;
