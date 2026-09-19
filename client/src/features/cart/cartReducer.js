import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cart: null,
  loading: false,
  adding: false,
  updatingKey: null,
  removingKey: null,
};

const lineKey = (variantId, size = "") => `${variantId}:${size || ""}`;

const slice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    cartLoading: (state) => {
      state.loading = true;
    },
    cartLoaded: (state, action) => {
      state.cart = action.payload;
      state.loading = false;
    },
    cartLoadFailed: (state) => {
      state.loading = false;
    },
    cartAdding: (state) => {
      state.adding = true;
    },
    cartAddFinished: (state, action) => {
      state.adding = false;
      if (action.payload) {
        state.cart = action.payload;
      }
    },
    cartUpdating: (state, action) => {
      state.updatingKey = action.payload;
    },
    cartUpdateFinished: (state, action) => {
      state.updatingKey = null;
      if (action.payload) {
        state.cart = action.payload;
      }
    },
    cartRemoving: (state, action) => {
      state.removingKey = action.payload;
    },
    cartRemoveFinished: (state, action) => {
      state.removingKey = null;
      if (action.payload) {
        state.cart = action.payload;
      }
    },
    cartCleared: (state) => {
      state.cart = null;
      state.loading = false;
      state.adding = false;
      state.updatingKey = null;
      state.removingKey = null;
    },
  },
});

export const {
  cartLoading,
  cartLoaded,
  cartLoadFailed,
  cartAdding,
  cartAddFinished,
  cartUpdating,
  cartUpdateFinished,
  cartRemoving,
  cartRemoveFinished,
  cartCleared,
} = slice.actions;

export { lineKey };
export default slice.reducer;
