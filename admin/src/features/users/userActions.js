import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingUsersList,
  usersFetched,
  usersError,
  loadingUsersSubmit,
  usersSubmitDone,
} from "@src/features/users/userReducer";

const json = { headers: { "Content-Type": "application/json" } };

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    inactive: 0,
    newUsers: 0,
    blocked: 0,
  };

  return {
    users: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getUsersList = (params) => async (dispatch) => {
  try {
    dispatch(loadingUsersList());
    const res = await api.get("/api/admin/users/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(usersFetched(extractListPayload(res.data.response)));
    } else {
      dispatch(
        usersError({ msg: res.data.message || "Failed to fetch users." }),
      );
      dispatch(
        setAlert(res.data.message || "Failed to fetch users.", "danger"),
      );
    }
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;

    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return;
    }

    dispatch(
      usersError({
        msg: err.response?.statusText || "Error fetching users.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch users.",
        "danger",
      ),
    );
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
      err.response?.data?.message || fallbackMessage || "Request failed.",
      "danger",
    ),
  );
  dispatch(
    usersError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createUser = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingUsersSubmit());
  try {
    const res = await api.post("/api/admin/users/create", formData, json);
    if (res.data.status === true) {
      dispatch(usersSubmitDone());
      dispatch(
        setAlert(res.data.message || "User created successfully.", "success"),
      );
      return { status: true };
    }
    dispatch(usersSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(res.data.message || "Failed to create user.", "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create user.");
    return { status: false };
  }
};

export const getUserCart = async (userId) => {
  try {
    const res = await api.get(`/api/admin/users/${userId}/cart`, {
      allowDuplicates: true,
    });

    if (res.data?.status) {
      return {
        status: true,
        data: res.data.response || {},
      };
    }

    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    return { status: false };
  }
};

export const clearUserCart = (userId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.delete(`/api/admin/users/${userId}/cart`);

    if (res.data?.status) {
      dispatch(
        setAlert(res.data.message || "User cart cleared.", "success"),
      );
      return {
        status: true,
        data: res.data.response || {},
      };
    }

    const errors = res.data?.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(res.data?.message || "Unable to clear user cart.", "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    dispatch(setAlert("Unable to clear user cart.", "danger"));
    return { status: false };
  }
};

export const getUserOrders = async (userId, params = {}) => {
  try {
    const res = await api.get(`/api/admin/users/${userId}/orders`, {
      params,
      allowDuplicates: true,
    });

    if (res.data?.status) {
      return {
        status: true,
        data: res.data.response || {},
      };
    }

    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    return { status: false };
  }
};

export const getUserAnalytics = async (userId) => {
  try {
    const res = await api.get(`/api/admin/users/${userId}/analytics`, {
      allowDuplicates: true,
    });
    if (res.data?.status) {
      return {
        status: true,
        analytics: res.data.response?.analytics || null,
      };
    }
    return { status: false, analytics: null };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") {
      return { status: false, analytics: null };
    }
    return { status: false, analytics: null };
  }
};

export const getUserById = (userId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/users/${userId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(res.data.message || "Failed to fetch user.", "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch user.",
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateUser = (userId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingUsersSubmit());
  try {
    const res = await api.put(`/api/admin/users/${userId}`, formData, json);
    if (res.data.status === true) {
      dispatch(usersSubmitDone());
      dispatch(
        setAlert(res.data.message || "User updated successfully.", "success"),
      );
      return { status: true };
    }
    dispatch(usersSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(res.data.message || "Failed to update user.", "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update user.");
    return { status: false };
  }
};

export const deleteUser = (userId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingUsersSubmit());
  try {
    const res = await api.delete(`/api/admin/users/${userId}`, json);
    if (res.data.status === true) {
      dispatch(usersSubmitDone());
      dispatch(
        setAlert(res.data.message || "User deleted successfully.", "success"),
      );
      return { status: true };
    }
    dispatch(usersSubmitDone());
    dispatch(setAlert(res.data.message || "Failed to delete user.", "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete user.");
    return { status: false };
  }
};

