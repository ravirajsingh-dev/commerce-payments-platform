import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingCategoryList,
  categoryFetched,
  categoryError,
  loadingCategorySubmit,
  categorySubmitDone,
} from "./categoryReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const json = { headers: { "Content-Type": "application/json" } };

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    inactive: 0,
  };

  return {
    categories: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getCategoryList = (params) => async (dispatch) => {
  try {
    dispatch(loadingCategoryList());
    const res = await api.get("/api/admin/categories/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(categoryFetched(payload));
      return { status: true, data: payload };
    } else {
      dispatch(
        categoryError({
          msg: res.data.message || "Failed to fetch categories.",
        }),
      );
      dispatch(
        setAlert(res.data.message || "Failed to fetch categories.", "danger"),
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
      categoryError({
        msg: err.response?.statusText || "Error fetching categories.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch categories."),
        "danger",
      ),
    );
    return { status: false, data: null };
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
    categoryError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createCategory = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCategorySubmit());
  try {
    const res = await api.post("/api/admin/categories/create", formData, json);
    if (res.data.status === true) {
      dispatch(categorySubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Category created successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(categorySubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to create category."), "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create category.");
    return { status: false };
  }
};

export const getCategoryById = (categoryId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/categories/${categoryId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(res.data.message || "Failed to fetch category.", "danger"),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch category."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateCategory = (categoryId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCategorySubmit());
  try {
    const res = await api.put(
      `/api/admin/categories/${categoryId}`,
      formData,
      json,
    );
    if (res.data.status === true) {
      dispatch(categorySubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Category updated successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(categorySubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to update category."), "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update category.");
    return { status: false };
  }
};

export const deleteCategory = (categoryId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCategorySubmit());
  try {
    const res = await api.delete(`/api/admin/categories/${categoryId}`, json);
    if (res.data.status === true) {
      dispatch(categorySubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Category deleted successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(categorySubmitDone());
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to delete category."), "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete category.");
    return { status: false };
  }
};
