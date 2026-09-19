import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import ClaimPolicyForm from "../components/ClaimPolicyForm";
import useClaimPolicyForm from "../hooks/useClaimPolicyForm";
import {
  createClaimPolicy,
  getClaimPolicyList,
} from "../claimPolicyActions";

const ClaimPolicyCreate = ({ createClaimPolicy, getClaimPolicyList, setErrors, removeErrors }) => {
  const navigate = useNavigate();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [listRows, setListRows] = useState([]);

  const {
    formData,
    claimTypeOptions,
    claimReasonOptions,
    validationErrors,
    visibleLocalErrors,
    isFormValid,
    setSubmitAttempted,
    markFieldTouched,
    onInputChange,
    onTypesChange,
    onReasonsChange,
    onRequiredEvidenceChange,
    getPayload,
  } = useClaimPolicyForm({ listRows });

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    const load = async () => {
      const result = await getClaimPolicyList({ page: 1, limit: 100 });
      if (result?.status) setListRows(result.data || []);
    };
    load();
  }, [getClaimPolicyList]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = Object.entries(validationErrors).map(([path, msg]) => ({ path, msg }));
    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    setLoadingSubmit(true);
    const result = await createClaimPolicy(getPayload());
    setLoadingSubmit(false);
    if (result?.status) {
      removeErrors();
      navigate("/admin/claim-policies");
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Claim Policies", link: "/admin/claim-policies" },
          { label: "Create Claim Policy" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Create Claim Policy</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ClaimPolicyForm
              formData={formData}
              onInputChange={onInputChange}
              onTypesChange={onTypesChange}
              onReasonsChange={onReasonsChange}
              onRequiredEvidenceChange={onRequiredEvidenceChange}
              onFieldBlur={markFieldTouched}
              localErrors={visibleLocalErrors}
              claimTypeOptions={claimTypeOptions}
              claimReasonOptions={claimReasonOptions}
            />
            <div className="claim-policy-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/claim-policies")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !isFormValid}
              >
                {loadingSubmit ? "Saving..." : "Create Claim Policy"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default connect(null, {
  createClaimPolicy,
  getClaimPolicyList,
  setErrors,
  removeErrors,
})(ClaimPolicyCreate);
