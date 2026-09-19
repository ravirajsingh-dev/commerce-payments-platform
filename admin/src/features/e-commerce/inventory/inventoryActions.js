import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const handleFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  const errors = err.response?.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(err.response?.data?.message || fallbackMessage, "danger"));
};

const handleApiErrors = (dispatch, res, fallbackMessage) => {
  const errors = res.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(getApiErrorMessage(res.data, fallbackMessage), "danger"));
};

export const fetchLowStock =
  (params = {}) =>
  async (dispatch) => {
    try {
      const res = await api.get("/api/admin/inventory/low-stock", {
        params,
        allowDuplicates: true,
      });

      if (res.data?.status) {
        return { status: true, data: res.data.response || {} };
      }

      handleApiErrors(dispatch, res, "Failed to fetch low stock items.");
      return { status: false };
    } catch (err) {
      if (err?.message === "Duplicate request in progress") return { status: false };
      handleFailure(dispatch, err, "Failed to fetch low stock items.");
      return { status: false };
    }
  };

export const fetchStockAdjustmentReasons = () => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/inventory/stock-adjustments/reasons", {
      allowDuplicates: true,
    });
    if (res.data?.status) {
      return { status: true, data: res.data.response?.reasons || [] };
    }
    handleApiErrors(dispatch, res, "Failed to fetch adjustment reasons.");
    return { status: false, data: [] };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return { status: false };
    handleFailure(dispatch, err, "Failed to fetch adjustment reasons.");
    return { status: false, data: [] };
  }
};

export const fetchStockAdjustments = (params) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/inventory/stock-adjustments", {
      params,
      allowDuplicates: true,
    });
    if (res.data?.status) {
      const payload = res.data.response || {};
      return {
        status: true,
        data: {
          adjustments: payload.adjustments || [],
          pagination: payload.pagination || {},
        },
      };
    }
    handleApiErrors(dispatch, res, "Failed to fetch stock adjustments.");
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return { status: false };
    handleFailure(dispatch, err, "Failed to fetch stock adjustments.");
    return { status: false };
  }
};

export const createStockAdjustment = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.post("/api/admin/inventory/stock-adjustments", payload);
    if (res.data?.status) {
      dispatch(setAlert("Stock adjusted successfully.", "success"));
      return { status: true, data: res.data.response || {} };
    }
    handleApiErrors(dispatch, res, "Failed to adjust stock.");
    return { status: false };
  } catch (err) {
    handleFailure(dispatch, err, "Failed to adjust stock.");
    return { status: false };
  }
};

export const searchVariantsBySku = (skuSearch) => async () => {
  const term = String(skuSearch || "").trim();
  if (term.length < 2) {
    return { status: true, data: [] };
  }

  try {
    const res = await api.get("/api/admin/product-variants/list", {
      params: {
        page: 1,
        limit: 12,
        orderBy: "sku",
        ascending: "asc",
        filters: "sku",
        query: JSON.stringify({
          sku: { value: term, type: "String" },
        }),
      },
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const bucket = res.data.response?.[0] || {};
      return { status: true, data: bucket.data || [] };
    }
    return { status: false, data: [] };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return { status: false };
    return { status: false, data: [] };
  }
};
