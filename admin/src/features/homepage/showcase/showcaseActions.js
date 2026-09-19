import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import { createHomepageCrudActions } from "@src/features/homepage/shared/homepageCrudFactory";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import * as reducerActions from "./showcaseReducer";

const json = { headers: { "Content-Type": "application/json" } };

const SHOWCASE_UPLOAD_CHUNK_SIZE = 20;

const crud = createHomepageCrudActions({
  entityName: "showcase",
  listApi: "/api/admin/homepage/showcases/list",
  createApi: "/api/admin/homepage/showcases/create",
  updateApi: (id) => `/api/admin/homepage/showcases/${id}`,
  deleteApi: (id) => `/api/admin/homepage/showcases/${id}`,
  reducerActions,
});

export const getShowcaseList = crud.getList;
export const getShowcaseById = crud.getById;
export const deleteShowcase = crud.deleteOne;

const handleSubmitFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  const errors = err.response?.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(err.response?.data?.message || fallbackMessage, "danger"));
};

export const createShowcase = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(reducerActions.loadingSubmit());
  try {
    const res = await api.post(
      "/api/admin/homepage/showcases/create",
      payload,
      json,
    );
    dispatch(reducerActions.submitDone());
    if (res.data?.status) {
      dispatch(
        setAlert(
          res.data.message || "Showcase created successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to create showcase."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    dispatch(reducerActions.submitDone());
    handleSubmitFailure(dispatch, err, "Failed to create showcase.");
    return { status: false };
  }
};

export const updateShowcase = (id, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(reducerActions.loadingSubmit());
  try {
    const res = await api.put(
      `/api/admin/homepage/showcases/${id}`,
      payload,
      json,
    );
    dispatch(reducerActions.submitDone());
    if (res.data?.status) {
      dispatch(
        setAlert(
          res.data.message || "Showcase updated successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to update showcase."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    dispatch(reducerActions.submitDone());
    handleSubmitFailure(dispatch, err, "Failed to update showcase.");
    return { status: false };
  }
};

export const uploadShowcaseImages =
  (files = [], config = {}) =>
  async (dispatch) => {
    const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (normalizedFiles.length === 0) {
      return { status: true, data: [] };
    }
    try {
      const chunkSize = Math.max(
        1,
        Number(config?.chunkSize) || SHOWCASE_UPLOAD_CHUNK_SIZE,
      );
      const totalFiles = normalizedFiles.length;
      const uploadedRows = [];
      let uploadedCount = 0;

      for (let start = 0; start < totalFiles; start += chunkSize) {
        const chunk = normalizedFiles.slice(start, start + chunkSize);
        const body = new FormData();
        chunk.forEach((file) => body.append("images", file));

        const res = await api.post(
          "/api/admin/homepage/showcases/upload-images",
          body,
          {
            headers: { "Content-Type": "multipart/form-data" },
            ...((config || {}).onUploadProgress
              ? {
                  onUploadProgress: (progressEvent) => {
                    const total = progressEvent?.total || 0;
                    const loaded = progressEvent?.loaded || 0;
                    const chunkPercent =
                      total > 0 ? Math.min(1, Math.max(0, loaded / total)) : 0;
                    const syntheticLoaded = Math.round(
                      uploadedCount + chunkPercent * chunk.length,
                    );
                    config.onUploadProgress({
                      loaded: syntheticLoaded,
                      total: totalFiles,
                    });
                  },
                }
              : {}),
          },
        );

        if (res.data.status !== true) {
          dispatch(
            setAlert(getApiErrorMessage(res.data, "Upload failed."), "danger"),
          );
          return { status: false, data: uploadedRows };
        }

        const currentRows = Array.isArray(res.data.response)
          ? res.data.response
          : [];
        if (currentRows.length !== chunk.length) {
          dispatch(
            setAlert(
              "Upload failed: some images were not processed.",
              "danger",
            ),
          );
          return { status: false, data: uploadedRows };
        }

        uploadedRows.push(...currentRows);
        uploadedCount += chunk.length;
        if ((config || {}).onUploadProgress) {
          config.onUploadProgress({
            loaded: uploadedCount,
            total: totalFiles,
          });
        }
      }

      return { status: true, data: uploadedRows };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false, data: [] };
      }
      dispatch(
        setAlert(
          getApiErrorMessage(err.response?.data, "Failed to upload images."),
          "danger",
        ),
      );
      return { status: false, data: [] };
    }
  };

/** Remove orphaned uploads (e.g. after failed create/update). */
export const cleanupShowcaseUploadedImages = (publicIds = []) => async (dispatch) => {
  const uniquePublicIds = Array.from(
    new Set(
      (Array.isArray(publicIds) ? publicIds : [publicIds])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!uniquePublicIds.length) {
    return { status: true, data: null };
  }
  return dispatch(deleteShowcaseImage(uniquePublicIds));
};

const deleteShowcaseImage =
  (publicId, _options = {}) =>
  async (dispatch) => {
    const normalizedPublicIds = Array.isArray(publicId)
      ? publicId.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const normalizedPublicId =
      normalizedPublicIds.length > 0 ? "" : String(publicId || "").trim();
    if (!normalizedPublicId && normalizedPublicIds.length === 0) {
      return { status: true, data: null };
    }

    const payload =
      normalizedPublicIds.length > 0
        ? { publicIds: normalizedPublicIds }
        : { publicId: normalizedPublicId };

    try {
      const res = await api.post(
        "/api/admin/homepage/showcases/delete-image",
        payload,
        json,
      );
      if (res.data.status === true) {
        return { status: true, data: res.data.response };
      }
      return { status: false, data: null };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
      }
      return { status: false, data: null };
    }
  };
