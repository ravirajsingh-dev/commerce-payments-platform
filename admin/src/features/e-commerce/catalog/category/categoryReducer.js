import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  categoryList: [],
  categories: [],
  totalRecord: 0,
  summary: {
    active: 0,
    inactive: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    loadingCategoryList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    categoryFetched(state, action) {
      return {
        ...state,
        categoryList: action.payload.categories || [],
        categories: action.payload.categories || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    categoryError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingCategorySubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    categorySubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingCategoryList,
  categoryFetched,
  categoryError,
  loadingCategorySubmit,
  categorySubmitDone,
} = categorySlice.actions;

export default categorySlice.reducer;
