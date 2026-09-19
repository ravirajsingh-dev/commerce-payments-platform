import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import { logoutAuth } from "@src/features/auth/authReducer";

const json = { headers: { "Content-Type": "application/json" } };

const onAuthOrError = (dispatch, err, fallbackMessage) => {
  if (err?.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  dispatch(setAlert(getApiErrorMessage(err?.response?.data, fallbackMessage), "danger"));
};

export const getClaimPolicyList = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/claim-policies/list", {
      params,
      allowDuplicates: true,
    });
    if (res.data?.status === true) {
      const payload = res.data.response || {};
      return {
        status: true,
        data: payload.rows || [],
        pagination: payload.pagination || {},
        summary: payload.summary || { active: 0, inactive: 0 },
      };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch claim policies."), "danger"));
    return { status: false, data: [], pagination: {}, summary: { active: 0, inactive: 0 } };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to fetch claim policies.");
    return { status: false, data: [], pagination: {}, summary: { active: 0, inactive: 0 } };
  }
};

export const getClaimPolicyById = (policyId) => async (dispatch) => {
  try {
    const res = await api.get(`/api/admin/claim-policies/${policyId}`, {
      allowDuplicates: true,
    });
    if (res.data?.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch claim policy."), "danger"));
    return { status: false };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to fetch claim policy.");
    return { status: false };
  }
};

export const createClaimPolicy = (payload) => async (dispatch) => {
  try {
    const res = await api.post("/api/admin/claim-policies/create", payload, json);
    if (res.data?.status === true) {
      dispatch(setAlert(res.data.message || "Claim policy created.", "success"));
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to create claim policy."), "danger"));
    return { status: false };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to create claim policy.");
    return { status: false };
  }
};

export const updateClaimPolicy = (policyId, payload) => async (dispatch) => {
  try {
    const res = await api.put(`/api/admin/claim-policies/${policyId}`, payload, json);
    if (res.data?.status === true) {
      dispatch(setAlert(res.data.message || "Claim policy updated.", "success"));
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update claim policy."), "danger"));
    return { status: false };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to update claim policy.");
    return { status: false };
  }
};

export const setClaimPolicyStatus = (policyId, isActive) => async (dispatch) => {
  try {
    const res = await api.patch(
      `/api/admin/claim-policies/${policyId}/status`,
      { isActive: isActive === true },
      json,
    );
    if (res.data?.status === true) {
      dispatch(
        setAlert(
          res.data.message || `Claim policy ${isActive ? "activated" : "deactivated"}.`,
          "success",
        ),
      );
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to update claim policy status."), "danger"),
    );
    return { status: false };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to update claim policy status.");
    return { status: false };
  }
};

export const deleteClaimPolicy = (policyId) => async (dispatch) => {
  try {
    const res = await api.delete(`/api/admin/claim-policies/${policyId}`, json);
    if (res.data?.status === true) {
      dispatch(setAlert(res.data.message || "Claim policy deleted.", "success"));
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to delete claim policy."), "danger"));
    return { status: false };
  } catch (err) {
    onAuthOrError(dispatch, err, "Failed to delete claim policy.");
    return { status: false };
  }
};
