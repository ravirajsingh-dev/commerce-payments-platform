import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";

const mapApiErrors = (dispatch, errors = []) => {
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
};

export const fetchUserAddresses = async () => {
  const res = await api.get("/api/users/addresses");
  if (res.data?.status) {
    return res.data.response?.addresses || [];
  }
  throw new Error(res.data?.message || "Unable to load addresses.");
};

export const createUserAddress = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.post("/api/users/addresses", payload);
    if (res.data?.status) {
      dispatch(
        setAlert(res.data.message || "Address saved successfully.", "success"),
      );
      return res.data.response?.address || null;
    }
    mapApiErrors(dispatch, res.data?.errors);
    dispatch(setAlert(res.data?.message || "Unable to save address.", "danger"));
    return null;
  } catch (err) {
    mapApiErrors(dispatch, err.response?.data?.errors);
    dispatch(
      setAlert(
        err.response?.data?.message || "Unable to save address.",
        "danger",
      ),
    );
    return null;
  }
};

export const updateUserAddress = (addressId, payload) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.patch(`/api/users/addresses/${addressId}`, payload);
    if (res.data?.status) {
      dispatch(
        setAlert(res.data.message || "Address updated successfully.", "success"),
      );
      return res.data.response?.address || null;
    }
    mapApiErrors(dispatch, res.data?.errors);
    dispatch(setAlert(res.data?.message || "Unable to update address.", "danger"));
    return null;
  } catch (err) {
    mapApiErrors(dispatch, err.response?.data?.errors);
    dispatch(
      setAlert(
        err.response?.data?.message || "Unable to update address.",
        "danger",
      ),
    );
    return null;
  }
};

export const deleteUserAddress = (addressId) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.delete(`/api/users/addresses/${addressId}`);
    if (res.data?.status) {
      dispatch(
        setAlert(res.data.message || "Address deleted successfully.", "success"),
      );
      return true;
    }
    dispatch(setAlert(res.data?.message || "Unable to delete address.", "danger"));
    return false;
  } catch (err) {
    dispatch(
      setAlert(
        err.response?.data?.message || "Unable to delete address.",
        "danger",
      ),
    );
    return false;
  }
};

export const setDefaultUserAddress = (addressId) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.post(`/api/users/addresses/${addressId}/set-default`);
    if (res.data?.status) {
      dispatch(
        setAlert(
          res.data.message || "Default address updated successfully.",
          "success",
        ),
      );
      return res.data.response?.address || null;
    }
    dispatch(
      setAlert(res.data?.message || "Unable to set default address.", "danger"),
    );
    return null;
  } catch (err) {
    dispatch(
      setAlert(
        err.response?.data?.message || "Unable to set default address.",
        "danger",
      ),
    );
    return null;
  }
};
