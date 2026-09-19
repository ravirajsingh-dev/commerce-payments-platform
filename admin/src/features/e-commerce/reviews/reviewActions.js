import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import {
  loadingReviewList,
  reviewsFetched,
  reviewsError,
  loadingReviewSubmit,
  reviewSubmitDone,
} from "./reviewReducer";

const handleFailure = (dispatch, err, fallback) => {
  dispatch(reviewsError());
  dispatch(
    setAlert(
      err?.response?.data?.message || err?.message || fallback,
      "danger",
    ),
  );
};

export const getReviewList = (params) => async (dispatch) => {
  dispatch(loadingReviewList());
  try {
    const res = await api.get("/api/admin/reviews/list", { params });
    if (res.data?.status) {
      const payload = res.data.response || {};
      dispatch(
        reviewsFetched({
          reviews: payload.reviews || [],
          totalRecord: payload.pagination?.total ?? 0,
          summary: payload.summary || {},
        }),
      );
      return res.data;
    }
    dispatch(reviewsError());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch reviews."), "danger"));
    return res.data;
  } catch (err) {
    handleFailure(dispatch, err, "Failed to fetch reviews.");
    return null;
  }
};

export const setReviewStatus = (reviewId, status) => async (dispatch) => {
  dispatch(loadingReviewSubmit());
  try {
    const res = await api.patch(`/api/admin/reviews/${reviewId}/status`, { status });
    dispatch(reviewSubmitDone());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Review updated.", "success"));
      return res.data;
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update review."), "danger"));
    return res.data;
  } catch (err) {
    dispatch(reviewSubmitDone());
    dispatch(
      setAlert(
        err?.response?.data?.message || err?.message || "Failed to update review.",
        "danger",
      ),
    );
    return null;
  }
};

export const deleteReview = (reviewId) => async (dispatch) => {
  dispatch(loadingReviewSubmit());
  try {
    const res = await api.delete(`/api/admin/reviews/${reviewId}`);
    dispatch(reviewSubmitDone());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Review deleted.", "success"));
      return res.data;
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to delete review."), "danger"));
    return res.data;
  } catch (err) {
    dispatch(reviewSubmitDone());
    dispatch(
      setAlert(
        err?.response?.data?.message || err?.message || "Failed to delete review.",
        "danger",
      ),
    );
    return null;
  }
};
