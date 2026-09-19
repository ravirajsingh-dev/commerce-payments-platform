import api from "@src/utils/axiosSetup";
import { API_REQUEST_ALLOW_DUP } from "@src/shared/utils/apiResponseHelpers";
import {
  buildCatalogSearchParams,
  mapAxiosToStorefrontError,
  readStoreApiResponse,
} from "@src/shared/utils/storefrontHelpers";
import { JSON_HEADERS_ALLOW_DUP } from "@src/shared/utils/actionHelpers";

export { buildCatalogSearchParams, mapAxiosToStorefrontError };

const storeRequestConfig = API_REQUEST_ALLOW_DUP;

const getStoreJson = async (path) => {
  const res = await api.get(path, storeRequestConfig);
  return readStoreApiResponse(res);
};

/** Homepage CMS payload (hero, showcases, signature styles, clientele). */
export const getHomepageContent = () => async () => {
  try {
    const res = await api.get("/api/common/homepage", JSON_HEADERS_ALLOW_DUP);
    if (res.data?.status) {
      return { status: true, data: res.data.response || {} };
    }
    return {
      status: false,
      data: null,
      message: res.data?.message || "Failed to load homepage.",
    };
  } catch (err) {
    return { status: false, data: null, error: err };
  }
};

/** Single legal/policy page by slug (public, unauthenticated). */
export const getLegalPageBySlug = (slug) => async () => {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return { status: false, data: null };
  }
  try {
    const res = await api.get(
      `/api/common/legal-pages/${encodeURIComponent(normalizedSlug)}`,
      JSON_HEADERS_ALLOW_DUP,
    );
    const data = res.data?.response;
    return {
      status: true,
      data: {
        title: data?.title || "",
        sections: Array.isArray(data?.sections) ? data.sections : [],
      },
    };
  } catch (err) {
    return { status: false, data: null, error: err };
  }
};

export const getStoreProductBySlug =
  (slug, { sort } = {}) =>
  async () => {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    const query = params.toString();
    const path = `/api/store/products/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
    return getStoreJson(path);
  };

export const getStoreCatalogProducts = () => async () =>
  getStoreJson("/api/store/products");

export const getStoreCatalogAllVariants = () => async () =>
  getStoreJson("/api/store/catalog/all-variants");

export const getStoreCatalogNewArrivals = () => async () =>
  getStoreJson("/api/store/catalog/new-arrivals");

export const getStoreCatalogSearch = (filters = {}) => async () => {
  const params =
    filters instanceof URLSearchParams
      ? filters
      : buildCatalogSearchParams(
          typeof filters === "string" ? { q: filters } : filters,
        );
  const qs = params.toString();
  const path = `/api/store/catalog/search${qs ? `?${qs}` : ""}`;
  return getStoreJson(path);
};

export const getStoreNavigation = () => async () =>
  getStoreJson("/api/store/navigation");

export const getStoreCategories = () => async () =>
  getStoreJson("/api/store/categories");

/** Product variant PDP payload (variant, parent product, attribute defs). */
export const getStoreVariantDetail = (variantId) => async () => {
  const id = String(variantId || "").trim();
  if (!id) {
    return { status: false, data: null, message: "Variant id is required." };
  }
  try {
    const payload = await getStoreJson(
      `/api/store/variants/${encodeURIComponent(id)}`,
    );
    return {
      status: true,
      data: {
        variant: payload?.variant || null,
        product: payload?.product || null,
        variantAttributes: Array.isArray(payload?.variantAttributes)
          ? payload.variantAttributes
          : [],
        relatedProducts: Array.isArray(payload?.relatedProducts)
          ? payload.relatedProducts
          : [],
      },
    };
  } catch (err) {
    const mapped = mapAxiosToStorefrontError(
      err,
      "Something went wrong while loading product details.",
    );
    return {
      status: false,
      data: null,
      statusCode: mapped.status,
      message: mapped.message,
    };
  }
};

export const getStoreCategoryVariants = (slug) => async () =>
  getStoreJson(`/api/store/categories/${encodeURIComponent(slug)}/variants`);
