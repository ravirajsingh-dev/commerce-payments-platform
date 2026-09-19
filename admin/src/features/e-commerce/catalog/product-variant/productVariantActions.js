import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingProductVariantList,
  productVariantFetched,
  productVariantError,
  loadingProductVariantSubmit,
  productVariantSubmitDone,
} from "./productVariantReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const json = { headers: { "Content-Type": "application/json" } };
const VARIANT_IMAGE_UPLOAD_CHUNK_SIZE = 20;

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    draft: 0,
    inactive: 0,
  };

  return {
    productVariants: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getProductVariantList = (params) => async (dispatch) => {
  try {
    dispatch(loadingProductVariantList());
    const res = await api.get("/api/admin/product-variants/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(productVariantFetched(payload));
      return { status: true, data: payload };
    }
    dispatch(
      productVariantError({
        msg: res.data.message || "Failed to fetch product variants.",
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to fetch product variants."),
        "danger",
      ),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;

    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }

    dispatch(
      productVariantError({
        msg: err.response?.statusText || "Error fetching product variants.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(
          err.response?.data,
          "Failed to fetch product variants.",
        ),
        "danger",
      ),
    );
    return { status: false, data: null };
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
      getApiErrorMessage(
        err.response?.data,
        fallbackMessage || "Request failed.",
      ),
      "danger",
    ),
  );
  dispatch(
    productVariantError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const bulkCreateProductVariants =
  (payload, options = {}) =>
  async (dispatch) => {
    const { silentSuccess = false } = options;
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingProductVariantSubmit());
    try {
      const res = await api.post(
        "/api/admin/product-variants/bulk-create",
        payload,
        json,
      );
      if (res.data.status === true) {
        dispatch(productVariantSubmitDone());
        if (!silentSuccess) {
          dispatch(
            setAlert(
              res.data.message || "Product variants created successfully.",
              "success",
            ),
          );
        }
        return { status: true, data: res.data.response };
      }
      dispatch(productVariantSubmitDone());
      const errors = res.data.errors || [];
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg || error.message, error.path || ""));
      });
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to create product variants."),
          "danger",
        ),
      );
      return { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false };
      }
      handleSubmitFailure(dispatch, err, "Failed to create product variants.");
      dispatch(productVariantSubmitDone());
      return { status: false };
    }
  };

export const createProductVariant =
  (payload, options = {}) =>
  async (dispatch) => {
    const { silentSuccess = false } = options;
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingProductVariantSubmit());
    try {
      const res = await api.post(
        "/api/admin/product-variants/create",
        payload,
        json,
      );
      if (res.data.status === true) {
        dispatch(productVariantSubmitDone());
        if (!silentSuccess) {
          dispatch(
            setAlert(
              res.data.message || "Product variant created successfully.",
              "success",
            ),
          );
        }
        return { status: true, data: res.data.response };
      }
      dispatch(productVariantSubmitDone());
      const errors = res.data.errors || [];
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg || error.message, error.path || ""));
      });
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to create product variant."),
          "danger",
        ),
      );
      return { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false };
      }
      handleSubmitFailure(dispatch, err, "Failed to create product variant.");
      dispatch(productVariantSubmitDone());
      return { status: false };
    }
  };

export const getProductVariantById = (variantId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/product-variants/${variantId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to fetch product variant."),
        "danger",
      ),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(
          err.response?.data,
          "Failed to fetch product variant.",
        ),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const getVariantsByProductId = (productId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(
      `/api/admin/product-variants/product/${productId}`,
      {
        allowDuplicates: true,
      },
    );
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to fetch variants."),
        "danger",
      ),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch variants."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const getProductVariantsOverview =
  (params = {}) =>
  async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    try {
      const res = await api.get("/api/admin/product-variants/overview", {
        params,
        allowDuplicates: true,
      });
      if (res.data.status === true) {
        const bucket = res.data.response?.[0] || {};
        const metadata = bucket.metadata?.[0] || {};
        return {
          status: true,
          data: {
            rows: Array.isArray(bucket.data) ? bucket.data : [],
            totalRecord: Number(metadata.totalRecord || 0),
          },
        };
      }
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to fetch variants overview."),
          "danger",
        ),
      );
      return { status: false, data: [] };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false, data: [] };
      }
      dispatch(
        setAlert(
          getApiErrorMessage(
            err.response?.data,
            "Failed to fetch variants overview.",
          ),
          "danger",
        ),
      );
      return { status: false, data: [] };
    }
  };

