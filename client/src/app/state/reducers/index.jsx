import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";
import auth from "@src/features/auth/authReducer";
import common from "./commonReducer";
import bespokeAppointment from "@src/features/bespoke-appointment/bespokeAppointmentReducer";
import cart from "@src/features/cart/cartReducer";
import wishlist from "@src/features/wishlist/wishlistReducer";

const rootReducer = combineReducers({
  errors,
  alert,
  auth,
  common,
  bespokeAppointment,
  cart,
  wishlist,
});

export default rootReducer;
