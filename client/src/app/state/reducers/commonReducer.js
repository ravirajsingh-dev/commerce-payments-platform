import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  commonSettings: {
    name: "",
    abbreviation: "",
    contactUs: "",
    email: "",
    address: "",
    socialMedia: {
      instagram: "",
      facebook: "",
      youtube: "",
      zoomMeeting: "",
    },
    aboutUs: {
      title: "",
      intro: "",
      sections: [],
    },
    contactUsPage: {
      title: "",
      intro: "",
      phone: "",
      secondaryPhone: "",
      email: "",
      address: "",
      businessHours: "",
    },
  },
  loadingCommonSettings: false,
};

const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    commonSettingsUpdated(state, action) {
      return {
        ...state,
        commonSettings: action.payload,
        loadingCommonSettings: false,
      };
    },

    loadingCommonSettings(state) {
      return {
        ...state,
        loadingCommonSettings: true,
      };
    },
  },
});

export const { commonSettingsUpdated, loadingCommonSettings } =
  commonSlice.actions;
export default commonSlice.reducer;
