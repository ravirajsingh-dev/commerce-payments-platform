import { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import { getCommonSettings } from "@src/app/state/actions/commonActions";
import { getProductById } from "@src/features/e-commerce/catalog/product/productActions";
import { getAttributeList } from "@src/features/e-commerce/catalog/attribute/attributeActions";
import {
  cleanupVariantUploadedImages,
  getProductVariantById,
  getVariantsByProductId,
  updateProductVariant,
  uploadVariantImages,
} from "@src/features/e-commerce/catalog/product-variant/productVariantActions";
import ProductVariantForm from "@src/features/e-commerce/catalog/product-variant/components/ProductVariantForm";
import {
  generateVariantSku,
  validateVariantDiscountFields,
  buildVariantDiscountPayload,
} from "@src/features/e-commerce/catalog/product-variant/variantHelpers";

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);
const isSizeCode = (code) => SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

const initialFormState = {
  productId: "",
  name: "",
  shortDescription: "",
  attributes: {},
  sku: "",
  price: "",
  discountType: "",
  discountValue: "",
  stock: 0,
  status: 1,
  isNewArrival: false,
  sizes: [],
};

const ProductVariantEdit = ({
  getProductVariantById,
  getProductById,
  getAttributeList,
  getVariantsByProductId,
  getCommonSettings,
  updateProductVariant,
  cleanupVariantUploadedImages,
  uploadVariantImages,
  setErrors,
  removeErrors,
  productVariantStore,
  attributeStore,
  commonSettings,
}) => {
  const navigate = useNavigate();
  const { variantId } = useParams();
  const existingVariantsRef = useRef([]);
  const uploadItemsRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [productDetail, setProductDetail] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(true);
  const [uploadItems, setUploadItems] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { loadingSubmit } = productVariantStore;
  const { attributeList } = attributeStore;

  const variantAttributeDefinitions = useMemo(
    () =>
      (attributeList || []).filter(
        (item) => item?.isVariant === true && item?.inputType === "select",
      ),
    [attributeList],
  );
  const sizeAttribute = useMemo(
    () =>
      (variantAttributeDefinitions || []).find((item) => isSizeCode(item?.code)) ||
      null,
    [variantAttributeDefinitions],
  );
  const hasSizeAxis = Boolean(sizeAttribute);
  const productAttributeDefinitions = useMemo(
    () => (attributeList || []).filter((item) => item?.isVariant === false),
    [attributeList],
  );

  const sortedAttributeCodes = useMemo(
    () =>
      [...variantAttributeDefinitions]
        .filter((item) => !isSizeCode(item?.code))
        .map((item) => item.code)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
    [variantAttributeDefinitions],
  );
  const uploadingImages = useMemo(
    () => (uploadItems || []).some((item) => item.status === "uploading"),
    [uploadItems],
  );
  useEffect(() => {
    uploadItemsRef.current = uploadItems || [];
  }, [uploadItems]);

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(
    () => () => {
      (uploadItemsRef.current || []).forEach((item) => {
        if (item?.previewUrl?.startsWith("blob:"))
          URL.revokeObjectURL(item.previewUrl);
      });
    },
    [],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const variantRes = await getProductVariantById(variantId);
      if (!variantRes?.status || !variantRes?.data) {
        navigate("/admin/product-variants");
        return;
      }
      const variant = variantRes.data;
      const productId = String(
        variant.productId?._id || variant.productId || "",
      );
      const productRes = await getProductById(productId);
      if (!productRes?.status || !productRes?.data) {
        navigate("/admin/product-variants");
        return;
      }
      setProductDetail(productRes.data);

      const attrSetId =
        productRes.data.attributeSetId?._id ||
        productRes.data.attributeSetId ||
        "";
      await getAttributeList({
        limit: 100,
        page: 1,
        orderBy: "name",
        ascending: "asc",
        filters: "attributeSetId",
        query: JSON.stringify({
          attributeSetId: { value: attrSetId, type: "id" },
        }),
      });

      const existingRes = await getVariantsByProductId(productId);
      if (existingRes?.status && Array.isArray(existingRes.data)) {
        existingVariantsRef.current = existingRes.data;
      } else {
        existingVariantsRef.current = [];
      }

      // Strip a legacy `size` attribute when loading — sizes are now managed in their own array.
      // If the variant has no `sizes` yet but a legacy `attributes.size`, surface it as a single
      // entry seeded with the existing stock so the admin can simply add more sizes.
      const rawAttributes = variant.attributes || {};
      const cleanedAttributes = Object.fromEntries(
        Object.entries(rawAttributes).filter(([code]) => !isSizeCode(code)),
      );
      const incomingSizes = Array.isArray(variant.sizes) ? variant.sizes : [];
      const legacySizeValue = Object.entries(rawAttributes).find(([code]) =>
        isSizeCode(code),
      )?.[1];
      const normalizedSizes =
        incomingSizes.length > 0
          ? incomingSizes.map((row) => ({
              value: String(row?.value || "").toLowerCase(),
              label: String(row?.label || row?.value || ""),
              sku: String(row?.sku || ""),
              stock: Math.max(0, Math.trunc(Number(row?.stock) || 0)),
              description: String(row?.description || "").slice(0, 500),
            }))
          : legacySizeValue
          ? [
              {
                value: String(legacySizeValue).toLowerCase(),
                label: String(legacySizeValue).toUpperCase(),
                sku: "",
                stock: Math.max(0, Math.trunc(Number(variant.stock) || 0)),
              },
            ]
          : [];

      setFormData({
        productId,
        name: variant.name || "",
        shortDescription: variant.shortDescription || "",
        attributes: cleanedAttributes,
        sku: variant.sku || "",
        price: Number(variant.price || 0),
        discountType: variant.discountType || "",
        discountValue:
          variant.discountValue != null && variant.discountValue !== ""
            ? Number(variant.discountValue)
            : "",
        stock: Number(variant.stock || 0),
        status: Number(variant.status || 1),
        isNewArrival: Boolean(variant.isNewArrival),
        sizes: normalizedSizes,
      });
      setUploadItems(
        (Array.isArray(variant.images) ? variant.images : []).map(
          (image, index) => ({
            id: `existing-${index}-${String(image?.publicId || image?.url || "")}`,
            file: null,
            name: image?.publicId?.split("/").pop() || `image-${index + 1}`,
            previewUrl: image?.url || "",
            url: image?.url || "",
            publicId: image?.publicId || "",
            progress: 100,
            status: "success",
          }),
        ),
      );
      setIsSkuManuallyEdited(true);
      setSubmitAttempted(false);
      setLoading(false);
    };
    run();
  }, [
    getAttributeList,
    getProductById,
    getProductVariantById,
    getVariantsByProductId,
    navigate,
    variantId,
  ]);

  const skuAutoContext = useMemo(
    () => ({
      brandCode: String(commonSettings?.abbreviation || "RR").trim(),
      primaryCategory: productDetail?.primaryCategoryId || null,
      productId: formData.productId,
      attributes: formData.attributes || {},
      sizes: formData.sizes,
      sortedAttributeCodes,
    }),
    [
      commonSettings?.abbreviation,
      productDetail,
      formData.productId,
      formData.attributes,
      formData.sizes,
      sortedAttributeCodes,
    ],
  );

  useEffect(() => {
    if (isSkuManuallyEdited) return;
    if (!formData.productId || !productDetail) return;
    const nextSku = generateVariantSku(skuAutoContext);
    setFormData((prev) => ({ ...prev, sku: nextSku }));
  }, [skuAutoContext, isSkuManuallyEdited, formData.productId, productDetail]);

  const validateForm = () => {
    const errors = {};
    if (!String(formData.sku || "").trim()) errors.sku = "SKU is required.";
    if (
      formData.price === "" ||
      Number.isNaN(Number(formData.price)) ||
      Number(formData.price) < 0
    ) {
      errors.price = "Price must be a valid non-negative number.";
    }
    Object.assign(errors, validateVariantDiscountFields(formData));
    if (hasSizeAxis) {
      if (!Array.isArray(formData.sizes) || formData.sizes.length === 0) {
        errors.sizes = "Please pick at least one size.";
      }
    } else if (Number(formData.stock) < 0 || Number.isNaN(Number(formData.stock))) {
      errors.stock = "Stock must be a non-negative integer.";
    }
    variantAttributeDefinitions
      .filter(
        (attribute) =>
          attribute?.isRequired === true && !isSizeCode(attribute?.code),
      )
      .forEach((attribute) => {
        const code = attribute?.code;
        if (!code) return;
        if (!String(formData.attributes?.[code] || "").trim()) {
          errors[`attributes.${code}`] = "Please select value.";
        }
      });
    return errors;
  };

  const localErrors = useMemo(
    () => (submitAttempted ? validateForm() : {}),
    [submitAttempted, formData, variantAttributeDefinitions],
  );

  const onInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    if (name === "sku") setIsSkuManuallyEdited(true);
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onAttributeChange = (code, value) => {
    setIsSkuManuallyEdited(false);
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [code]: value,
      },
    }));
  };

  const onSizesChange = (nextSizes) => {
    setFormData((prev) => ({
      ...prev,
      sizes: Array.isArray(nextSizes) ? nextSizes : [],
    }));
  };

  const onUploadImages = (files) => {
    if (!files?.length) return;
    const newItems = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file?.name || "image",
      previewUrl: URL.createObjectURL(file),
      url: "",
      publicId: "",
      progress: 100,
      status: "success",
    }));
    setUploadItems((prev) => [...prev, ...newItems]);
  };

  const onRetryImageUpload = async () => {};

  const onRemoveImageUpload = (itemId) => {
    const target = (uploadItems || []).find((item) => item.id === itemId);
    if (!target) return;
    if (target?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setUploadItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const cleanupUploadedPublicIds = async (publicIds = []) => {
    await cleanupVariantUploadedImages(publicIds, "");
  };

  const uploadNewImagesForSubmit = async () => {
    const snapshots = uploadItemsRef.current || [];
    const itemsToUpload = snapshots.filter((item) => item?.file && !item?.publicId);
    if (itemsToUpload.length === 0) {
      return { status: true, uploadedPublicIds: [], uploadedMap: new Map() };
    }
    const uploadedPublicIds = [];
    const uploadedMap = new Map();

    setUploadItems((prev) =>
      prev.map((row) =>
        itemsToUpload.some((item) => item.id === row.id)
          ? { ...row, status: "uploading", progress: 1 }
          : row,
      ),
    );

    const res = await uploadVariantImages(
      itemsToUpload.map((item) => item.file),
      {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent?.total || 0;
          const loaded = progressEvent?.loaded || 0;
          const percent = total > 0 ? Math.round((loaded * 100) / total) : 0;
          setUploadItems((prev) =>
            prev.map((row) =>
              itemsToUpload.some((item) => item.id === row.id)
                ? { ...row, progress: Math.max(1, percent) }
                : row,
            ),
          );
        },
      },
    );

    if (!res?.status || !Array.isArray(res.data) || res.data.length !== itemsToUpload.length) {
      setUploadItems((prev) =>
        prev.map((row) =>
          itemsToUpload.some((item) => item.id === row.id)
            ? { ...row, status: "error", progress: 0 }
            : row,
        ),
      );
      await cleanupUploadedPublicIds(uploadedPublicIds);
      return { status: false };
    }

    itemsToUpload.forEach((item, index) => {
      const uploaded = res.data[index] || {};
      if (uploaded?.publicId) uploadedPublicIds.push(uploaded.publicId);
      uploadedMap.set(item.id, {
        url: uploaded?.url || "",
        publicId: uploaded?.publicId || "",
      });
    });

    const hasInvalid = Array.from(uploadedMap.values()).some(
      (item) => !item.url || !item.publicId,
    );
    if (hasInvalid) {
      setUploadItems((prev) =>
        prev.map((row) =>
          itemsToUpload.some((item) => item.id === row.id)
            ? { ...row, status: "error", progress: 0 }
            : row,
        ),
      );
      await cleanupUploadedPublicIds(uploadedPublicIds);
      return { status: false };
    }

    setUploadItems((prev) =>
      prev.map((row) => {
        const uploaded = uploadedMap.get(row.id);
        if (!uploaded) return row;
        return {
          ...row,
          status: "success",
          progress: 100,
          url: uploaded.url,
          publicId: uploaded.publicId,
        };
      }),
    );

    return { status: true, uploadedPublicIds, uploadedMap };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setErrors(
        Object.entries(validationErrors).map(([path, msg]) => ({
          path,
          msg,
        })),
      );
      return;
    }

    const uploadResult = await uploadNewImagesForSubmit();
    if (!uploadResult?.status) {
      setErrors([
        {
          path: "images",
          msg: "Some images failed to upload. Please retry and submit again.",
        },
      ]);
      return;
    }

    const finalImages = (uploadItemsRef.current || [])
      .map((item) => {
        if (item?.url && item?.publicId) {
          return { url: item.url, publicId: item.publicId };
        }
        const uploaded = uploadResult.uploadedMap.get(item.id);
        if (uploaded?.url && uploaded?.publicId) return uploaded;
        return null;
      })
      .filter(Boolean);

    const sanitizedSizes = (Array.isArray(formData.sizes) ? formData.sizes : [])
      .map((row) => ({
        value: String(row?.value || "").toLowerCase().trim(),
        label: String(row?.label || row?.value || "").trim(),
        sku: String(row?.sku || "").trim(),
        stock: Math.max(0, Math.trunc(Number(row?.stock) || 0)),
        description: String(row?.description || "").trim().slice(0, 500),
      }))
      .filter((row) => row.value);

    const autoSku = generateVariantSku({
      brandCode: String(commonSettings?.abbreviation || "RR").trim(),
      primaryCategory: productDetail?.primaryCategoryId || null,
      productId: formData.productId,
      attributes: formData.attributes || {},
      sizes: sanitizedSizes,
      sortedAttributeCodes,
    });

    const payload = {
      name: String(formData.name || "").trim(),
      shortDescription: String(formData.shortDescription || "").trim(),
      attributes: formData.attributes,
      sku: isSkuManuallyEdited
        ? String(formData.sku || "").trim()
        : autoSku,
      price: Number(formData.price),
      ...buildVariantDiscountPayload(formData),
      status: Number(formData.status) || 1,
      isNewArrival: Boolean(formData.isNewArrival),
      images: finalImages,
      sizes: sanitizedSizes,
      ...(hasSizeAxis
        ? {}
        : { stock: Math.max(0, Math.trunc(Number(formData.stock) || 0)) }),
    };
    const result = await updateProductVariant(variantId, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/product-variants");
      return;
    }
    await cleanupUploadedPublicIds(uploadResult.uploadedPublicIds || []);
  };

  const onCancel = () => {
    navigate("/admin/product-variants");
  };

  if (loading) return <BouncingLoader minHeight="360px" />;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Product Variants", link: "/admin/product-variants" },
          { label: "Edit Variant" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Edit Variant</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ProductVariantForm
              mode="edit"
              productOptions={[]}
              selectedProductId={formData.productId}
              onProductChange={() => {}}
              productName={productDetail?.name || ""}
              productAttributes={productDetail?.attributes || {}}
              productAttributeDefinitions={productAttributeDefinitions}
              productLocked
              variantAttributeDefinitions={variantAttributeDefinitions}
              formData={formData}
              onInputChange={onInputChange}
              onAttributeChange={onAttributeChange}
              onSizesChange={onSizesChange}
              onUploadImages={onUploadImages}
              onRetryImageUpload={onRetryImageUpload}
              onRemoveImageUpload={onRemoveImageUpload}
              uploadingImages={uploadingImages}
              uploadItems={uploadItems}
              localErrors={localErrors}
            />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={onCancel}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme btn--disabled-theme"
                disabled={loadingSubmit || uploadingImages}
              >
                {loadingSubmit ? "Saving..." : "Update Variant"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  productVariantStore: state.productVariant,
  attributeStore: state.attribute,
  commonSettings: state.common?.commonSettings || {},
});

export default connect(mapStateToProps, {
  getProductVariantById,
  getProductById,
  getAttributeList,
  getVariantsByProductId,
  getCommonSettings,
  updateProductVariant,
  cleanupVariantUploadedImages,
  uploadVariantImages,
  setErrors,
  removeErrors,
})(ProductVariantEdit);
