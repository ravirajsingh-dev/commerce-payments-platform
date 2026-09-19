import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container, Form } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { FaExternalLinkAlt } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CopyIcon from "@src/components/common/CopyIcon";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import OrderShipmentAssignForm from "../components/OrderShipmentAssignForm";
import OrderShipmentEventForm from "../components/OrderShipmentEventForm";
import OrderShipmentEventsList from "../components/OrderShipmentEventsList";
import OrderTrackingPreview from "../components/OrderTrackingPreview";
import {
  getOrderByOrderNo,
  orderDetailClear,
} from "../orderActions";
import {
  createShipment,
  createTrackingEvent,
  deleteTrackingEvent,
  getShipment,
  getTrackingEvents,
  shipmentClear,
  updateShipment,
  updateTrackingEvent,
} from "../shipment/shipmentActions";
import {
  buildCarrierTrackingLink,
  canManageOrderShipment,
  emptyShipmentAssignForm,
  emptyTrackingEventForm,
  eventAtInputToIso,
  formatTrackingDateTime,
  label,
  openCarrierTracking,
  shipmentToAssignForm,
  trackingEventToForm,
} from "../shipment/shipmentHelpers";

const REPEATABLE_TRACKING_STATUSES = new Set(["in_transit"]);
const DELETE_CONFIRMATION_TEXT = "DELETE_TRACKING_EVENT";

