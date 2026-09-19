import axios from "axios";
import store from "@src/app/store";
import { logoutAuth, authTokenRefresh } from "@src/features/auth/authReducer";

const api = axios.create();

// Configure axios to send cookies automatically
axios.defaults.withCredentials = true;
api.defaults.withCredentials = true;

const ongoingRequests = new Map();
let refreshPromise = null;
const AUTH_LOGOUT_BROADCAST_KEY = "auth.logout.event";

const getRequestKey = (config) => {
  if (!config) return "";
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join("&");
};

const removeRequest = (requestKey) => {
  if (ongoingRequests.has(requestKey)) {
    ongoingRequests.delete(requestKey);
  }
};

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const requestKey = getRequestKey(config);

    // Check for duplicate request unless explicitly allowed
    if (!config.allowDuplicates && ongoingRequests.has(requestKey)) {
      return Promise.reject(new Error("Duplicate request in progress"));
    }

    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    ongoingRequests.set(requestKey, source);

    // Cookies are automatically sent via withCredentials = true
    // No manual header setting required

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    const requestKey = getRequestKey(response.config);
    removeRequest(requestKey);
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    const { dispatch } = store;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestKey = getRequestKey(originalRequest);
    removeRequest(requestKey);

    // Token expired - attempt to refresh (single in-flight to avoid concurrent refreshes)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const endpoint = `/api/auth/admin/refresh`;
        if (!refreshPromise) {
          refreshPromise = api
            .post(endpoint, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const response = await refreshPromise;

        if (response.data?.status === true) {
          dispatch(authTokenRefresh({}));
          originalRequest.allowDuplicates = true;
          return api(originalRequest);
        } else {
          localStorage.setItem(
            AUTH_LOGOUT_BROADCAST_KEY,
            `${Date.now()}-${Math.random()}`,
          );
          dispatch(logoutAuth());
          return Promise.reject(new Error("Token refresh failed"));
        }
      } catch (refreshError) {
        localStorage.setItem(
          AUTH_LOGOUT_BROADCAST_KEY,
          `${Date.now()}-${Math.random()}`,
        );
        dispatch(logoutAuth());
        console.error("Token refresh failed:", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
