import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingProductList,
  productFetched,
  productError,
  loadingProductSubmit,
  productSubmitDone,
} from "./productReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const json = { headers: { "Content-Type": "application/json" } };

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    draft: 0,
    inactive: 0,
  };

  return {
    products: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getProductList = (params) => async (dispatch) => {
  try {
    dispatch(loadingProductList());
    const res = await api.get("/api/admin/products/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(productFetched(payload));
      return { status: true, data: payload };
    } else {
      dispatch(
        productError({
          msg: res.data.message || "Failed to fetch products.",
        }),
      );
      dispatch(
        setAlert(getApiErrorMessage(res.data, "Failed to fetch products."), "danger"),
      );
      return { status: false, data: null };
    }
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;

    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }

    dispatch(
      productError({
        msg: err.response?.statusText || "Error fetching products.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch products."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

/** Fetch products for dropdowns without updating list reducer state. */
export const fetchProductsForSelect = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/products/list", {
      params: {
        page: 1,
        limit: 200,
        orderBy: "name",
        ascending: "asc",
        ...params,
      },
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      return { status: true, data: payload.products || [] };
    }
    return { status: false, data: [] };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") {
      return { status: false, data: [] };
    }
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
    }
    return { status: false, data: [] };
  }
};

const handleSubmitFailure = (dispatch, err, fallbackMessage) => {
  const errors = err.response?.data?.errors;
  if (errors?.length) {
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
  }
  dispatch(
    setAlert(
      getApiErrorMessage(err.response?.data, fallbackMessage || "Request failed."),
      "danger",
    ),
  );
  dispatch(
    productError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createProduct = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingProductSubmit());
  try {
    const config =
      formData instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : json;
    const res = await api.post("/api/admin/products/create", formData, config);
    if (res.data.status === true) {
      dispatch(productSubmitDone());
      dispatch(setAlert(res.data.message || "Product created successfully.", "success"));
      return { status: true };
    }
    dispatch(productSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to create product."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create product.");
    return { status: false };
  }
};

export const getProductById = (productId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/products/${productId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch product."), "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(getApiErrorMessage(err.response?.data, "Failed to fetch product."), "danger"),
    );
    return { status: false, data: null };
  }
};

export const updateProduct = (productId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingProductSubmit());
  try {
    const config =
      formData instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : json;
    const res = await api.put(`/api/admin/products/${productId}`, formData, config);
    if (res.data.status === true) {
      dispatch(productSubmitDone());
      dispatch(setAlert(res.data.message || "Product updated successfully.", "success"));
      return { status: true };
    }
    dispatch(productSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update product."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update product.");
    return { status: false };
  }
};

export const deleteProduct = (productId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingProductSubmit());
  try {
    const res = await api.delete(`/api/admin/products/${productId}`, json);
    if (res.data.status === true) {
      dispatch(productSubmitDone());
      dispatch(setAlert(res.data.message || "Product deleted successfully.", "success"));
      return { status: true };
    }
    dispatch(productSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to delete product."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete product.");
    return { status: false };
  }
};

export const getClaimPolicyList = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/claim-policies/list", {
      params,
      allowDuplicates: true,
    });
    if (res.data?.status) {
      const response = res.data.response || {};
      return {
        status: true,
        data: Array.isArray(response) ? response : response.rows || [],
        pagination: response.pagination || null,
        summary: response.summary || null,
      };
    }
    return { status: false, data: [] };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
    }
    return { status: false, data: [] };
  }
};
