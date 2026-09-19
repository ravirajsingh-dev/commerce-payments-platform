import { createSlice } from "@reduxjs/toolkit";
const initialState = { items: [], loadingList: false, loadingSubmit: false, error: {} };
const slice = createSlice({
  name: "signatureStyle",
  initialState,
  reducers: {
    loadingList: (s) => { s.loadingList = true; },
    listFetched: (s, a) => { s.items = a.payload || []; s.loadingList = false; },
    listError: (s, a) => { s.loadingList = false; s.loadingSubmit = false; s.error = a.payload || {}; },
    loadingSubmit: (s) => { s.loadingSubmit = true; },
    submitDone: (s) => { s.loadingSubmit = false; },
  },
});
export const { loadingList, listFetched, listError, loadingSubmit, submitDone } = slice.actions;
export default slice.reducer;
