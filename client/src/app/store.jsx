import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@src/app/state/reducers/index";

const store = configureStore({
  reducer: rootReducer,
});

export default store;
