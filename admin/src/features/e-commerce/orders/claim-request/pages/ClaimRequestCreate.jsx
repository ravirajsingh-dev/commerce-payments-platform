import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { createAdminOrderClaimRequest, getOrderByOrderNo } from "../../orderActions";
import ClaimRequestForm from "../components/ClaimRequestForm";
import AdminClaimEvidenceUploadField from "../components/AdminClaimEvidenceUploadField";
import { resolveOrderItemLabel } from "../claimRequestHelpers";

const INITIAL_FORM = {
  orderNo: "",
  type: "exchange",
  reasonCode: "size_or_fit_issue",
  note: "",
};

const ClaimRequestCreate = ({
  createAdminOrderClaimRequest,
  getOrderByOrderNo,
  orderStore,
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [orderPreview, setOrderPreview] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [affectedLines, setAffectedLines] = useState([]);
  const [evidenceImages, setEvidenceImages] = useState([]);
  const { loadingSubmit } = orderStore;

  const orderItems = orderPreview?.items || [];
  const normalizedOrderNo = String(form.orderNo || "").trim().toUpperCase();

  const policyPreview = useMemo(() => {
    const policies = orderItems.map((item) => item.claimPolicySnapshot).filter(Boolean);
    if (!policies.length) return null;
    return policies.map((policy, index) => ({
      key: index,
      windowDays: policy.eligibility?.claimWindowDays,
      types: (policy.eligibility?.allowedClaimTypes || []).join(", ") || "all",
      reasons: (policy.eligibility?.allowedClaimReasons || []).join(", ") || "all",
      minImages: policy.evidenceRules?.minImages ?? 0,
    }));
  }, [orderItems]);

  const loadOrderPreview = useCallback(async () => {
    if (!normalizedOrderNo) {
      setOrderPreview(null);
      setAffectedLines([]);
      return;
    }
    setLoadingOrder(true);
    const result = await getOrderByOrderNo(normalizedOrderNo);
    setOrderPreview(result?.status ? result.data : null);
    setAffectedLines([]);
    setLoadingOrder(false);
  }, [getOrderByOrderNo, normalizedOrderNo]);

  useEffect(() => {
    const timer = setTimeout(loadOrderPreview, 400);
    return () => clearTimeout(timer);
  }, [loadOrderPreview]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAffectedLine = (orderItemId, maxQty) => {
    const existing = affectedLines.find((row) => row.orderItemId === orderItemId);
    if (existing) {
      setAffectedLines(affectedLines.filter((row) => row.orderItemId !== orderItemId));
      return;
    }
    setAffectedLines([...affectedLines, { orderItemId, quantity: maxQty, note: "" }]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!normalizedOrderNo) return;

    const payload = {
      type: form.type,
      reasonCode: form.reasonCode,
      note: form.note,
      evidence: { images: evidenceImages },
    };
    if (affectedLines.length > 0) {
      payload.affectedLines = affectedLines;
    }

    const result = await createAdminOrderClaimRequest(normalizedOrderNo, payload);
    if (result?.status) {
      navigate(`/admin/order-claims/${encodeURIComponent(normalizedOrderNo)}/manage`);
    }
  };

  return (
    <Container className="claim-request-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Claim Requests", link: "/admin/order-claims" },
          { label: "Raise Claim Request" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Raise claim request</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ClaimRequestForm values={form} onChange={onChange} disabled={loadingSubmit} />

            {loadingOrder ? (
              <p className="claim-request-form__hint mt-3 mb-0">Loading order preview…</p>
            ) : null}

            {orderPreview ? (
              <div className="claim-request-create-preview mt-3">
                <p className="claim-request-create-preview__title">Order preview</p>
                <p className="claim-request-create-preview__meta mb-2">
                  Status: {orderPreview.status} · {orderItems.length} item(s)
                </p>

                {policyPreview?.length ? (
                  <div className="claim-request-create-preview__policies mb-3">
                    <p className="claim-request-form__hint mb-2">Claim policy snapshot by item</p>
                    <ul className="claim-request-create-preview__policy-list mb-0">
                      {policyPreview.map((row) => (
                        <li key={row.key}>
                          Window {row.windowDays ?? "—"} days · Types: {row.types} · Min photos:{" "}
                          {row.minImages}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="claim-request-form__hint mb-3">
                    No claim policy snapshot found on order items.
                  </p>
                )}

                {orderItems.length > 1 ? (
                  <div className="claim-request-create-preview__lines mb-3">
                    <p className="claim-request-form__hint mb-2">
                      Affected items (optional — leave unchecked for whole order)
                    </p>
                    <ul className="claim-request-create-preview__line-list mb-0">
                      {orderItems.map((item) => {
                        const selected = affectedLines.some(
                          (row) => row.orderItemId === item.orderItemId,
                        );
                        return (
                          <li key={item.orderItemId}>
                            <Form.Check
                              type="checkbox"
                              id={`create-line-${item.orderItemId}`}
                              label={`${resolveOrderItemLabel(item.orderItemId, orderItems)} · Qty ${item.quantity}`}
                              checked={selected}
                              onChange={() => toggleAffectedLine(item.orderItemId, item.quantity)}
                              disabled={loadingSubmit}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <AdminClaimEvidenceUploadField
                  orderNo={normalizedOrderNo}
                  category="images"
                  label="Evidence images (optional)"
                  value={evidenceImages}
                  onChange={setEvidenceImages}
                  disabled={loadingSubmit || !normalizedOrderNo}
                />
              </div>
            ) : null}

            <div className="claim-request-form-actions d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/admin/order-claims")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || !normalizedOrderNo}
              >
                {loadingSubmit ? "Creating..." : "Create claim request"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  orderStore: state.orders,
});

export default connect(mapStateToProps, {
  createAdminOrderClaimRequest,
  getOrderByOrderNo,
})(ClaimRequestCreate);
