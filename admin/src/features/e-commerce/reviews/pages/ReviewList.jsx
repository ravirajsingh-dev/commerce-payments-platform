import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import ReviewDetailModal from "../components/ReviewDetailModal";
import ReviewFilters from "../components/ReviewFilters";
import ReviewTable from "../components/ReviewTable";
import { deleteReview, getReviewList, setReviewStatus } from "../reviewActions";

const EMPTY_FILTERS = {
  productName: "",
  userName: "",
  status: "",
  rating: "",
};

const ReviewList = ({ reviewStore, getReviewList, setReviewStatus, deleteReview }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  const { reviews, totalRecord, summary, loadingList, loadingSubmit } = reviewStore;

  const listParams = useMemo(() => {
    const next = {
      page: params.page || 1,
      limit: params.limit || 20,
      orderBy: params.orderBy || "createdAt",
      ascending: params.ascending || "desc",
    };

    const productName = String(appliedFilters.productName || "").trim();
    const userName = String(appliedFilters.userName || "").trim();
    const status = String(appliedFilters.status || "").trim();
    const rating = String(appliedFilters.rating || "").trim();

    if (productName) next.productName = productName;
    if (userName) next.userName = userName;
    if (status) next.status = status;
    if (rating) next.rating = rating;

    return next;
  }, [params, appliedFilters]);

  const refreshList = useCallback(() => {
    getReviewList(listParams);
  }, [getReviewList, listParams]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name === "status") {
      setSelectedSummaryStatus(value || null);
    }
  };

  const onSearch = () => {
    setAppliedFilters(filters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedSummaryStatus(null);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFilters = {
      ...EMPTY_FILTERS,
      status: statusValue || "",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const summaryItems = useMemo(() => {
    const pending = Number(summary.pending || 0);
    const approved = Number(summary.approved || 0);
    const rejected = Number(summary.rejected || 0);
    return [
      {
        label: "Total",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Pending",
        value: pending,
        active: selectedSummaryStatus === "pending",
        onClick: () => onSummaryCardClick("pending"),
      },
      {
        label: "Approved",
        value: approved,
        active: selectedSummaryStatus === "approved",
        onClick: () => onSummaryCardClick("approved"),
      },
      {
        label: "Rejected",
        value: rejected,
        active: selectedSummaryStatus === "rejected",
        onClick: () => onSummaryCardClick("rejected"),
      },
    ];
  }, [summary, totalRecord, selectedSummaryStatus]);

  const openStatusModal = (review, status) => {
    setSelectedReview(review);
    setPendingStatus(status);
    setShowStatusModal(true);
  };

  const openDeleteModal = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const openDetailModal = (review) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const handleCloseStatusModal = () => {
    if (!loadingSubmit) {
      setShowStatusModal(false);
      setSelectedReview(null);
      setPendingStatus("");
    }
  };

  const handleCloseDeleteModal = () => {
    if (!loadingSubmit) {
      setShowDeleteModal(false);
      setSelectedReview(null);
    }
  };

  const handleConfirmStatus = async () => {
    if (!selectedReview?._id || !pendingStatus) return;
    const result = await setReviewStatus(selectedReview._id, pendingStatus);
    if (result?.status) {
      setShowStatusModal(false);
      setSelectedReview(null);
      setPendingStatus("");
      refreshList();
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedReview?._id) return;
    const result = await deleteReview(selectedReview._id);
    if (result?.status) {
      setShowDeleteModal(false);
      setSelectedReview(null);
      refreshList();
    }
  };

  const modalTitle =
    pendingStatus === "approved" ? "Approve review" : "Reject review";
  const modalBody =
    pendingStatus === "approved"
      ? `Publish this review from ${selectedReview?.userName || "customer"} on ${selectedReview?.productName || "product"}?`
      : `Reject this review from ${selectedReview?.userName || "customer"}? It will not appear on the storefront.`;

  return (
    <Container className="review-page">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Reviews" },
        ]}
      />

      <div className="common-panel-card mb-3 p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h5 className="mb-1">Product reviews</h5>
            <p className="review-page__hint mb-0">
              Moderate customer reviews before they appear on product pages.
            </p>
          </div>
          <Button
            type="button"
            className="btn btn--outline"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </Button>
        </div>
      </div>

      <SummaryStatsCards items={summaryItems} className="mb-3" />

      <Collapse in={showFilters}>
        <div>
          <ReviewFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <ReviewTable
        data={reviews}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onApprove={(review) => openStatusModal(review, "approved")}
        onReject={(review) => openStatusModal(review, "rejected")}
        onDelete={openDeleteModal}
        onView={openDetailModal}
        loadingSubmit={loadingSubmit}
      />

      <ReviewDetailModal
        show={showDetailModal}
        review={selectedReview}
        onHide={() => {
          setShowDetailModal(false);
          setSelectedReview(null);
        }}
      />

      <AdvancedModal
        show={showStatusModal}
        onHide={handleCloseStatusModal}
        title={modalTitle}
        size="md"
        closeButton
        actions={[
          {
            label: "Cancel",
            onClick: handleCloseStatusModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Saving…" : "Confirm",
            onClick: handleConfirmStatus,
            className: pendingStatus === "approved" ? "btn btn--theme" : "btn btn--danger",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <p className="mb-0">{modalBody}</p>
      </AdvancedModal>

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDeleteModal}
        title="Delete review"
        size="sm"
        closeButton
        actions={[
          {
            label: "Cancel",
            onClick: handleCloseDeleteModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Deleting…" : "Delete",
            onClick: handleConfirmDelete,
            className: "btn btn--danger",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <p className="mb-0">
          Permanently delete this review from{" "}
          <strong>{selectedReview?.userName || "customer"}</strong> on{" "}
          <strong>{selectedReview?.productName || "product"}</strong>? This cannot be
          undone.
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ reviewStore: state.reviews });

export default connect(mapStateToProps, {
  getReviewList,
  setReviewStatus,
  deleteReview,
})(ReviewList);
