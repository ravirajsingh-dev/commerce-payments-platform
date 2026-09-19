import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";
import auth from "@src/features/auth/authReducer";
import common from "./commonReducer";
import users from "@src/features/users/userReducer";
import category from "@src/features/e-commerce/catalog/category/categoryReducer";
import attributeSet from "@src/features/e-commerce/catalog/attribute-set/attributeSetReducer";
import attribute from "@src/features/e-commerce/catalog/attribute/attributeReducer";
import product from "@src/features/e-commerce/catalog/product/productReducer";
import productVariant from "@src/features/e-commerce/catalog/product-variant/productVariantReducer";
import storeNavSection from "@src/features/e-commerce/catalog/store-navigation/storeNavSectionReducer";
import orders from "@src/features/e-commerce/orders/orderReducer";
import orderShipment from "@src/features/e-commerce/orders/shipment/shipmentReducer";
import coupons from "@src/features/e-commerce/coupons/couponReducer";
import carriers from "@src/features/e-commerce/carriers/carrierReducer";
import reviews from "@src/features/e-commerce/reviews/reviewReducer";
import salesDashboard from "@src/features/e-commerce/analytics/salesDashboardReducer";
import {
  clienteleReducer,
  homeSliderReducer,
  showcaseReducer,
  signatureStyleReducer,
} from "@src/features/homepage";
import { bespokeAppointmentReducer } from "@src/features/bespoke-appointment";

const rootReducer = combineReducers({
  errors,
  alert,
  auth,
  common,
  users,
  category,
  attributeSet,
  attribute,
  product,
  productVariant,
  storeNavSection,
  orders,
  orderShipment,
  coupons,
  carriers,
  reviews,
  salesDashboard,
  homeSlider: homeSliderReducer,
  showcase: showcaseReducer,
  signatureStyle: signatureStyleReducer,
  clientele: clienteleReducer,
  bespokeAppointment: bespokeAppointmentReducer,
});

export default rootReducer;
