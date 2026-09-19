import { setErrorsList } from "@src/app/state/actions/errors";

export const JSON_HEADERS = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const JSON_HEADERS_ALLOW_DUP = {
  ...JSON_HEADERS,
  allowDuplicates: true,
};

export const EMPTY_COMMON_SETTINGS = {
  name: "",
  abbreviation: "",
  contactUs: "",
  email: "",
  address: "",
  socialMedia: {
    instagram: "",
    facebook: "",
    youtube: "",
    zoomMeeting: "",
  },
  aboutUs: {
    title: "",
    intro: "",
    sections: [],
  },
  contactUsPage: {
    title: "",
    intro: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    address: "",
    businessHours: "",
  },
};

export const runAsyncAction = async ({ execute, onError }) => {
  try {
    return await execute();
  } catch (error) {
    if (onError) return onError(error);
    throw error;
  }
};

export const normalizeApiError = (error, fallbackMessage = "Something went wrong") => {
  const data = error?.response?.data;
  return {
    status: error?.response?.status,
    message: data?.message || error?.message || fallbackMessage,
    errors: Array.isArray(data?.errors) ? data.errors : [],
    raw: error,
  };
};

export const pushFieldErrors = (dispatch, errors = []) => {
  if (!Array.isArray(errors)) return;
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg, error.path));
  });
};
