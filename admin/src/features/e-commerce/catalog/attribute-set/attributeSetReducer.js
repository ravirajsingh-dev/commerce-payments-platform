import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  attributeSetList: [],
  attributeSets: [],
  totalRecord: 0,
  summary: {
    active: 0,
    inactive: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const attributeSetSlice = createSlice({
  name: "attributeSet",
  initialState,
  reducers: {
    loadingAttributeSetList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    attributeSetFetched(state, action) {
      return {
        ...state,
        attributeSetList: action.payload.attributeSets || [],
        attributeSets: action.payload.attributeSets || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    attributeSetError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingAttributeSetSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    attributeSetSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingAttributeSetList,
  attributeSetFetched,
  attributeSetError,
  loadingAttributeSetSubmit,
  attributeSetSubmitDone,
} = attributeSetSlice.actions;

export default attributeSetSlice.reducer;