const OrderManage = ({
  orderStore,
  shipmentStore,
  getOrderByOrderNo,
  orderDetailClear,
  getShipment,
  getTrackingEvents,
  createShipment,
  updateShipment,
  createTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
  shipmentClear,
}) => {
  const { orderNo = "" } = useParams();
  const { currentOrder, loadingDetail } = orderStore;
  const {
    shipment,
    trackingEvents,
    eventsPagination,
    loadingShipment,
    loadingEvents,
    loadingSubmit,
  } = shipmentStore;

  const [assignForm, setAssignForm] = useState(emptyShipmentAssignForm());
  const [carrierOption, setCarrierOption] = useState(null);
  const [editingShipment, setEditingShipment] = useState(false);
  const [eventsParams, setEventsParams] = useState(
    getInitialSortingParams({ page: 1, limit: 20, orderBy: "", ascending: "desc" }),
  );
  const [eventModal, setEventModal] = useState({ show: false, mode: "create", eventId: null });
  const [eventForm, setEventForm] = useState(emptyTrackingEventForm());
  const [deleteEventTarget, setDeleteEventTarget] = useState(null);
  const [deleteEventForm, setDeleteEventForm] = useState({
    confirmationText: "",
    deleteReason: "",
  });
  const [duplicateStatusConfirmOpen, setDuplicateStatusConfirmOpen] = useState(false);

  const canManage = canManageOrderShipment(currentOrder);
  const hasShipment = Boolean(shipment?.id);

  const carrierTrackingHref = useMemo(
    () =>
      buildCarrierTrackingLink(shipment?.carrierTrackingUrl, shipment?.trackingNumber),
    [shipment?.carrierTrackingUrl, shipment?.trackingNumber],
  );
  const usedTrackingStatuses = useMemo(
    () => new Set((trackingEvents || []).map((event) => event?.status).filter(Boolean)),
    [trackingEvents],
  );
  const excludedTrackingStatuses = useMemo(
    () =>
      Array.from(usedTrackingStatuses).filter(
        (status) =>
          status !== eventForm.status && !REPEATABLE_TRACKING_STATUSES.has(status),
      ),
    [eventForm.status, usedTrackingStatuses],
  );

  useEffect(() => {
    getOrderByOrderNo(orderNo);
    getShipment(orderNo);
    return () => {
      orderDetailClear();
      shipmentClear();
    };
  }, [getOrderByOrderNo, getShipment, orderDetailClear, orderNo, shipmentClear]);

  useEffect(() => {
    if (!hasShipment) {
      return;
    }
    getTrackingEvents(orderNo, {
      page: eventsParams.page,
      limit: eventsParams.limit,
    });
  }, [
    eventsParams.page,
    eventsParams.limit,
    getTrackingEvents,
    hasShipment,
    orderNo,
  ]);

  useEffect(() => {
    if (!shipment) {
      setAssignForm(emptyShipmentAssignForm());
      setCarrierOption(null);
      return;
    }
    setAssignForm(shipmentToAssignForm(shipment));
    setCarrierOption({
      value: shipment.carrierId,
      label: shipment.carrierName,
    });
  }, [shipment]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Dashboard", link: "/admin/dashboard" },
      { label: "Orders", link: "/admin/orders" },
      {
        label: currentOrder?.orderNo || orderNo,
        link: `/admin/orders/${encodeURIComponent(currentOrder?.orderNo || orderNo)}`,
      },
      { label: "Manage tracking" },
    ],
    [currentOrder?.orderNo, orderNo],
  );

  const openCreateEventModal = () => {
    setEventForm(emptyTrackingEventForm());
    setEventModal({ show: true, mode: "create", eventId: null });
  };

  const openEditEventModal = (event) => {
    setEventForm(trackingEventToForm(event));
    setEventModal({ show: true, mode: "edit", eventId: event.id });
  };

  const closeEventModal = () => {
    if (!loadingSubmit) {
      setEventModal({ show: false, mode: "create", eventId: null });
      setDuplicateStatusConfirmOpen(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      fulfillmentMode: assignForm.fulfillmentMode,
      carrierId: assignForm.carrierId,
      trackingNumber: assignForm.trackingNumber.trim(),
    };
    if (assignForm.estimatedDeliveryDate) {
      payload.estimatedDeliveryDate = new Date(
        `${assignForm.estimatedDeliveryDate}T00:00:00.000Z`,
      ).toISOString();
    }

    const result = hasShipment && editingShipment
      ? await updateShipment(orderNo, payload)
      : await createShipment(orderNo, payload);

    if (result?.status) {
      setEditingShipment(false);
      if (!hasShipment) {
        await getTrackingEvents(orderNo, {
          page: eventsParams.page,
          limit: eventsParams.limit,
        });
      }
    }
  };

  const submitTrackingEvent = async () => {
    const payload = {
      status: eventForm.status,
      message: eventForm.message.trim(),
      location: eventForm.location.trim(),
      note: eventForm.note.trim(),
      eventAt: eventAtInputToIso(eventForm.eventAt),
    };

    const result =
      eventModal.mode === "edit" && eventModal.eventId
        ? await updateTrackingEvent(orderNo, eventModal.eventId, payload)
        : await createTrackingEvent(orderNo, payload);

    if (result?.status) {
      setDuplicateStatusConfirmOpen(false);
      closeEventModal();
      await getTrackingEvents(orderNo, {
        page: eventsParams.page,
        limit: eventsParams.limit,
      });
    }
  };

  const handleEventSubmit = async () => {
    const isCreateMode = eventModal.mode !== "edit";
    const isDuplicateStatus = usedTrackingStatuses.has(eventForm.status);
    if (isCreateMode && isDuplicateStatus) {
      setDuplicateStatusConfirmOpen(true);
      return;
    }
    await submitTrackingEvent();
  };

  const handleConfirmDuplicateStatus = async () => {
    await submitTrackingEvent();
  };

  const handleConfirmDeleteEvent = async () => {
    if (!deleteEventTarget?.id) {
      return;
    }
    const confirmationText = deleteEventForm.confirmationText.trim();
    const deleteReason = deleteEventForm.deleteReason.trim();
    if (confirmationText !== DELETE_CONFIRMATION_TEXT || !deleteReason) {
      return;
    }
    const result = await deleteTrackingEvent(orderNo, deleteEventTarget.id, {
      transactionConfirmed: true,
      confirmationText,
      deleteReason,
    });
    if (result?.status) {
      setDeleteEventTarget(null);
      setDeleteEventForm({ confirmationText: "", deleteReason: "" });
      await getTrackingEvents(orderNo, {
        page: eventsParams.page,
        limit: eventsParams.limit,
      });
    }
  };

  if (loadingDetail && !currentOrder) {
    return <BouncingLoader minHeight="360px" />;
  }

  if (!currentOrder) {
    return (
      <Container className="admin-order-manage">
        <AppBreadCrumb breadcrumbs={breadcrumbs} />
        <Card className="common-panel-card">
          <Card.Body className="text-center py-5">
            <p className="mb-3">Order not found.</p>
            <Link to="/admin/orders" className="btn btn--outline">
              Back to orders
            </Link>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="admin-order-manage">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />

      <Card className="common-panel-card mb-3">
        <Card.Header className="admin-order-detail__header">
          <div className="admin-order-detail__header-main">
            <Card.Title as="h5" className="mb-1">
              Manage tracking — {currentOrder.orderNo}
            </Card.Title>
            <small className="admin-order-detail__meta">
              Order status:{" "}
              <span
                className={`badge admin-order-status admin-order-status--${currentOrder.status}`}
              >
                {label(currentOrder.status)}
              </span>
            </small>
          </div>
          <div className="admin-order-detail__header-actions">
            <Link
              to={`/admin/orders/${encodeURIComponent(currentOrder.orderNo)}`}
              className="btn btn--outline btn-sm"
            >
              View order
            </Link>
          </div>
        </Card.Header>
        {!canManage ? (
          <Card.Body>
            <p className="admin-order-manage__notice mb-0">
              Shipment and tracking cannot be changed for a cancelled order.
            </p>
          </Card.Body>
        ) : null}
      </Card>

      <Card className="common-panel-card mb-3">
        <Card.Header className="admin-order-shipment__section-head">
          <Card.Title as="h6" className="mb-0">
            Shipment
          </Card.Title>
          {hasShipment && !editingShipment ? (
            <Button
              type="button"
              className="btn btn--outline btn-sm"
              onClick={() => setEditingShipment(true)}
              disabled={!canManage || loadingSubmit}
            >
              Edit shipment
            </Button>
          ) : null}
        </Card.Header>
        <Card.Body>
          {loadingShipment && !shipment ? (
            <BouncingLoader minHeight="120px" />
          ) : hasShipment && !editingShipment ? (
            <article className="order-detail-sheet admin-order-shipment__summary">
              <div className="order-detail-sheet__body">
              <div className="admin-order-shipment__facts">
              <div className="admin-order-shipment__meta">
                {shipment.carrierName ? (
                  <div className="admin-order-shipment__group">
                    <span className="order-detail-sheet__strip-label">Carrier</span>
                    <span className="admin-order-shipment__inline-value">
                      {shipment.carrierName}
                    </span>
                    {carrierTrackingHref ? (
                      <button
                        type="button"
                        className="admin-order-shipment__icon-btn"
                        onClick={() =>
                          openCarrierTracking(
                            shipment.carrierTrackingUrl,
                            shipment.trackingNumber,
                          )
                        }
                        aria-label={`Track on ${shipment.carrierName} website`}
                      >
                        <FaExternalLinkAlt aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {shipment.carrierName && shipment.trackingNumber ? (
                  <span className="admin-order-shipment__sep" aria-hidden>
                    ·
                  </span>
                ) : null}

                {shipment.trackingNumber ? (
                  <div className="admin-order-shipment__group">
                    <span className="order-detail-sheet__strip-label">Tracking</span>
                    <span className="admin-order-shipment__inline-value admin-order-shipment__awb">
                      {shipment.trackingNumber}
                    </span>
                    <span className="admin-order-shipment__copy">
                      <CopyIcon
                        textToCopy={shipment.trackingNumber}
                        iconSize={16}
                        className="copy-action"
                      />
                    </span>
                  </div>
                ) : null}

                {shipment.trackingNumber && shipment.currentStatus ? (
                  <span className="admin-order-shipment__sep" aria-hidden>
                    ·
                  </span>
                ) : null}

                {shipment.currentStatus ? (
                  <div className="admin-order-shipment__group">
                    <span className="order-detail-sheet__strip-label">Status</span>
                    <span
                      className={`badge admin-order-status admin-order-status--${shipment.currentStatus}`}
                    >
                      {label(shipment.currentStatus)}
                    </span>
                  </div>
                ) : null}
              </div>

              {shipment.latestStepMessage || shipment.estimatedDeliveryDate ? (
                <div className="admin-order-shipment__meta admin-order-shipment__meta--secondary">
                  {shipment.latestStepMessage ? (
                    <div className="admin-order-shipment__group admin-order-shipment__group--wide">
                      <span className="order-detail-sheet__strip-label">Latest</span>
                      <span className="admin-order-shipment__detail-text">
                        {shipment.latestStepMessage}
                        {shipment.latestStepLocation
                          ? ` · ${shipment.latestStepLocation}`
                          : ""}
                        {shipment.latestStepAt
                          ? ` · ${formatTrackingDateTime(shipment.latestStepAt)}`
                          : ""}
                      </span>
                    </div>
                  ) : null}

                  {shipment.latestStepMessage && shipment.estimatedDeliveryDate ? (
                    <span className="admin-order-shipment__sep" aria-hidden>
                      ·
                    </span>
                  ) : null}

                  {shipment.estimatedDeliveryDate ? (
                    <div className="admin-order-shipment__group">
                      <span className="order-detail-sheet__strip-label">Est. delivery</span>
                      <span className="admin-order-shipment__detail-text">
                        {formatTrackingDateTime(shipment.estimatedDeliveryDate)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>
              <div className="admin-order-shipment__tracking">
                <OrderTrackingPreview
                  orderStatus={currentOrder.status}
                  orderCreatedAt={currentOrder.createdAt}
                  shipment={shipment}
                  events={trackingEvents}
                />
              </div>
              </div>
            </article>
          ) : (
            <form onSubmit={handleAssignSubmit}>
              <OrderShipmentAssignForm
                form={assignForm}
                onChange={setAssignForm}
                carrierValue={carrierOption}
                onCarrierChange={setCarrierOption}
                disabled={!canManage || loadingSubmit}
              />
              <div className="d-flex flex-wrap gap-2 mt-3">
                <Button
                  type="submit"
                  className="btn btn--theme"
                  disabled={!canManage || loadingSubmit}
                >
                  {loadingSubmit
                    ? "Saving…"
                    : hasShipment
                      ? "Update shipment"
                      : "Assign shipment"}
                </Button>
                {hasShipment && editingShipment ? (
                  <Button
                    type="button"
                    className="btn btn--outline"
                    disabled={loadingSubmit}
                    onClick={() => {
                      setEditingShipment(false);
                      setAssignForm(shipmentToAssignForm(shipment));
                      setCarrierOption({
                        value: shipment.carrierId,
                        label: shipment.carrierName,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </Card.Body>
      </Card>

      <Card className="common-panel-card">
        <Card.Header className="admin-order-shipment__section-head">
          <Card.Title as="h6" className="mb-0">
            Tracking events
          </Card.Title>
          {hasShipment ? (
            <Button
              type="button"
              className="btn btn--theme btn-sm"
              onClick={openCreateEventModal}
              disabled={!canManage || loadingSubmit}
            >
              Add event
            </Button>
          ) : null}
        </Card.Header>
        <Card.Body>
          {!hasShipment ? (
            <p className="admin-order-manage__notice mb-0">
              Assign a shipment before adding tracking events.
            </p>
          ) : (
            <OrderShipmentEventsList
              events={trackingEvents}
              pagination={eventsPagination}
              params={eventsParams}
              setParams={setEventsParams}
              loading={loadingEvents}
              disabled={!canManage || loadingSubmit}
              onEdit={openEditEventModal}
              onDelete={setDeleteEventTarget}
            />
          )}
        </Card.Body>
      </Card>

      <AdvancedModal
        show={eventModal.show}
        onHide={closeEventModal}
        title={eventModal.mode === "edit" ? "Edit tracking event" : "Add tracking event"}
        size="lg"
        closeButton
        bodyClassName="common-modal-body--start"
        actions={[
          {
            label: "Cancel",
            onClick: closeEventModal,
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Saving…" : "Save event",
            onClick: handleEventSubmit,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <OrderShipmentEventForm
          form={eventForm}
          onChange={setEventForm}
          disabled={loadingSubmit}
          excludedStatuses={excludedTrackingStatuses}
          forceIncludeStatuses={[eventForm.status]}
        />
      </AdvancedModal>

      <AdvancedModal
        show={duplicateStatusConfirmOpen}
        onHide={() => {
          if (!loadingSubmit) {
            setDuplicateStatusConfirmOpen(false);
          }
        }}
        title="Duplicate tracking status"
        size="sm"
        closeButton
        actions={[
          {
            label: "Cancel",
            onClick: () => setDuplicateStatusConfirmOpen(false),
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Saving…" : "Create anyway",
            onClick: handleConfirmDuplicateStatus,
            className: "btn btn--theme",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <p className="mb-0">
          <strong>{label(eventForm.status)}</strong> status already has an event.
          Create one more event with the same status?
        </p>
      </AdvancedModal>

      <AdvancedModal
        show={Boolean(deleteEventTarget)}
        onHide={() => {
          if (!loadingSubmit) {
            setDeleteEventTarget(null);
            setDeleteEventForm({ confirmationText: "", deleteReason: "" });
          }
        }}
        title="Delete tracking event"
        size="md"
        actions={[
          {
            label: "Keep event",
            onClick: () => {
              setDeleteEventTarget(null);
              setDeleteEventForm({ confirmationText: "", deleteReason: "" });
            },
            className: "btn btn--outline",
            colSize: 5,
            disabled: loadingSubmit,
          },
          {
            label: loadingSubmit ? "Deleting…" : "Delete",
            onClick: handleConfirmDeleteEvent,
            className: "btn btn--danger",
            colSize: 7,
            disabled:
              loadingSubmit ||
              deleteEventForm.confirmationText.trim() !== DELETE_CONFIRMATION_TEXT ||
              !deleteEventForm.deleteReason.trim(),
          },
        ]}
      >
        <p className="mb-3">
          This is a hard delete. Type <code>{DELETE_CONFIRMATION_TEXT}</code> and provide
          a reason to confirm.
        </p>
        <Form.Group className="mb-3">
          <Form.Label className="form-sub-label">Confirmation text</Form.Label>
          <Form.Control
            type="text"
            value={deleteEventForm.confirmationText}
            onChange={(e) =>
              setDeleteEventForm((prev) => ({
                ...prev,
                confirmationText: e.target.value,
              }))
            }
            placeholder={DELETE_CONFIRMATION_TEXT}
            disabled={loadingSubmit}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label className="form-sub-label">Delete reason (audit)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={deleteEventForm.deleteReason}
            onChange={(e) =>
              setDeleteEventForm((prev) => ({
                ...prev,
                deleteReason: e.target.value,
              }))
            }
            maxLength={300}
            placeholder="Why are you deleting this tracking event?"
            disabled={loadingSubmit}
          />
        </Form.Group>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  orderStore: state.orders,
  shipmentStore: state.orderShipment,
});

export default connect(mapStateToProps, {
  getOrderByOrderNo,
  orderDetailClear,
  getShipment,
  getTrackingEvents,
  createShipment,
  updateShipment,
  createTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
  shipmentClear,
})(OrderManage);
