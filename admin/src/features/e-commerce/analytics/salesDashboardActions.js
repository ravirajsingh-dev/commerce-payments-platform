import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { logoutAuth } from "@src/features/auth/authReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import {
  salesDashboardFailed,
  salesDashboardLoaded,
  salesDashboardLoading,
} from "./salesDashboardReducer";

const handleFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  dispatch(
    setAlert(getApiErrorMessage(err.response?.data, fallbackMessage), "danger"),
  );
};

export const buildSalesDashboardParams = ({
  fromDate = "",
  toDate = "",
  period = "day",
} = {}) => {
  const params = { period: period || "day" };
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  return params;
};

export const fetchSalesDashboard =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(salesDashboardLoading());
      const res = await api.get("/api/admin/analytics/sales", {
        params,
        allowDuplicates: true,
      });

      if (res.data?.status) {
        const dashboard = res.data.response?.dashboard || null;
        dispatch(salesDashboardLoaded(dashboard));
        return { status: true, dashboard };
      }

      dispatch(salesDashboardFailed());
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to load sales dashboard."),
          "danger",
        ),
      );
      return { status: false };
    } catch (err) {
      if (err?.message === "Duplicate request in progress") return;
      dispatch(salesDashboardFailed());
      handleFailure(dispatch, err, "Failed to load sales dashboard.");
      return { status: false };
    }
  };
