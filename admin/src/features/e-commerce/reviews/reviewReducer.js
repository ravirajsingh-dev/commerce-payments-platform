import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  reviews: [],
  totalRecord: 0,
  summary: { pending: 0, approved: 0, rejected: 0 },
  loadingList: false,
  loadingSubmit: false,
};

const reviewSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    loadingReviewList(state) {
      state.loadingList = true;
    },
    reviewsFetched(state, action) {
      state.loadingList = false;
      state.reviews = action.payload.reviews || [];
      state.totalRecord = action.payload.totalRecord ?? 0;
      state.summary = action.payload.summary || initialState.summary;
    },
    reviewsError(state) {
      state.loadingList = false;
    },
    loadingReviewSubmit(state) {
      state.loadingSubmit = true;
    },
    reviewSubmitDone(state) {
      state.loadingSubmit = false;
    },
  },
});

export const {
  loadingReviewList,
  reviewsFetched,
  reviewsError,
  loadingReviewSubmit,
  reviewSubmitDone,
} = reviewSlice.actions;

export default reviewSlice.reducer;
