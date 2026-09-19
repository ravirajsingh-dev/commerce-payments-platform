import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomSelect from "@src/components/common/CustomSelect";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import { getCommonSettings } from "@src/app/state/actions/commonActions";
import Errors from "@src/notifications/Errors";
import {
  getProductById,
  getProductList,
} from "@src/features/e-commerce/catalog/product/productActions";
import { getAttributeList } from "@src/features/e-commerce/catalog/attribute/attributeActions";
import {
  bulkCreateProductVariants,
  cleanupVariantUploadedImages,
  createProductVariant,
  getVariantsByProductId,
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
  // Embedded per-size stock for the variant. When present, replaces the single `stock` field —
  // each variant document represents one "look" with multiple sizes inside it.
  sizes: [],
};

/**
 * Expands a multi-value attribute map into a Cartesian product of single-value maps.
 * Size codes are excluded — sizes are managed in a dedicated array (`formData.sizes`) and
 * embedded into the variant rather than producing a separate variant per size.
 */
const expandAttributeCombinations = (attributes = {}) => {
  const entries = Object.entries(attributes || {})
    .filter(([code]) => !isSizeCode(code))
    .map(([code, value]) => {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
        return [code, cleaned];
      }
      const trimmed = String(value ?? "").trim();
      return [code, trimmed ? [trimmed] : []];
    })
    .filter(([, values]) => values.length > 0);

  if (entries.length === 0) return [{}];

  return entries.reduce(
    (acc, [code, values]) =>
      acc.flatMap((row) => values.map((val) => ({ ...row, [code]: val }))),
    [{}],
  );
};

