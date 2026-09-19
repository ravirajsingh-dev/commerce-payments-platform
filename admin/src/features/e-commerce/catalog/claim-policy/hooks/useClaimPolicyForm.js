import { useCallback, useMemo, useState } from "react";

import {
  applyUnifiedRequiredEvidence,
  buildReasonOptions,
  buildTypeOptions,
  formDataToPayload,
  generatePolicyCodeFromName,
  getInitialClaimPolicyForm,
  getUnifiedRequiredEvidence,
  policyToFormData,
} from "../claimPolicyHelpers";

const useClaimPolicyForm = ({ initialPolicy = null, listRows = [] } = {}) => {
  const [formData, setFormData] = useState(() =>
    initialPolicy ? policyToFormData(initialPolicy) : getInitialClaimPolicyForm(),
  );
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const claimTypeOptions = useMemo(
    () => buildTypeOptions(listRows, formData.allowedClaimTypes),
    [listRows, formData.allowedClaimTypes],
  );

  const claimReasonOptions = useMemo(
    () => buildReasonOptions(listRows, formData.allowedClaimReasons),
    [listRows, formData.allowedClaimReasons],
  );

  const validationErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter policy name.";
    if (!formData.code.trim()) errors.code = "Policy code is required.";
    if (!(formData.allowedClaimTypes || []).length) {
      errors.allowedClaimTypes = "Select at least one claim type.";
    }
    const minImages = Number(formData.minImages);
    const maxImages = Number(formData.maxImages);
    if (!Number.isFinite(minImages) || minImages < 0) {
      errors.minImages = "Min images must be zero or greater.";
    }
    if (!Number.isFinite(maxImages) || maxImages < 0) {
      errors.maxImages = "Max images must be zero or greater.";
    }
    if (Number.isFinite(minImages) && Number.isFinite(maxImages) && maxImages < minImages) {
      errors.maxImages = "Max images must be greater than or equal to min images.";
    }
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const next = {};
    Object.entries(validationErrors).forEach(([key, msg]) => {
      if (fieldTouched[key] || submitAttempted) next[key] = msg;
    });
    return next;
  }, [validationErrors, fieldTouched, submitAttempted]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const markFieldTouched = useCallback((name) => {
    if (!name) return;
    setFieldTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const resetForm = useCallback((policy) => {
    setFormData(policy ? policyToFormData(policy) : getInitialClaimPolicyForm());
    setFieldTouched({});
    setSubmitAttempted(false);
  }, []);

  const onInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        code: generatePolicyCodeFromName(value),
      }));
      return;
    }
    if (["claimWindowDays", "minImages", "maxImages"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (typeof value === "boolean") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onTypesChange = useCallback((options) => {
    const allowedClaimTypes = Array.isArray(options)
      ? options.map((item) => String(item?.value || "").trim().toLowerCase()).filter(Boolean)
      : [];
    setFormData((prev) => {
      const unified = getUnifiedRequiredEvidence(prev.requiredByTypeReason);
      return {
        ...prev,
        allowedClaimTypes,
        requiredByTypeReason: applyUnifiedRequiredEvidence(
          allowedClaimTypes,
          prev.allowedClaimReasons || [],
          prev.requiredByTypeReason,
          unified,
        ),
      };
    });
  }, []);

  const onReasonsChange = useCallback((options) => {
    const allowedClaimReasons = Array.isArray(options)
      ? options.map((item) => String(item?.value || "").trim().toLowerCase()).filter(Boolean)
      : [];
    setFormData((prev) => {
      const unified = getUnifiedRequiredEvidence(prev.requiredByTypeReason);
      return {
        ...prev,
        allowedClaimReasons,
        requiredByTypeReason: applyUnifiedRequiredEvidence(
          prev.allowedClaimTypes || [],
          allowedClaimReasons,
          prev.requiredByTypeReason,
          unified,
        ),
      };
    });
  }, []);

  const onRequiredEvidenceChange = useCallback((options) => {
    const requiredEvidence = Array.isArray(options)
      ? options.map((item) => String(item?.value || "").trim()).filter(Boolean)
      : [];
    setFormData((prev) => ({
      ...prev,
      requiredByTypeReason: applyUnifiedRequiredEvidence(
        prev.allowedClaimTypes || [],
        prev.allowedClaimReasons || [],
        prev.requiredByTypeReason,
        requiredEvidence,
      ),
    }));
  }, []);

  const getPayload = useCallback(() => formDataToPayload(formData), [formData]);

  return {
    formData,
    setFormData,
    claimTypeOptions,
    claimReasonOptions,
    validationErrors,
    visibleLocalErrors,
    isFormValid,
    fieldTouched,
    submitAttempted,
    setSubmitAttempted,
    markFieldTouched,
    resetForm,
    onInputChange,
    onTypesChange,
    onReasonsChange,
    onRequiredEvidenceChange,
    getPayload,
  };
};

export default useClaimPolicyForm;
