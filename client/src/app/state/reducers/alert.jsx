import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const alertSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    setAlertMsg(state, action) {
      return [action.payload];
    },
    removeAlertMsg() {
      return [];
    },
  },
});

export const { setAlertMsg, removeAlertMsg } = alertSlice.actions;

export default alertSlice.reducer;
