import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const slice = createSlice({
  name: "homeSlider",
  initialState,
  reducers: {
    loadingList(state) {
      state.loadingList = true;
    },
    listFetched(state, action) {
      state.items = action.payload || [];
      state.loadingList = false;
    },
    listError(state, action) {
      state.loadingList = false;
      state.loadingSubmit = false;
      state.error = action.payload || {};
    },
    loadingSubmit(state) {
      state.loadingSubmit = true;
    },
    submitDone(state) {
      state.loadingSubmit = false;
    },
  },
});

export const { loadingList, listFetched, listError, loadingSubmit, submitDone } =
  slice.actions;
export default slice.reducer;
