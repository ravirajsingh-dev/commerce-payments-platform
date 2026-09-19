import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dashboard: null,
  loading: false,
};

const slice = createSlice({
  name: "salesDashboard",
  initialState,
  reducers: {
    salesDashboardLoading: (state) => {
      state.loading = true;
    },
    salesDashboardLoaded: (state, action) => {
      state.dashboard = action.payload;
      state.loading = false;
    },
    salesDashboardFailed: (state) => {
      state.loading = false;
    },
  },
});

export const {
  salesDashboardLoading,
  salesDashboardLoaded,
  salesDashboardFailed,
} = slice.actions;

export default slice.reducer;