const ProductVariantCreate = ({
  getProductList,
  getProductById,
  getAttributeList,
  getVariantsByProductId,
  createProductVariant,
  bulkCreateProductVariants,
  cleanupVariantUploadedImages,
  uploadVariantImages,
  setErrors,
  removeErrors,
  getCommonSettings,
  productStore,
  attributeStore,
  commonSettings,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seqRef = useRef(1);
  const existingVariantsRef = useRef([]);
  const uploadItemsRef = useRef([]);
  const [formData, setFormData] = useState(initialFormState);
  const [productDetail, setProductDetail] = useState(null);
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);
  const [uploadItems, setUploadItems] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [step1Errors, setStep1Errors] = useState({});

  useEffect(() => {
    const pre = String(searchParams.get("productId") || "").trim();
    if (pre) setWizardStep(2);
  }, [searchParams]);

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  const { loadingSubmit, products } = productStore;
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
        // Size lives in `sizes`, so it must not affect the SKU/fingerprint sort order.
        .filter((item) => !isSizeCode(item?.code))
        .map((item) => item.code)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
    [variantAttributeDefinitions],
  );

  const productOptions = useMemo(
    () =>
      (products || []).map((item) => ({
        value: item._id,
        label: item.name,
      })),
    [products],
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
    getProductList({
      limit: 100,
      page: 1,
      orderBy: "name",
      ascending: "asc",
    });
  }, [getProductList]);

  useEffect(() => {
    const preselectedProductId = String(
      searchParams.get("productId") || "",
    ).trim();
    if (!preselectedProductId) return;
    setFormData((prev) =>
      prev.productId ? prev : { ...prev, productId: preselectedProductId },
    );
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      if (!formData.productId) {
        setProductDetail(null);
        existingVariantsRef.current = [];
        setFormData((prev) => ({
          ...prev,
          attributes: {},
          sku: "",
          sizes: [],
        }));
        setUploadItems([]);
        setWizardStep(1);
        return;
      }
      const productRes = await getProductById(formData.productId);
      if (!productRes?.status || !productRes?.data) return;

      const nextProduct = productRes.data;
      setProductDetail(nextProduct);
      const attrSetId =
        nextProduct.attributeSetId?._id || nextProduct.attributeSetId || "";
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

      const existingRes = await getVariantsByProductId(formData.productId);
      if (existingRes?.status && Array.isArray(existingRes.data)) {
        existingVariantsRef.current = existingRes.data;
        seqRef.current = existingRes.data.length + 1;
      } else {
        existingVariantsRef.current = [];
        seqRef.current = 1;
      }

      setFormData((prev) => ({
        ...prev,
        attributes: {},
        sku: "",
        sizes: [],
      }));
      setIsSkuManuallyEdited(false);
      setUploadItems([]);
    };
    run();
  }, [
    formData.productId,
    getAttributeList,
    getProductById,
    getVariantsByProductId,
  ]);

  /**
   * Collapses a multi-value attribute map into a representative single-value map so the SKU preview
   * (which describes the first variant the bulk submit will create) stays stable.
   */
  const previewAttributesForSku = useMemo(() => {
    const collapsed = {};
    Object.entries(formData.attributes || {}).forEach(([code, value]) => {
      if (Array.isArray(value)) {
        const first = value.find((item) => String(item ?? "").trim());
        if (first !== undefined) collapsed[code] = first;
      } else if (value !== undefined && value !== null && String(value).trim()) {
        collapsed[code] = value;
      }
    });
    return collapsed;
  }, [formData.attributes]);

  const skuAutoContext = useMemo(
    () => ({
      brandCode: String(commonSettings?.abbreviation || "RR").trim(),
      primaryCategory: productDetail?.primaryCategoryId || null,
      productId: formData.productId,
      attributes: previewAttributesForSku,
      sizes: formData.sizes,
      sortedAttributeCodes,
    }),
    [
      commonSettings?.abbreviation,
      productDetail,
      formData.productId,
      previewAttributesForSku,
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

  const totalCombinationsCount = useMemo(() => {
    const combos = expandAttributeCombinations(formData.attributes);
    return combos.length;
  }, [formData.attributes]);

  const validateForm = () => {
    const errors = {};
    if (!formData.productId) errors.productId = "Please select product.";
    if (totalCombinationsCount <= 1 && !String(formData.sku || "").trim()) {
      errors.sku = "SKU is required.";
    }
    if (
      formData.price === "" ||
      Number.isNaN(Number(formData.price)) ||
      Number(formData.price) < 0
    ) {
      errors.price = "Price must be a valid non-negative number.";
    }
    Object.assign(errors, validateVariantDiscountFields(formData));
    if (hasSizeAxis) {
      // When the product has a size axis, the per-size stocks own inventory.
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
        const value = formData.attributes?.[code];
        const hasValue = Array.isArray(value)
          ? value.filter((item) => String(item ?? "").trim()).length > 0
          : String(value || "").trim().length > 0;
        if (!hasValue) {
          errors[`attributes.${code}`] = "Please select at least one value.";
        }
      });
    return errors;
  };

  const localErrors = useMemo(
    () => (submitAttempted ? validateForm() : {}),
    [submitAttempted, formData, variantAttributeDefinitions],
  );

  const loadProductOptions = useCallback(
    () => productOptions,
    [productOptions],
  );

  const selectedProductOption =
    (productOptions || []).find(
      (item) => String(item.value) === String(formData.productId || ""),
    ) || null;

  const handleWizardContinue = () => {
    if (!formData.productId) {
      setStep1Errors({ productId: "Please select a product." });
      return;
    }
    setStep1Errors({});
    setWizardStep(2);
  };

  const onProductChange = (e) => {
    const value = String(e.target.value || "");
    setStep1Errors({});
    setFormData((prev) => ({ ...prev, productId: value }));
  };

  const onInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    if (name === "sku") setIsSkuManuallyEdited(true);
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const onAttributeChange = (code, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [code]: value,
      },
    }));
  };

  const onMultiAttributeChange = (code, values) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [code]: Array.isArray(values) ? values : [],
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
    if (Object.keys(validationErrors).length > 0) {
      setErrors(
        Object.entries(validationErrors).map(([path, msg]) => ({
          path,
          msg,
        })),
      );
      return;
    }

    const combinations = expandAttributeCombinations(formData.attributes);
    if (combinations.length === 0) {
      setErrors([
        {
          path: "attributes",
          msg: "Please pick a value for at least one variant attribute.",
        },
      ]);
      return;
    }

    // Validate non-size attributes still produce a real combo (skip when only size axis exists).
    const hasMeaningfulCombo = combinations.some(
      (combo) => Object.keys(combo).length > 0,
    );
    if (!hasMeaningfulCombo && !hasSizeAxis) {
      setErrors([
        {
          path: "attributes",
          msg: "Please pick at least one variant attribute value.",
        },
      ]);
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

    const trimmedName = String(formData.name || "").trim();
    const trimmedShortDescription = String(formData.shortDescription || "").trim();
    const priceValue = Number(formData.price);
    const stockValue = Math.max(0, Math.trunc(Number(formData.stock) || 0));
    const statusValue = Number(formData.status) || 1;
    const sanitizedSizes = (Array.isArray(formData.sizes) ? formData.sizes : [])
      .map((row) => ({
        value: String(row?.value || "").toLowerCase().trim(),
        label: String(row?.label || row?.value || "").trim(),
        sku: String(row?.sku || "").trim(),
        stock: Math.max(0, Math.trunc(Number(row?.stock) || 0)),
        description: String(row?.description || "").trim().slice(0, 500),
      }))
      .filter((row) => row.value);

    if (combinations.length === 1) {
      const autoSku = generateVariantSku({
        brandCode: String(commonSettings?.abbreviation || "RR").trim(),
        primaryCategory: productDetail?.primaryCategoryId || null,
        productId: formData.productId,
        attributes: combinations[0],
        sizes: sanitizedSizes,
        sortedAttributeCodes,
      });
      const payload = {
        productId: formData.productId,
        name: trimmedName,
        shortDescription: trimmedShortDescription,
        attributes: combinations[0],
        sku: isSkuManuallyEdited
          ? String(formData.sku || "").trim()
          : autoSku,
        price: priceValue,
        ...buildVariantDiscountPayload(formData),
        status: statusValue,
        isNewArrival: Boolean(formData.isNewArrival),
        images: finalImages,
        sizes: sanitizedSizes,
        ...(hasSizeAxis ? {} : { stock: stockValue }),
      };

      const result = await createProductVariant(payload);
      if (result?.status) {
        removeErrors();
        navigate("/admin/product-variants");
        return;
      }
      await cleanupUploadedPublicIds(uploadResult.uploadedPublicIds || []);
      return;
    }

    const bulkVariants = combinations.map((combo) => ({
      sku: generateVariantSku({
        brandCode: String(commonSettings?.abbreviation || "RR").trim(),
        primaryCategory: productDetail?.primaryCategoryId || null,
        productId: formData.productId,
        attributes: combo,
        sizes: sanitizedSizes,
        sortedAttributeCodes,
      }),
      name: trimmedName,
      shortDescription: trimmedShortDescription,
      attributes: combo,
      price: priceValue,
      ...buildVariantDiscountPayload(formData),
      status: statusValue,
      isNewArrival: Boolean(formData.isNewArrival),
      images: finalImages,
      sizes: sanitizedSizes,
      ...(hasSizeAxis ? {} : { stock: stockValue }),
    }));

    const bulkResult = await bulkCreateProductVariants({
      productId: formData.productId,
      variants: bulkVariants,
    });
    if (bulkResult?.status) {
      removeErrors();
      navigate("/admin/product-variants");
      return;
    }
    await cleanupUploadedPublicIds(uploadResult.uploadedPublicIds || []);
  };

  const onCancel = () => {
    navigate("/admin/product-variants");
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Product Variants", link: "/admin/product-variants" },
          { label: "Add Variant" },
        ]}
      />

      <Card className="common-panel-card">
        <Card.Header>Add Variant</Card.Header>
        <Card.Body>
          {wizardStep === 1 ? (
            <>
              <p className="small text-light opacity-75 mb-3">
                Step 1 of 2 — choose a product. Variant options come only from that
                product&apos;s attribute set.
              </p>
              <Row className="g-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Product *</Form.Label>
                    <CustomSelect
                      key={`pv-wizard-product-${productOptions.length}`}
                      className="entity-form__select"
                      value={selectedProductOption}
                      onChange={(option) =>
                        onProductChange({
                          target: { name: "productId", value: option?.value ?? "" },
                        })
                      }
                      loadOptions={loadProductOptions}
                      placeholder="Select product"
                      isRequired
                    />
                    <Errors current_key="productId" message={step1Errors.productId} />
                  </Form.Group>
                </Col>
              </Row>
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
                  type="button"
                  className="btn btn--theme btn--disabled-theme"
                  onClick={handleWizardContinue}
                >
                  Continue to variant details
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <p className="small text-light opacity-75 mb-0">
                  Step 2 of 2 — one variant per save. Product:{" "}
                  <strong className="text-white">{productDetail?.name || "—"}</strong>
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="text-info p-0"
                  onClick={() => setWizardStep(1)}
                >
                  ← Change product
                </Button>
              </div>
              <ProductVariantForm
                mode="create"
                productOptions={productOptions}
                selectedProductId={formData.productId}
                onProductChange={onProductChange}
                productName={productDetail?.name || ""}
                productLocked
                hideProductSelect
                productAttributes={productDetail?.attributes || {}}
                productAttributeDefinitions={productAttributeDefinitions}
                variantAttributeDefinitions={variantAttributeDefinitions}
                formData={formData}
                onInputChange={onInputChange}
                onAttributeChange={onAttributeChange}
                onMultiAttributeChange={onMultiAttributeChange}
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
                  {loadingSubmit ? "Saving..." : "Create Variant"}
                </Button>
              </div>
            </form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  productStore: state.product,
  attributeStore: state.attribute,
  commonSettings: state.common?.commonSettings || {},
});

export default connect(mapStateToProps, {
  getProductList,
  getProductById,
  getAttributeList,
  getVariantsByProductId,
  createProductVariant,
  bulkCreateProductVariants,
  cleanupVariantUploadedImages,
  uploadVariantImages,
  setErrors,
  removeErrors,
  getCommonSettings,
})(ProductVariantCreate);
