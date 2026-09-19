import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  shipment: null,
  trackingEvents: [],
  eventsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loadingShipment: false,
  loadingEvents: false,
  loadingSubmit: false,
  error: {},
};

const shipmentSlice = createSlice({
  name: "orderShipment",
  initialState,
  reducers: {
    loadingShipment(state) {
      return { ...state, loadingShipment: true };
    },
    shipmentFetched(state, action) {
      return {
        ...state,
        shipment: action.payload ?? null,
        loadingShipment: false,
      };
    },
    shipmentError(state) {
      return { ...state, loadingShipment: false };
    },
    loadingTrackingEvents(state) {
      return { ...state, loadingEvents: true };
    },
    trackingEventsFetched(state, action) {
      return {
        ...state,
        trackingEvents: action.payload.events || [],
        eventsPagination: action.payload.pagination || initialState.eventsPagination,
        loadingEvents: false,
      };
    },
    trackingEventsError(state) {
      return { ...state, loadingEvents: false };
    },
    loadingShipmentSubmit(state) {
      return { ...state, loadingSubmit: true };
    },
    shipmentSubmitDone(state, action) {
      return {
        ...state,
        loadingSubmit: false,
        shipment: action.payload?.shipment ?? state.shipment,
      };
    },
    shipmentClear() {
      return { ...initialState };
    },
  },
});

export const {
  loadingShipment,
  shipmentFetched,
  shipmentError,
  loadingTrackingEvents,
  trackingEventsFetched,
  trackingEventsError,
  loadingShipmentSubmit,
  shipmentSubmitDone,
  shipmentClear,
} = shipmentSlice.actions;

export default shipmentSlice.reducer;
