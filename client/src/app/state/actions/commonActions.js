import { commonSettingsUpdated, loadingCommonSettings } from "@src/app/state/reducers/commonReducer";
import { removeErrors } from "@src/app/state/reducers/errors";
import { removeAlertMsg } from "@src/app/state/reducers/alert";
import api from "@src/utils/axiosSetup";
import {
  EMPTY_COMMON_SETTINGS,
  JSON_HEADERS,
  normalizeApiError,
  runAsyncAction,
} from "@src/shared/utils/actionHelpers";

export const getCommonSettings = () => async (dispatch) => {
  return runAsyncAction({
    execute: async () => {
      dispatch(loadingCommonSettings());
      const res = await api.get(`/api/common/settings`, JSON_HEADERS);

      if (res.data && res.data.status === true) {
        dispatch(commonSettingsUpdated(res.data.response));
      }
      return res.data ? res.data : { status: false };
    },
    onError: (err) => {
      normalizeApiError(err, "Failed to fetch common settings");
      dispatch(commonSettingsUpdated(EMPTY_COMMON_SETTINGS));
      return { status: false };
    },
  });
};

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
};
