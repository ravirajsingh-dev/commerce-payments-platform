import { createSlice } from "@reduxjs/toolkit";

const listState = {
  items: [],
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const initialState = {
  settings: null,
  loadingSettings: false,
  options: listState,
  submissions: listState,
  selectedSubmission: null,
  loadingDetail: false,
};

const slice = createSlice({
  name: "bespokeAppointment",
  initialState,
  reducers: {
    loadingSettings: (s) => {
      s.loadingSettings = true;
    },
    settingsFetched: (s, a) => {
      s.settings = a.payload;
      s.loadingSettings = false;
    },
    settingsError: (s) => {
      s.loadingSettings = false;
    },
    settingsSubmitting: (s) => {
      s.loadingSettings = true;
    },
    settingsSaved: (s, a) => {
      s.settings = a.payload;
      s.loadingSettings = false;
    },
    optionsLoading: (s) => {
      s.options.loadingList = true;
    },
    optionsFetched: (s, a) => {
      s.options.items = a.payload || [];
      s.options.loadingList = false;
    },
    optionsSubmitting: (s) => {
      s.options.loadingSubmit = true;
    },
    optionsSubmitDone: (s) => {
      s.options.loadingSubmit = false;
    },
    submissionsLoading: (s) => {
      s.submissions.loadingList = true;
    },
    submissionsFetched: (s, a) => {
      s.submissions.items = a.payload || [];
      s.submissions.loadingList = false;
    },
    submissionsSubmitting: (s) => {
      s.submissions.loadingSubmit = true;
    },
    submissionsSubmitDone: (s) => {
      s.submissions.loadingSubmit = false;
    },
    submissionDetailLoading: (s) => {
      s.loadingDetail = true;
    },
    submissionDetailFetched: (s, a) => {
      s.selectedSubmission = a.payload;
      s.loadingDetail = false;
    },
    submissionDetailClear: (s) => {
      s.selectedSubmission = null;
    },
  },
});

export const {
  loadingSettings,
  settingsFetched,
  settingsError,
  settingsSubmitting,
  settingsSaved,
  optionsLoading,
  optionsFetched,
  optionsSubmitting,
  optionsSubmitDone,
  submissionsLoading,
  submissionsFetched,
  submissionsSubmitting,
  submissionsSubmitDone,
  submissionDetailLoading,
  submissionDetailFetched,
  submissionDetailClear,
} = slice.actions;

export default slice.reducer;
