import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sections: [],
  totalRecord: 0,
  summary: { active: 0, inactive: 0 },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const storeNavSectionSlice = createSlice({
  name: "storeNavSection",
  initialState,
  reducers: {
    loadingStoreNavSectionList(state) {
      state.loadingList = true;
    },
    storeNavSectionFetched(state, action) {
      return {
        ...state,
        sections: action.payload.sections || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    storeNavSectionError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingStoreNavSectionSubmit(state) {
      state.loadingSubmit = true;
    },
    storeNavSectionSubmitDone(state) {
      state.loadingSubmit = false;
    },
  },
});

export const {
  loadingStoreNavSectionList,
  storeNavSectionFetched,
  storeNavSectionError,
  loadingStoreNavSectionSubmit,
  storeNavSectionSubmitDone,
} = storeNavSectionSlice.actions;

export default storeNavSectionSlice.reducer;
