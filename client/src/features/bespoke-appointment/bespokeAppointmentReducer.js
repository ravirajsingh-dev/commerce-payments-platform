import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  content: null,
  loadingContent: false,
  submitting: false,
  submitSuccess: false,
  error: {},
};

const slice = createSlice({
  name: "bespokeAppointment",
  initialState,
  reducers: {
    loadingContent: (s) => {
      s.loadingContent = true;
    },
    contentFetched: (s, a) => {
      s.content = a.payload;
      s.loadingContent = false;
    },
    contentError: (s) => {
      s.loadingContent = false;
    },
    submitting: (s) => {
      s.submitting = true;
      s.submitSuccess = false;
    },
    submitSuccess: (s) => {
      s.submitting = false;
      s.submitSuccess = true;
    },
    submitError: (s) => {
      s.submitting = false;
    },
    resetSubmit: (s) => {
      s.submitSuccess = false;
    },
  },
});

export const {
  loadingContent,
  contentFetched,
  contentError,
  submitting,
  submitSuccess,
  submitError,
  resetSubmit,
} = slice.actions;

export default slice.reducer;
