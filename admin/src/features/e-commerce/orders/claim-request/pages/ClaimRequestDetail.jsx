import { useState } from "react";
import { connect } from "react-redux";
import { Button, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import {
  approveOrderClaim,
  completeOrderClaim,
  getOrderClaim,
  rejectOrderClaim,
  updateOrderClaim,
} from "../../orderActions";
import ClaimRequestManagePanel from "../components/ClaimRequestManagePanel";
import useClaimRequestManage from "../hooks/useClaimRequestManage";

const ClaimRequestDetail = ({
  getOrderClaim,
  approveOrderClaim,
  rejectOrderClaim,
  updateOrderClaim,
  completeOrderClaim,
  orderStore,
}) => {
  const navigate = useNavigate();
  const { orderNo: orderNoParam } = useParams();
  const orderNo = decodeURIComponent(String(orderNoParam || "").trim());
  const { loadingSubmit } = orderStore;
  const [showRejectModal, setShowRejectModal] = useState(false);

  const manage = useClaimRequestManage({
    orderNo,
    getOrderClaim,
    approveOrderClaim,
    rejectOrderClaim,
    updateOrderClaim,
    completeOrderClaim,
  });

  const handleRejectClick = () => {
    if (!manage.claimDecisionNote.trim()) {
      setShowRejectModal(true);
      return;
    }
    manage.handleReject();
  };

  return (
    <Container className="claim-request-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Claim Requests", link: "/admin/order-claims" },
          { label: orderNo || "Manage" },
        ]}
      />

      <div className="claim-request-page__toolbar d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => navigate("/admin/order-claims")}
        >
          Back to list
        </Button>
        <Button
          type="button"
          className="btn btn--theme"
          onClick={() => navigate("/admin/order-claims/create")}
        >
          Raise another claim
        </Button>
      </div>

      <ClaimRequestManagePanel
        claim={manage.claim}
        orderItems={manage.orderItems}
        loadingClaim={manage.loadingClaim}
        loadingSubmit={loadingSubmit}
        claimDecisionNote={manage.claimDecisionNote}
        setClaimDecisionNote={manage.setClaimDecisionNote}
        claimAdminNote={manage.claimAdminNote}
        setClaimAdminNote={manage.setClaimAdminNote}
        claimStatus={manage.claimStatus}
        setClaimStatus={manage.setClaimStatus}
        claimLogistics={manage.claimLogistics}
        setClaimLogistics={manage.setClaimLogistics}
        claimResolution={manage.claimResolution}
        setClaimResolution={manage.setClaimResolution}
        restockLines={manage.restockLines}
        setRestockLines={manage.setRestockLines}
        adminConfirmQc={manage.adminConfirmQc}
        setAdminConfirmQc={manage.setAdminConfirmQc}
        canDecide={manage.canDecide}
        canComplete={manage.canComplete}
        isTerminal={manage.isTerminal}
        onApprove={manage.handleApprove}
        onReject={handleRejectClick}
        onPatch={manage.handlePatch}
        onComplete={manage.handleComplete}
      />

      <AdvancedModal
        closeButton
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        title="Rejection note required"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: () => setShowRejectModal(false),
            className: "btn btn--outline",
            colSize: 5,
          },
        ]}
      >
        <p className="mb-0">Please enter a decision note before rejecting this claim.</p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  orderStore: state.orders,
});

export default connect(mapStateToProps, {
  getOrderClaim,
  approveOrderClaim,
  rejectOrderClaim,
  updateOrderClaim,
  completeOrderClaim,
})(ClaimRequestDetail);
