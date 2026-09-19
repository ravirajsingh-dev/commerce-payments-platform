import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { removeErrors } from "@src/app/state/reducers/errors";
import { setErrorsList } from "@src/app/state/actions/errors";
import {
  API_REQUEST_ALLOW_DUP,
  readJsonApiResponse,
} from "@src/shared/utils/apiResponseHelpers";
import {
  wishlistCleared,
  wishlistLoaded,
  wishlistLoadFailed,
  wishlistLoading,
  wishlistToggleFinished,
  wishlistToggling,
} from "./wishlistReducer";

const wishlistRequestConfig = API_REQUEST_ALLOW_DUP;

const readWishlistResponse = (res, emptyFallback = {}) =>
  readJsonApiResponse(res, "Wishlist request failed.", emptyFallback);

const getWishlist = async () => {
  const res = await api.get("/api/wishlist", wishlistRequestConfig);
  return readWishlistResponse(res);
};

const removeWishlistItemRequest = async (variantId) => {
  const res = await api.delete(
    `/api/wishlist/items/${encodeURIComponent(variantId)}`,
    wishlistRequestConfig,
  );
  return readWishlistResponse(res);
};

const toggleWishlistItemRequest = async (variantId) => {
  const res = await api.post(
    `/api/wishlist/items/${encodeURIComponent(variantId)}/toggle`,
    {},
    wishlistRequestConfig,
  );
  return readWishlistResponse(res);
};

const extractWishlist = (response) => response?.wishlist ?? null;

const mapApiErrors = (dispatch, errors = []) => {
  (errors || []).forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
};

export const fetchWishlist = () => async (dispatch) => {
  dispatch(wishlistLoading());
  try {
    const response = await getWishlist();
    dispatch(wishlistLoaded(extractWishlist(response)));
    return extractWishlist(response);
  } catch (err) {
    dispatch(wishlistLoadFailed());
    if (err?.status === 401) {
      dispatch(wishlistCleared());
      return null;
    }
    dispatch(setAlert(err.message || "Unable to load your wishlist.", "danger"));
    return null;
  }
};

export const clearWishlistState = () => (dispatch) => {
  dispatch(wishlistCleared());
};

export const removeFromWishlist = (variantId, options = {}) => async (dispatch) => {
  const { silent = false } = options;
  dispatch(removeErrors());
  try {
    const response = await removeWishlistItemRequest(variantId);
    const wishlist = extractWishlist(response);
    dispatch(wishlistLoaded(wishlist));
    if (!silent) {
      dispatch(setAlert("Removed from wishlist.", "success"));
    }
    return wishlist;
  } catch (err) {
    mapApiErrors(dispatch, err.errors);
    dispatch(setAlert(err.message || "Unable to remove from wishlist.", "danger"));
    return null;
  }
};

export const toggleWishlistItem = (variantId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(wishlistToggling(String(variantId)));
  try {
    const response = await toggleWishlistItemRequest(variantId);
    const wishlist = extractWishlist(response);
    dispatch(wishlistToggleFinished(wishlist));
    return wishlist;
  } catch (err) {
    dispatch(wishlistToggleFinished(null));
    mapApiErrors(dispatch, err.errors);
    dispatch(setAlert(err.message || "Unable to update wishlist.", "danger"));
    return null;
  }
};

export const selectIsInWishlist = (state, variantId) => {
  const items = state.wishlist?.wishlist?.items || [];
  return items.some((row) => String(row.variantId) === String(variantId));
};
