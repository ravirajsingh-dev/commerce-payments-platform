import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  users: [],
  totalRecord: 0,
  summary: {
    active: 0,
    inactive: 0,
    newUsers: 0,
    blocked: 0,
  },
  loadingList: false,
  loadingSubmit: false,
  error: {},
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    loadingUsersList(state) {
      return {
        ...state,
        loadingList: true,
      };
    },
    usersFetched(state, action) {
      return {
        ...state,
        users: action.payload.users || [],
        totalRecord: action.payload.totalRecord || 0,
        summary: action.payload.summary || initialState.summary,
        loadingList: false,
      };
    },
    usersError(state, action) {
      return {
        ...state,
        loadingList: false,
        loadingSubmit: false,
        error: action.payload || {},
      };
    },
    loadingUsersSubmit(state) {
      return {
        ...state,
        loadingSubmit: true,
      };
    },
    usersSubmitDone(state) {
      return {
        ...state,
        loadingSubmit: false,
      };
    },
  },
});

export const {
  loadingUsersList,
  usersFetched,
  usersError,
  loadingUsersSubmit,
  usersSubmitDone,
} = usersSlice.actions;

export default usersSlice.reducer;
