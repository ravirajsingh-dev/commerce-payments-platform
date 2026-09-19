import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  productList: [],
  products: [],
  totalRecord: 0,
  summary: {
    active: 0,
    draft: 0,
    inactive: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    loadingProductList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    productFetched(state, action) {
      return {
        ...state,
        productList: action.payload.products || [],
        products: action.payload.products || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    productError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingProductSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    productSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingProductList,
  productFetched,
  productError,
  loadingProductSubmit,
  productSubmitDone,
} = productSlice.actions;

export default productSlice.reducer;
