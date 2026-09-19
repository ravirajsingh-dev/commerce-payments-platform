import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  attributeList: [],
  attributes: [],
  totalRecord: 0,
  summary: {
    active: 0,
    inactive: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const attributeSlice = createSlice({
  name: "attribute",
  initialState,
  reducers: {
    loadingAttributeList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    attributeFetched(state, action) {
      return {
        ...state,
        attributeList: action.payload.attributes || [],
        attributes: action.payload.attributes || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    attributeError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingAttributeSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    attributeSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingAttributeList,
  attributeFetched,
  attributeError,
  loadingAttributeSubmit,
  attributeSubmitDone,
} = attributeSlice.actions;

export default attributeSlice.reducer;
