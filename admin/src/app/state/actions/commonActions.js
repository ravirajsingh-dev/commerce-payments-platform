import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  JSON_HEADERS,
  JSON_HEADERS_ALLOW_DUP,
  normalizeApiError,
  pushFieldErrors,
  runAsyncAction,
} from "@src/shared/utils/actionHelpers";
import {
  commonSettingsUpdated,
  commonSettingsError,
  loadingCommonSettings,
  loadingOnCommonSettingsSubmit,
  resetCommonSettings,
  commonSettingsFetched,
} from "@src/app/state/reducers/commonReducer";

/** Skip network when Redux already has settings (unless force). */
const hasHydratedCommonSettings = (commonSettings = {}) => {
  const s = commonSettings;
  return Boolean(
    s.abbreviation ||
      s.name ||
      s.logoUrl ||
      s.email ||
      s.contactUs ||
      s.address,
  );
}

/**
 * Loads public/branding settings. Safe to call from multiple places:
 * duplicate in-flight requests are avoided via axios; completed payloads are skipped unless `force`.
 * @param {{ force?: boolean }} options
 */
export const getCommonSettings =
  ({ force = false } = {}) =>
  async (dispatch, getState) => {
    const { common } = getState();

    if (!force && hasHydratedCommonSettings(common.commonSettings)) {
      return;
    }

    return runAsyncAction({
      execute: async () => {
        dispatch(loadingCommonSettings());
        const res = await api.get(`/api/admin/settings`, JSON_HEADERS_ALLOW_DUP);

        if (res.data.status === true) {
          dispatch(commonSettingsFetched(res.data.response));
          dispatch(removeAlert());
        } else {
          dispatch(
            commonSettingsError({
              msg: res.data.message || "Failed to fetch settings",
              status: res.status || 500,
            }),
          );
          dispatch(setAlert(res.data.message || "Failed to fetch settings", "danger"));
        }
      },
      onError: (err) => {
        if (err?.message === "Duplicate request in progress") return;

        const normalized = normalizeApiError(err, "Failed to fetch settings");
        const tokenDead = err.response?.data?.tokenStatus === 0;

        if (tokenDead) {
          dispatch(logoutAuth());
        }

        const silentBrandingFail = normalized.status === 401 || tokenDead;
        if (silentBrandingFail) {
          dispatch(commonSettingsFetched({}));
          return;
        }

        dispatch(
          commonSettingsError({
            msg:
              err.response?.statusText ||
              (normalized.status ? normalized.message : "Network error"),
            status: normalized.status || 0,
          }),
        );
        dispatch(setAlert(normalized.message, "danger"));
      },
    });
  };

export const updateCommonSettings = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnCommonSettingsSubmit());
  dispatch(removeAlert());
  return runAsyncAction({
    execute: async () => {
      const config =
        formData instanceof FormData
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : JSON_HEADERS;

      const res = await api.put(`/api/admin/settings`, formData, config);

      if (res.data.status === true) {
        dispatch(commonSettingsUpdated(res.data.response));
        dispatch(setAlert("Settings updated successfully.", "success"));
      } else if (res.data.errors) {
        dispatch(setAlert(res.data.message, "danger"));
        pushFieldErrors(dispatch, res.data.errors);
      } else {
        dispatch(setAlert("Failed to update settings.", "danger"));
      }
    },
    onError: (err) => {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return;
      }

      const normalized = normalizeApiError(err, "Failed to update settings");
      pushFieldErrors(dispatch, normalized.errors);

      if (err.response) {
        dispatch(
          commonSettingsError({
            msg: err.response.statusText || "Error updating settings",
            status: err.response.status || 500,
          }),
        );
      }
      dispatch(setAlert(normalized.message, "danger"));
    },
  });
};
