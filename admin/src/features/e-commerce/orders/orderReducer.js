import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orders: [],
  totalRecord: 0,
  summary: {},
  pendingCancelRequestCount: 0,
  pendingClaimCount: 0,
  currentOrder: null,
  loadingList: false,
  loadingDetail: false,
  loadingSubmit: false,
  error: {},
};

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    loadingOrderList(state) {
      return { ...state, loadingList: true };
    },
    ordersFetched(state, action) {
      return {
        ...state,
        orders: action.payload.orders || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        pendingCancelRequestCount: action.payload.pendingCancelRequestCount ?? 0,
        pendingClaimCount: action.payload.pendingClaimCount ?? 0,
        loadingList: false,
      };
    },
    ordersError(state, action) {
      return {
        ...state,
        loadingList: false,
        error: action.payload || {},
      };
    },
    loadingOrderDetail(state) {
      return { ...state, loadingDetail: true, currentOrder: null };
    },
    orderDetailFetched(state, action) {
      return {
        ...state,
        currentOrder: action.payload,
        loadingDetail: false,
      };
    },
    orderDetailError(state) {
      return { ...state, loadingDetail: false, currentOrder: null };
    },
    orderDetailClear(state) {
      return { ...state, currentOrder: null, loadingDetail: false };
    },
    loadingOrderSubmit(state) {
      return { ...state, loadingSubmit: true };
    },
    orderSubmitDone(state, action) {
      return {
        ...state,
        loadingSubmit: false,
        currentOrder: action.payload || state.currentOrder,
      };
    },
  },
});

export const {
  loadingOrderList,
  ordersFetched,
  ordersError,
  loadingOrderDetail,
  orderDetailFetched,
  orderDetailError,
  orderDetailClear,
  loadingOrderSubmit,
  orderSubmitDone,
} = orderSlice.actions;

export default orderSlice.reducer;
