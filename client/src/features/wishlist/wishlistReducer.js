import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  wishlist: null,
  loading: false,
  togglingVariantId: null,
};

const slice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    wishlistLoading: (state) => {
      state.loading = true;
    },
    wishlistLoaded: (state, action) => {
      state.wishlist = action.payload;
      state.loading = false;
    },
    wishlistLoadFailed: (state) => {
      state.loading = false;
    },
    wishlistToggling: (state, action) => {
      state.togglingVariantId = action.payload;
    },
    wishlistToggleFinished: (state, action) => {
      state.togglingVariantId = null;
      if (action.payload) {
        state.wishlist = action.payload;
      }
    },
    wishlistCleared: (state) => {
      state.wishlist = null;
      state.loading = false;
      state.togglingVariantId = null;
    },
  },
});

export const {
  wishlistLoading,
  wishlistLoaded,
  wishlistLoadFailed,
  wishlistToggling,
  wishlistToggleFinished,
  wishlistCleared,
} = slice.actions;

export default slice.reducer;
