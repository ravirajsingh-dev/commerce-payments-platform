import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import ClaimPolicyForm from "../components/ClaimPolicyForm";
import useClaimPolicyForm from "../hooks/useClaimPolicyForm";
import {
  getClaimPolicyById,
  getClaimPolicyList,
  updateClaimPolicy,
} from "../claimPolicyActions";

const ClaimPolicyEdit = ({
  getClaimPolicyById,
  getClaimPolicyList,
  updateClaimPolicy,
  setErrors,
  removeErrors,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [listRows, setListRows] = useState([]);
  const [loadedPolicy, setLoadedPolicy] = useState(null);

  const {
    formData,
    claimTypeOptions,
    claimReasonOptions,
    validationErrors,
    visibleLocalErrors,
    isFormValid,
    setSubmitAttempted,
    markFieldTouched,
    resetForm,
    onInputChange,
    onTypesChange,
    onReasonsChange,
    onRequiredEvidenceChange,
    getPayload,
  } = useClaimPolicyForm({ initialPolicy: loadedPolicy, listRows });

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    const loadList = async () => {
      const result = await getClaimPolicyList({ page: 1, limit: 100 });
      if (result?.status) setListRows(result.data || []);
    };
    loadList();
  }, [getClaimPolicyList]);

  useEffect(() => {
    const run = async () => {
      setLoadingPolicy(true);
      const result = await getClaimPolicyById(id);
      if (result?.status && result?.data) {
        setLoadedPolicy(result.data);
        resetForm(result.data);
      } else {
        navigate("/admin/claim-policies");
      }
      setLoadingPolicy(false);
    };
    run();
  }, [getClaimPolicyById, id, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = Object.entries(validationErrors).map(([path, msg]) => ({ path, msg }));
    if (errors.length) {
      setSubmitAttempted(true);
      setErrors(errors);
      return;
    }

    setLoadingSubmit(true);
    const result = await updateClaimPolicy(id, getPayload());
    setLoadingSubmit(false);
    if (result?.status) {
      removeErrors();
      navigate("/admin/claim-policies");
    }
  };

  if (loadingPolicy) {
    return (
      <Container>
        <BouncingLoader minHeight="320px" />
      </Container>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Claim Policies", link: "/admin/claim-policies" },
          { label: "Edit Claim Policy" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Claim Policy</Card.Header>
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
              showStatus
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
                {loadingSubmit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default connect(null, {
  getClaimPolicyById,
  getClaimPolicyList,
  updateClaimPolicy,
  setErrors,
  removeErrors,
})(ClaimPolicyEdit);
