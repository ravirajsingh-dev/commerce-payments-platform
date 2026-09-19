import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  API_REQUEST_ALLOW_DUP,
  readJsonApiResponse,
} from "@src/shared/utils/apiResponseHelpers";
import {
  cartAddFinished,
  cartAdding,
  cartCleared,
  cartLoaded,
  cartLoadFailed,
  cartLoading,
  cartRemoveFinished,
  cartRemoving,
  cartUpdateFinished,
  cartUpdating,
  lineKey,
} from "./cartReducer";

const cartRequestConfig = API_REQUEST_ALLOW_DUP;

const isDuplicateCartRequest = (err) =>
  err?.message === "Duplicate request in progress";

const readCartResponse = (res, emptyFallback = {}) =>
  readJsonApiResponse(res, "Cart request failed.", emptyFallback);

const getCart = async () => {
  const res = await api.get("/api/cart", cartRequestConfig);
  return readCartResponse(res);
};

const addCartItemRequest = async (payload) => {
  const res = await api.post("/api/cart/items", payload, cartRequestConfig);
  return readCartResponse(res);
};

const updateCartItemRequest = async (payload) => {
  const res = await api.patch("/api/cart/items", payload, cartRequestConfig);
  return readCartResponse(res);
};

const removeCartItemRequest = async (variantId, size) => {
  const params = new URLSearchParams();
  if (size) params.set("size", size);
  const query = params.toString();
  const path = `/api/cart/items/${encodeURIComponent(variantId)}${query ? `?${query}` : ""}`;
  const res = await api.delete(path, cartRequestConfig);
  return readCartResponse(res);
};

const applyCartCouponRequest = async (code) => {
  const res = await api.post(
    "/api/cart/coupons/apply",
    { code },
    cartRequestConfig,
  );
  return readCartResponse(res);
};

const removeCartCouponRequest = async () => {
  const res = await api.delete("/api/cart/coupons", cartRequestConfig);
  return readCartResponse(res);
};

export const fetchAvailableCoupons = () => async () => {
  try {
    const res = await api.get("/api/cart/coupons/available", cartRequestConfig);
    const data = readJsonApiResponse(res, "Coupon request failed.");
    return { status: true, data };
  } catch (err) {
    if (isDuplicateCartRequest(err)) {
      return { status: false, data: null };
    }
    return {
      status: false,
      data: null,
      message: err.message || "Unable to load coupons.",
      errors: err.errors,
    };
  }
};

const mapApiErrors = (dispatch, errors = []) => {
  (errors || []).forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
};

const extractCart = (response) => response?.cart ?? null;

const persistGuestSession = (cart) => cart;

export const fetchCart = () => async (dispatch) => {
  dispatch(cartLoading());
  try {
    const response = await getCart();
    const cart = persistGuestSession(extractCart(response));
    dispatch(cartLoaded(cart));
    return cart;
  } catch (err) {
    dispatch(cartLoadFailed());
    if (isDuplicateCartRequest(err)) {
      return null;
    }
    if (err?.status === 401) {
      dispatch(cartCleared());
      return null;
    }
    dispatch(
      setAlert(err.message || "Unable to load your cart.", "danger"),
    );
    return null;
  }
};

export const clearCartState = () => (dispatch) => {
  dispatch(cartCleared());
};

export const addToCart =
  ({ variantId, size, qty = 1 }) =>
  async (dispatch) => {
    dispatch(removeErrors());
    dispatch(cartAdding());
    try {
      const response = await addCartItemRequest({
        variantId,
        ...(size ? { size } : {}),
        qty,
      });
      const cart = persistGuestSession(extractCart(response));
      dispatch(cartAddFinished(cart));
      dispatch(setAlert("Added to cart.", "success"));
      return cart;
    } catch (err) {
      dispatch(cartAddFinished(null));
      if (isDuplicateCartRequest(err)) {
        return null;
      }
      mapApiErrors(dispatch, err.errors);
      dispatch(
        setAlert(err.message || "Unable to add item to cart.", "danger"),
      );
      return null;
    }
  };

export const updateCartLineQuantity =
  ({ variantId, size, qty }) =>
  async (dispatch) => {
    dispatch(removeErrors());
    const key = lineKey(variantId, size);
    dispatch(cartUpdating(key));
    try {
      const response = await updateCartItemRequest({
        variantId,
        ...(size ? { size } : {}),
        qty,
      });
      const cart = persistGuestSession(extractCart(response));
      dispatch(cartUpdateFinished(cart));
      return cart;
    } catch (err) {
      dispatch(cartUpdateFinished(null));
      if (isDuplicateCartRequest(err)) {
        return null;
      }
      mapApiErrors(dispatch, err.errors);
      dispatch(
        setAlert(err.message || "Unable to update cart.", "danger"),
      );
      return null;
    }
  };

export const updateCartLineSize =
  ({ variantId, size, newSize, qty }) =>
  async (dispatch) => {
    dispatch(removeErrors());
    const key = lineKey(variantId, size);
    dispatch(cartUpdating(key));
    try {
      const response = await updateCartItemRequest({
        variantId,
        ...(size ? { size } : {}),
        newSize,
        qty,
      });
      const cart = persistGuestSession(extractCart(response));
      dispatch(cartUpdateFinished(cart));
      return cart;
    } catch (err) {
      dispatch(cartUpdateFinished(null));
      if (isDuplicateCartRequest(err)) {
        return null;
      }
      mapApiErrors(dispatch, err.errors);
      dispatch(
        setAlert(err.message || "Unable to update size.", "danger"),
      );
      return null;
    }
  };

export const applyCoupon =
  (code) =>
  async (dispatch) => {
    dispatch(removeErrors());
    dispatch(cartUpdating("coupon"));
    try {
      const response = await applyCartCouponRequest(code);
      const cart = persistGuestSession(extractCart(response));
      dispatch(cartUpdateFinished(cart));
      dispatch(setAlert("Coupon applied.", "success"));
      return cart;
    } catch (err) {
      dispatch(cartUpdateFinished(null));
      if (isDuplicateCartRequest(err)) {
        return null;
      }
      mapApiErrors(dispatch, err.errors);
      dispatch(setAlert(err.message || "Unable to apply coupon.", "danger"));
      return null;
    }
  };

export const removeCoupon = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(cartUpdating("coupon"));
  try {
    const response = await removeCartCouponRequest();
    const cart = persistGuestSession(extractCart(response));
    dispatch(cartUpdateFinished(cart));
    dispatch(setAlert("Coupon removed.", "success"));
    return cart;
  } catch (err) {
    dispatch(cartUpdateFinished(null));
    if (isDuplicateCartRequest(err)) {
      return null;
    }
    dispatch(setAlert(err.message || "Unable to remove coupon.", "danger"));
    return null;
  }
};

export const removeFromCart =
  ({ variantId, size }) =>
  async (dispatch) => {
    dispatch(removeErrors());
    const key = lineKey(variantId, size);
    dispatch(cartRemoving(key));
    try {
      const response = await removeCartItemRequest(variantId, size || undefined);
      const cart = persistGuestSession(extractCart(response));
      dispatch(cartRemoveFinished(cart));
      dispatch(setAlert("Item removed from cart.", "success"));
      return cart;
    } catch (err) {
      dispatch(cartRemoveFinished(null));
      if (isDuplicateCartRequest(err)) {
        return null;
      }
      dispatch(
        setAlert(err.message || "Unable to remove item.", "danger"),
      );
      return null;
    }
  };
