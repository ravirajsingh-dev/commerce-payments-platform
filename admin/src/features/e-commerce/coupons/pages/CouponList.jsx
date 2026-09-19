import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import CouponFilters from "../components/CouponFilters";
import CouponTable from "../components/CouponTable";
import { deleteCoupon, getCouponList, setCouponStatus } from "../couponActions";

const EMPTY_FILTERS = {
  code: "",
  title: "",
  discountType: "",
  status: "",
};

const CouponList = ({ couponStore, getCouponList, setCouponStatus, deleteCoupon }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  const { coupons, totalRecord, summary, loadingList, loadingSubmit } = couponStore;

  const listParams = useMemo(() => {
    const next = {
      page: params.page || 1,
      limit: params.limit || 20,
      orderBy: params.orderBy || "createdAt",
      ascending: params.ascending || "desc",
    };

    const code = String(appliedFilters.code || "").trim();
    const title = String(appliedFilters.title || "").trim();
    const discountType = String(appliedFilters.discountType || "").trim();
    const status = String(appliedFilters.status || "").trim();

    if (code) next.code = code;
    if (title) next.title = title;
    if (discountType) next.discountType = discountType;
    if (status) next.status = status;

    return next;
  }, [params, appliedFilters]);

  useEffect(() => {
    getCouponList(listParams);
  }, [getCouponList, listParams]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name === "status") {
      const nextStatus = value === "" ? null : Number(value);
      setSelectedSummaryStatus([1, 2].includes(nextStatus) ? nextStatus : null);
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
      status: statusValue === null ? "" : String(statusValue),
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const summaryItems = useMemo(
    () => [
      {
        label: "Total",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Active",
        value: summary?.active || 0,
        active: selectedSummaryStatus === 1,
        onClick: () => onSummaryCardClick(1),
      },
      {
        label: "Disabled",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === 2,
        onClick: () => onSummaryCardClick(2),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus],
  );

  const handleOpenCreate = () => {
    navigate("/admin/coupons/create");
  };

  const handleOpenEdit = (coupon) => {
    navigate(`/admin/coupons/edit/${coupon._id}`);
  };

  const handleOpenStatusToggle = (coupon) => {
    setSelectedCoupon(coupon);
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedCoupon(null);
  };

  const handleOpenDelete = (coupon) => {
    setSelectedCoupon(coupon);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCoupon(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedCoupon?._id) return;
    const result = await deleteCoupon(selectedCoupon._id);
    if (result?.status) {
      handleCloseDeleteModal();
      getCouponList(listParams);
    }
  };

  const onConfirmStatusToggle = async () => {
    if (!selectedCoupon?._id) return;
    const nextStatus = Number(selectedCoupon.status) === 1 ? 2 : 1;
    const result = await setCouponStatus(selectedCoupon._id, nextStatus);
    if (result?.status) {
      handleCloseStatusModal();
      getCouponList(listParams);
    }
  };

  const isDisabling = Number(selectedCoupon?.status) === 1;
  const statusActionLabel = isDisabling ? "Disable" : "Enable";

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Coupons" },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button
          type="button"
          className="btn btn--theme"
          onClick={handleOpenCreate}
          disabled={loadingSubmit}
        >
          Create Coupon
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <CouponFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <CouponTable
        data={coupons}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onEdit={handleOpenEdit}
        onToggleStatus={handleOpenStatusToggle}
        onDelete={handleOpenDelete}
        loadingSubmit={loadingSubmit}
      />

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDeleteModal}
        title="Delete Coupon"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: handleCloseDeleteModal,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDelete,
            className: "btn btn--danger",
            disabled: loadingSubmit || Number(selectedCoupon?.usedCount) > 0,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Permanently delete <strong>{selectedCoupon?.code || "this coupon"}</strong>?
          {Number(selectedCoupon?.usedCount) > 0 ? (
            <>
              {" "}
              This coupon has been used {selectedCoupon.usedCount} time(s) and cannot be
              deleted — disable it instead.
            </>
          ) : (
            " This cannot be undone."
          )}
        </p>
      </AdvancedModal>

      <AdvancedModal
        show={showStatusModal}
        onHide={handleCloseStatusModal}
        title={`${statusActionLabel} Coupon`}
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: handleCloseStatusModal,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? `${statusActionLabel}...` : statusActionLabel,
            onClick: onConfirmStatusToggle,
            className: isDisabling ? "btn btn--danger" : "btn btn--theme",
            disabled: loadingSubmit,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Are you sure you want to {statusActionLabel.toLowerCase()}{" "}
          <strong>{selectedCoupon?.code || "this coupon"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ couponStore: state.coupons });
export default connect(mapStateToProps, {
  getCouponList,
  setCouponStatus,
  deleteCoupon,
})(CouponList);
