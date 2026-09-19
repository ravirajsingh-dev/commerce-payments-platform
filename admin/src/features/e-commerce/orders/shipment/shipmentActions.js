import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import { getOrderByOrderNo } from "../orderActions";
import {
  loadingShipment,
  shipmentFetched,
  shipmentError,
  loadingTrackingEvents,
  trackingEventsFetched,
  trackingEventsError,
  loadingShipmentSubmit,
  shipmentSubmitDone,
  shipmentClear,
} from "./shipmentReducer";

const encodeOrderNo = (orderNo) => encodeURIComponent(String(orderNo || "").trim());

const shipmentBasePath = (orderNo) => `/api/admin/orders/${encodeOrderNo(orderNo)}/shipment`;

const handleFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  const errors = err.response?.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(err.response?.data?.message || fallbackMessage, "danger"));
};

const refreshOrderDetail = async (dispatch, orderNo) => {
  await dispatch(getOrderByOrderNo(orderNo));
};

export const getShipment = (orderNo) => async (dispatch) => {
  try {
    dispatch(loadingShipment());
    const res = await api.get(shipmentBasePath(orderNo), { allowDuplicates: true });

    if (res.data?.status) {
      dispatch(shipmentFetched(res.data.response?.shipment ?? null));
      return { status: true, data: res.data.response?.shipment ?? null };
    }

    dispatch(shipmentError());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch shipment."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(shipmentError());
    handleFailure(dispatch, err, "Failed to fetch shipment.");
    return { status: false };
  }
};

export const getTrackingEvents = (orderNo, params = {}) => async (dispatch) => {
  try {
    dispatch(loadingTrackingEvents());
    const res = await api.get(`${shipmentBasePath(orderNo)}/events`, {
      params,
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const payload = res.data.response || {};
      dispatch(
        trackingEventsFetched({
          events: payload.events || [],
          pagination: payload.pagination || {},
        }),
      );
      return { status: true, data: payload };
    }

    dispatch(trackingEventsError());
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to fetch tracking events."), "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(trackingEventsError());
    handleFailure(dispatch, err, "Failed to fetch tracking events.");
    return { status: false };
  }
};

export const createShipment = (orderNo, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingShipmentSubmit());
  try {
    const res = await api.post(shipmentBasePath(orderNo), payload);

    if (res.data?.status) {
      const shipment = res.data.response?.shipment;
      dispatch(shipmentSubmitDone({ shipment }));
      dispatch(setAlert(res.data.message || "Shipment assigned.", "success"));
      await refreshOrderDetail(dispatch, orderNo);
      return { status: true, data: shipment };
    }

    dispatch(shipmentSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to assign shipment."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(shipmentSubmitDone());
    handleFailure(dispatch, err, "Failed to assign shipment.");
    return { status: false };
  }
};

export const updateShipment = (orderNo, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingShipmentSubmit());
  try {
    const res = await api.put(shipmentBasePath(orderNo), payload);

    if (res.data?.status) {
      const shipment = res.data.response?.shipment;
      dispatch(shipmentSubmitDone({ shipment }));
      dispatch(setAlert(res.data.message || "Shipment updated.", "success"));
      await refreshOrderDetail(dispatch, orderNo);
      return { status: true, data: shipment };
    }

    dispatch(shipmentSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update shipment."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(shipmentSubmitDone());
    handleFailure(dispatch, err, "Failed to update shipment.");
    return { status: false };
  }
};

export const createTrackingEvent = (orderNo, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingShipmentSubmit());
  try {
    const res = await api.post(`${shipmentBasePath(orderNo)}/events`, payload);

    if (res.data?.status) {
      const { event, shipment } = res.data.response || {};
      dispatch(shipmentSubmitDone({ shipment }));
      dispatch(setAlert(res.data.message || "Tracking event created.", "success"));
      await refreshOrderDetail(dispatch, orderNo);
      return { status: true, data: { event, shipment } };
    }

    dispatch(shipmentSubmitDone());
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to create tracking event."), "danger"),
    );
    return { status: false };
  } catch (err) {
    dispatch(shipmentSubmitDone());
    handleFailure(dispatch, err, "Failed to create tracking event.");
    return { status: false };
  }
};

export const updateTrackingEvent = (orderNo, eventId, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingShipmentSubmit());
  try {
    const res = await api.put(
      `${shipmentBasePath(orderNo)}/events/${encodeURIComponent(eventId)}`,
      payload,
    );

    if (res.data?.status) {
      const { event, shipment } = res.data.response || {};
      dispatch(shipmentSubmitDone({ shipment }));
      dispatch(setAlert(res.data.message || "Tracking event updated.", "success"));
      await refreshOrderDetail(dispatch, orderNo);
      return { status: true, data: { event, shipment } };
    }

    dispatch(shipmentSubmitDone());
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to update tracking event."), "danger"),
    );
    return { status: false };
  } catch (err) {
    dispatch(shipmentSubmitDone());
    handleFailure(dispatch, err, "Failed to update tracking event.");
    return { status: false };
  }
};

export const deleteTrackingEvent = (orderNo, eventId, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingShipmentSubmit());
  try {
    const res = await api.delete(
      `${shipmentBasePath(orderNo)}/events/${encodeURIComponent(eventId)}`,
      { data: payload },
    );

    if (res.data?.status) {
      const shipment = res.data.response?.shipment;
      dispatch(shipmentSubmitDone({ shipment }));
      dispatch(setAlert(res.data.message || "Tracking event deleted.", "success"));
      await refreshOrderDetail(dispatch, orderNo);
      return { status: true, data: shipment };
    }

    dispatch(shipmentSubmitDone());
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to delete tracking event."), "danger"),
    );
    return { status: false };
  } catch (err) {
    dispatch(shipmentSubmitDone());
    handleFailure(dispatch, err, "Failed to delete tracking event.");
    return { status: false };
  }
};

export { shipmentClear };