export const updateProductVariant =
  (variantId, payload, options = {}) =>
  async (dispatch) => {
    const { silentSuccess = false } = options;
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingProductVariantSubmit());
    try {
      const res = await api.put(
        `/api/admin/product-variants/${variantId}`,
        payload,
        json,
      );
      if (res.data.status === true) {
        dispatch(productVariantSubmitDone());
        if (!silentSuccess) {
          dispatch(
            setAlert(
              res.data.message || "Product variant updated successfully.",
              "success",
            ),
          );
        }
        return { status: true };
      }
      dispatch(productVariantSubmitDone());
      const errors = res.data.errors || [];
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg || error.message, error.path || ""));
      });
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to update product variant."),
          "danger",
        ),
      );
      return { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false };
      }
      handleSubmitFailure(dispatch, err, "Failed to update product variant.");
      dispatch(productVariantSubmitDone());
      return { status: false };
    }
  };

export const deleteProductVariant =
  (variantId, options = {}) =>
  async (dispatch) => {
    const { silentSuccess = false } = options;
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingProductVariantSubmit());
    try {
      const res = await api.delete(
        `/api/admin/product-variants/${variantId}`,
        json,
      );
      if (res.data.status === true) {
        dispatch(productVariantSubmitDone());
        if (!silentSuccess) {
          dispatch(
            setAlert(
              res.data.message || "Product variant deleted successfully.",
              "success",
            ),
          );
        }
        return { status: true };
      }
      dispatch(productVariantSubmitDone());
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to delete product variant."),
          "danger",
        ),
      );
      return { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false };
      }
      handleSubmitFailure(dispatch, err, "Failed to delete product variant.");
      dispatch(productVariantSubmitDone());
      return { status: false };
    }
  };

export const uploadVariantImages =
  (files = [], config = {}) =>
  async (dispatch) => {
    const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (normalizedFiles.length === 0) {
      return { status: true, data: [] };
    }
    try {
      const chunkSize = Math.max(
        1,
        Number(config?.chunkSize) || VARIANT_IMAGE_UPLOAD_CHUNK_SIZE,
      );
      const totalFiles = normalizedFiles.length;
      const uploadedRows = [];
      let uploadedCount = 0;

      for (let start = 0; start < totalFiles; start += chunkSize) {
        const chunk = normalizedFiles.slice(start, start + chunkSize);
        const body = new FormData();
        chunk.forEach((file) => body.append("images", file));

        const res = await api.post(
          "/api/admin/product-variants/upload-images",
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

      return {
        status: true,
        data: uploadedRows,
      };
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

/** Remove orphaned uploads (e.g. after failed create/update). Accepts one id or many. */
export const cleanupVariantUploadedImages =
  (publicIds = [], variantId = "") =>
  async (dispatch) => {
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
    return dispatch(deleteVariantImage(uniquePublicIds, variantId));
  };

const deleteVariantImage =
  (publicId, variantId = "", _options = {}) =>
  async (dispatch) => {
    const normalizedPublicIds = Array.isArray(publicId)
      ? publicId.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const normalizedPublicId =
      normalizedPublicIds.length > 0 ? "" : String(publicId || "").trim();
    if (!normalizedPublicId && normalizedPublicIds.length === 0) {
      return { status: true, data: null };
    }

    const payload = {
      variantId: String(variantId || "").trim(),
      ...(normalizedPublicIds.length > 0
        ? { publicIds: normalizedPublicIds }
        : { publicId: normalizedPublicId }),
    };

    try {
      const res = await api.post(
        "/api/admin/product-variants/delete-image",
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
