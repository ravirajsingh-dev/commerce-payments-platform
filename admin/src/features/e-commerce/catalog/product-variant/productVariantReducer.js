import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  variantList: [],
  productVariants: [],
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

const productVariantSlice = createSlice({
  name: "productVariant",
  initialState,
  reducers: {
    loadingProductVariantList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    productVariantFetched(state, action) {
      return {
        ...state,
        variantList: action.payload.productVariants || [],
        productVariants: action.payload.productVariants || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    productVariantError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingProductVariantSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    productVariantSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingProductVariantList,
  productVariantFetched,
  productVariantError,
  loadingProductVariantSubmit,
  productVariantSubmitDone,
} = productVariantSlice.actions;

export default productVariantSlice.reducer;
