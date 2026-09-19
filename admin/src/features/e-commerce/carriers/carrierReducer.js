import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  carriers: [],
  totalRecord: 0,
  summary: {
    active: 0,
    inactive: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const carriersSlice = createSlice({
  name: "carriers",
  initialState,
  reducers: {
    loadingCarriersList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    carriersFetched(state, action) {
      return {
        ...state,
        carriers: action.payload.carriers || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    carriersError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingCarriersSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    carriersSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingCarriersList,
  carriersFetched,
  carriersError,
  loadingCarriersSubmit,
  carriersSubmitDone,
} = carriersSlice.actions;

export default carriersSlice.reducer;
