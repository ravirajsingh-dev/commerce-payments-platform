import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomSelect from "@src/components/common/CustomSelect";
import {
  ADMIN_CANCELLATION_REASON_SET,
  CANCELLATION_NOTE_MAX_LENGTH,
  findAdminCancellationReasonOption,
  loadAdminCancellationReasonOptions,
} from "@src/constants/adminCancellationReasons";
import { FaExclamationTriangle } from "react-icons/fa";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import Errors from "@src/notifications/Errors";
import OrderAddressSnapshotForm from "../components/OrderAddressSnapshotForm";
import {
  cancelOrder,
  getOrderByOrderNo,
  orderDetailClear,
  patchOrderAddressSnapshot,
} from "../orderActions";
import {
  addressSnapshotToForm,
  canAdminCancelOrder,
  canAdminEditOrderAddress,
  formatInr,
  formatOrderAddress,
  formatCancellationReason,
  formatOrderDateTime,
  hasPendingCancellationRequest,
  label,
} from "../orderHelpers";

const LINE_ITEM_TABLE_PARAMS = {
  page: 1,
  limit: 100,
  orderBy: "",
  ascending: "desc",
};

const OrderDetail = ({
  orderStore,
  getOrderByOrderNo,
  cancelOrder,
  patchOrderAddressSnapshot,
  orderDetailClear,
}) => {
  const { orderNo = "" } = useParams();
  const { currentOrder, loadingDetail, loadingSubmit } = orderStore;

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [addressForm, setAddressForm] = useState(addressSnapshotToForm());
  const [cancelForm, setCancelForm] = useState({ reason: "", note: "" });
  const [cancelFormError, setCancelFormError] = useState("");
  const [lineItemParams, setLineItemParams] = useState(LINE_ITEM_TABLE_PARAMS);

  const cancelNoteRequired = cancelForm.reason === "other";
  const cancelNoteTooLong = cancelForm.note.length > CANCELLATION_NOTE_MAX_LENGTH;
  const selectedCancelReason = useMemo(
    () => findAdminCancellationReasonOption(cancelForm.reason),
    [cancelForm.reason],
  );
  const canSubmitCancel = useMemo(() => {
    if (!cancelForm.reason || cancelNoteTooLong) return false;
    if (cancelNoteRequired && !cancelForm.note.trim()) return false;
    return true;
  }, [cancelForm.reason, cancelForm.note, cancelNoteRequired, cancelNoteTooLong]);

  useEffect(() => {
    getOrderByOrderNo(orderNo);
    return () => orderDetailClear();
  }, [getOrderByOrderNo, orderDetailClear, orderNo]);

  const lineItems = currentOrder?.items || [];

  const lineItemColumns = useMemo(
    () => [
      {
        name: "Product",
        minWidth: "220px",
        cell: (item) => (
          <div>
            <span>{item.productNameSnapshot}</span>
            {item.size ? (
              <small className="admin-order-detail__item-meta d-block">
                Size {String(item.size).toUpperCase()}
              </small>
            ) : null}
          </div>
        ),
      },
      {
        name: "SKU",
        selector: (item) => item.skuSnapshot,
        minWidth: "120px",
      },
      {
        name: "Qty",
        selector: (item) => item.quantity,
        minWidth: "80px",
      },
      {
        name: "Unit",
        minWidth: "110px",
        cell: (item) => formatInr(item.unitPriceSnapshot),
      },
      {
        name: "Line total",
        minWidth: "120px",
        cell: (item) => formatInr(item.lineTotal),
      },
    ],
    [],
  );

  const breadcrumbs = useMemo(
    () => [
      { label: "Dashboard", link: "/admin/dashboard" },
      { label: "Orders", link: "/admin/orders" },
      { label: currentOrder?.orderNo || orderNo },
    ],
    [currentOrder?.orderNo, orderNo],
  );

  const handleOpenCancelConfirm = () => {
    const customerReason = currentOrder?.cancellation?.reason || "";
    const customerNote = currentOrder?.cancellation?.note || "";
    const pending = hasPendingCancellationRequest(currentOrder);

    let reason = "";
    let note = "";

    if (ADMIN_CANCELLATION_REASON_SET.has(customerReason)) {
      reason = customerReason;
      note = customerNote;
    } else if (pending) {
      reason = "customer_requested";
      const reasonLabel = customerReason
        ? formatCancellationReason(customerReason)
        : "";
      note =
        customerNote ||
        (reasonLabel ? `Customer cited: ${reasonLabel}` : "");
    }

    setCancelForm({ reason, note });
    setCancelFormError("");
    setShowCancelConfirmModal(true);
  };

  const handleCloseCancelConfirm = () => {
    if (!loadingSubmit) {
      setCancelForm({ reason: "", note: "" });
      setCancelFormError("");
      setShowCancelConfirmModal(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!canSubmitCancel) {
      setCancelFormError(
        cancelNoteRequired
          ? "Please select a reason and add a short note."
          : "Please select a cancellation reason.",
      );
      return;
    }

    const result = await cancelOrder(orderNo, {
      reason: cancelForm.reason,
      note: cancelForm.note.trim(),
    });
    if (result?.status) {
      setCancelForm({ reason: "", note: "" });
      setCancelFormError("");
      setShowCancelConfirmModal(false);
    }
  };

  const handleOpenAddressModal = () => {
    setAddressForm(addressSnapshotToForm(currentOrder?.addressSnapshot));
    setShowAddressModal(true);
  };

  const handleCloseAddressModal = () => {
    if (!loadingSubmit) {
      setShowAddressModal(false);
    }
  };

  const onAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitAddress = async (e) => {
    e.preventDefault();
    const result = await patchOrderAddressSnapshot(orderNo, {
      addressSnapshot: addressForm,
    });
    if (result?.status) {
      setShowAddressModal(false);
    }
  };

  if (loadingDetail && !currentOrder) {
    return <BouncingLoader minHeight="360px" />;
  }

  if (!currentOrder) {
    return (
      <Container className="admin-order-detail">
        <AppBreadCrumb breadcrumbs={breadcrumbs} />
        <Card className="common-panel-card">
          <Card.Body className="text-center py-5">
            <p className="mb-3 admin-order-detail__text">Order not found.</p>
            <Link to="/admin/orders" className="btn btn--outline">
              Back to orders
            </Link>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="admin-order-detail">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />

      <Card className="common-panel-card">
        <Card.Header className="admin-order-detail__header">
          <div className="admin-order-detail__header-main">
            <Card.Title as="h5" className="mb-1">
              {currentOrder.orderNo}
            </Card.Title>
            <small className="admin-order-detail__meta">
              Placed {formatOrderDateTime(currentOrder.createdAt)}
            </small>
          </div>
          <div className="admin-order-detail__header-actions">
            <span
              className={`badge admin-order-status admin-order-status--${currentOrder.status}`}
            >
              {label(currentOrder.status)}
            </span>
            {currentOrder.status !== "cancelled" ? (
              <Link
                to={`/admin/orders/${encodeURIComponent(currentOrder.orderNo)}/manage`}
                className="btn btn--theme btn-sm"
              >
                Manage tracking
              </Link>
            ) : null}
            {currentOrder.claim?.status ? (
              <Link
                to={`/admin/order-claims/${encodeURIComponent(currentOrder.orderNo)}/manage`}
                className="btn btn--outline btn-sm"
              >
                Manage claim
              </Link>
            ) : null}
            {canAdminCancelOrder(currentOrder) ? (
              <Button
                type="button"
                variant="outline-danger"
                size="sm"
                className="admin-order-detail__cancel-btn"
                onClick={handleOpenCancelConfirm}
                disabled={loadingSubmit}
              >
                Cancel order
              </Button>
            ) : null}
          </div>
        </Card.Header>
        <Card.Body>
          {hasPendingCancellationRequest(currentOrder) ? (
            <div
              className="admin-order-cancel-request mb-4"
              role="status"
            >
              <p className="admin-order-cancel-request__eyebrow">
                Cancellation request
              </p>
              <p className="admin-order-cancel-request__title">
                Customer requested cancellation on{" "}
                <time dateTime={currentOrder.cancellation?.requestedAt}>
                  {formatOrderDateTime(currentOrder.cancellation?.requestedAt)}
                </time>
                .
              </p>
              {currentOrder.cancellation?.reason || currentOrder.cancellation?.note ? (
                <dl className="admin-order-cancel-request__meta">
                  {currentOrder.cancellation?.reason ? (
                    <div>
                      <dt>Reason</dt>
                      <dd>
                        {formatCancellationReason(currentOrder.cancellation.reason)}
                      </dd>
                    </div>
                  ) : null}
                  {currentOrder.cancellation?.note ? (
                    <div>
                      <dt>Customer note</dt>
                      <dd>{currentOrder.cancellation.note}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
          ) : null}
          <Row className="g-3 mb-4">
            <Col xs={12} lg={6}>
              <section className="admin-order-detail__block">
                <h6 className="admin-order-detail__block-title">Customer</h6>
                <p className="admin-order-detail__text mb-1">
                  {currentOrder.customer?.name || "—"}
                </p>
                <p className="admin-order-detail__text mb-1">
                  {currentOrder.customer?.phone || "—"}
                </p>
                <p className="admin-order-detail__text mb-0">
                  {currentOrder.customer?.email || "—"}
                </p>
              </section>
            </Col>
            <Col xs={12} lg={6}>
              <section className="admin-order-detail__block">
                <div className="admin-order-detail__block-head">
                  <h6 className="admin-order-detail__block-title mb-0">
                    Shipping address
                  </h6>
                  {canAdminEditOrderAddress(currentOrder) ? (
                    <Button
                      type="button"
                      className="btn btn--outline btn-sm admin-order-detail__edit-address-btn"
                      onClick={handleOpenAddressModal}
                      disabled={loadingSubmit}
                    >
                      Edit address
                    </Button>
                  ) : null}
                </div>
                <pre className="admin-order-address mb-0">
                  {formatOrderAddress(currentOrder.addressSnapshot)}
                </pre>
                <p className="admin-order-detail__address-hint mb-0">
                  Updates this order only. Customer saved addresses are not changed.
                </p>
              </section>
            </Col>
          </Row>

          <h6 className="admin-order-detail__block-title mb-3">Line items</h6>
          <CustomDataTable
            columns={lineItemColumns}
            data={lineItems}
            pagination={false}
            sortServer={false}
            progressPending={false}
            count={lineItems.length}
            params={lineItemParams}
            setParams={setLineItemParams}
            persistTableHead
            noDataComponent={
              <NoRecordsFound description="No line items." compact />
            }
          />

          {currentOrder.amounts ? (
            <dl className="admin-order-totals mt-3">
              <div>
                <dt>Items</dt>
                <dd>{formatInr(currentOrder.amounts.items)}</dd>
              </div>
              {currentOrder.amounts.discount > 0 ? (
                <div>
                  <dt>Discount</dt>
                  <dd>-{formatInr(currentOrder.amounts.discount)}</dd>
                </div>
              ) : null}
              {currentOrder.amounts.gst > 0 ? (
                <div>
                  <dt>GST</dt>
                  <dd>{formatInr(currentOrder.amounts.gst)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Shipping</dt>
                <dd>
                  {currentOrder.amounts.shipping > 0
                    ? formatInr(currentOrder.amounts.shipping)
                    : "Free"}
                </dd>
              </div>
              <div className="admin-order-totals__grand">
                <dt>Total</dt>
                <dd>{formatInr(currentOrder.amounts.total)}</dd>
              </div>
            </dl>
          ) : null}
        </Card.Body>
      </Card>

      <AdvancedModal
        show={showAddressModal}
        onHide={handleCloseAddressModal}
        title="Edit shipping address"
        size="lg"
        closeButton
        bodyClassName="common-modal-body--start admin-order-address-modal"
        actions={[
          {
            label: "Cancel",
            onClick: handleCloseAddressModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Saving..." : "Save address",
            onClick: onSubmitAddress,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <p className="admin-order-address-modal__intro mb-3">
          Correct the shipment address on order <strong>{currentOrder.orderNo}</strong>.
          This does not update the customer&apos;s saved address book.
        </p>
        <Form onSubmit={onSubmitAddress}>
          <OrderAddressSnapshotForm form={addressForm} onChange={onAddressChange} />
        </Form>
      </AdvancedModal>

      <AdvancedModal
        show={showCancelConfirmModal}
        onHide={handleCloseCancelConfirm}
        title="Cancel order"
        size="md"
        className="admin-order-cancel-confirm-modal"
        bodyClassName="common-modal-body--start admin-order-cancel-modal__body"
        icon={<FaExclamationTriangle className="common-modal-icon is-danger" />}
        actions={[
          {
            label: "Keep order",
            onClick: handleCloseCancelConfirm,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Cancelling…" : "Cancel order",
            onClick: handleConfirmCancelOrder,
            className: "btn btn--danger",
            colSize: 7,
            disabled: loadingSubmit || !canSubmitCancel,
          },
        ]}
      >
        <p className="admin-order-cancel-confirm-modal__text mb-2">
          Cancel order <strong>{currentOrder.orderNo}</strong>? Stock for all line
          items will be restored to inventory.
        </p>
        <p className="admin-order-cancel-confirm-modal__text mb-3">
          This action cannot be undone. Record why this order is being cancelled.
        </p>
        {hasPendingCancellationRequest(currentOrder) ? (
          <p className="admin-order-cancel-confirm-modal__hint mb-3">
            The customer has already requested cancellation for this order.
          </p>
        ) : null}

        <Form.Group className="mb-3">
          <Form.Label htmlFor="admin-cancel-reason" className="form-sub-label">
            Cancellation reason
          </Form.Label>
          <CustomSelect
            className="admin-order-cancel-modal__select"
            value={selectedCancelReason}
            onChange={(option) => {
              setCancelForm((prev) => ({
                ...prev,
                reason: option?.value ?? "",
              }));
              setCancelFormError("");
            }}
            loadOptions={loadAdminCancellationReasonOptions}
            isDisabled={loadingSubmit}
            isRequired
            placeholder="Select a reason"
            error={
              cancelFormError &&
              (!cancelForm.reason || cancelFormError.toLowerCase().includes("reason"))
                ? cancelFormError
                : null
            }
          />
          <Errors current_key="reason" />
        </Form.Group>

        <Form.Group className="mb-0">
          <Form.Label htmlFor="admin-cancel-note" className="form-sub-label">
            Note
            {cancelNoteRequired ? " (required)" : " (optional)"}
          </Form.Label>
          <Form.Control
            as="textarea"
            id="admin-cancel-note"
            rows={3}
            value={cancelForm.note}
            onChange={(e) => {
              setCancelForm((prev) => ({ ...prev, note: e.target.value }));
              setCancelFormError("");
            }}
            disabled={loadingSubmit}
            maxLength={CANCELLATION_NOTE_MAX_LENGTH}
            placeholder={
              cancelNoteRequired
                ? "Describe why this order is being cancelled"
                : "Add context for support or courier (optional)"
            }
          />
          <Errors current_key="note" />
          <div className="admin-order-cancel-modal__note-footer">
            <span className="admin-order-cancel-modal__char-count">
              {cancelForm.note.length}/{CANCELLATION_NOTE_MAX_LENGTH}
            </span>
          </div>
        </Form.Group>

        {cancelFormError &&
        cancelForm.reason &&
        !cancelFormError.toLowerCase().includes("reason") ? (
          <p className="admin-order-cancel-modal__error mt-3 mb-0" role="alert">
            {cancelFormError}
          </p>
        ) : null}
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  orderStore: state.orders,
});

export default connect(mapStateToProps, {
  getOrderByOrderNo,
  cancelOrder,
  patchOrderAddressSnapshot,
  orderDetailClear,
})(OrderDetail);
