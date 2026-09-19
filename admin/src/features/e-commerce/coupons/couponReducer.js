import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  coupons: [],
  totalRecord: 0,
  summary: { active: 0, inactive: 0 },
  couponDetail: null,
  loadingList: false,
  loadingDetail: false,
  loadingSubmit: false,
  error: {},
};

const couponSlice = createSlice({
  name: "coupons",
  initialState,
  reducers: {
    loadingCouponList(state) {
      state.loadingList = true;
    },
    couponsFetched(state, action) {
      return {
        ...state,
        coupons: action.payload.coupons || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    couponsError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingCouponDetail(state) {
      state.loadingDetail = true;
    },
    couponDetailFetched(state, action) {
      return {
        ...state,
        couponDetail: action.payload,
        loadingDetail: false,
      };
    },
    couponDetailClear(state) {
      state.couponDetail = null;
      state.loadingDetail = false;
    },
    loadingCouponSubmit(state) {
      state.loadingSubmit = true;
    },
    couponSubmitDone(state) {
      state.loadingSubmit = false;
    },
  },
});

export const {
  loadingCouponList,
  couponsFetched,
  couponsError,
  loadingCouponDetail,
  couponDetailFetched,
  couponDetailClear,
  loadingCouponSubmit,
  couponSubmitDone,
} = couponSlice.actions;

export default couponSlice.reducer;
