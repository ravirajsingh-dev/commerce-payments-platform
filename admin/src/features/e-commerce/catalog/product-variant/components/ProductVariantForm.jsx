import { useCallback, useMemo, useState } from "react";
import { Col, Form, Modal, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import { formatInr } from "@src/features/e-commerce/coupons/couponHelpers";
import {
  VARIANT_DISCOUNT_TYPE_OPTIONS,
  computeVariantSalePrice,
  getVariantDiscountTypeOptionByValue,
  variantHasDiscount,
} from "@src/features/e-commerce/catalog/product-variant/variantHelpers";

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Draft" },
  { value: 3, label: "Inactive" },
];

/**
 * Codes that represent the per-variant stock axis (Size). When the product's attribute set
 * exposes one of these, the form renders a dedicated Sizes section (multi-select + per-size
 * stock) instead of treating size as a regular variant attribute. This keeps every "look"
 * as a single variant document with embedded per-size stock — no more one-variant-per-size.
 */
const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);
const isSizeCode = (code) => SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

const getStatusOptionByValue = (value) =>
  STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) || null;

const ProductVariantForm = ({
  productOptions = [],
  selectedProductId = "",
  onProductChange,
  productName = "",
  productLocked = false,
  hideProductSelect = false,
  productAttributes = {},
  productAttributeDefinitions = [],
  variantAttributeDefinitions = [],
  formData,
  onInputChange,
  onAttributeChange,
  /**
   * When `true` (create mode) attributes accept multi-select so admin can bulk-create
   * multiple variants (e.g. one per size) in a single request.
   */
  multiValueAttributes = false,
  onMultiAttributeChange,
  onSizesChange,
  onUploadImages,
  onRetryImageUpload,
  onRemoveImageUpload,
  uploadingImages = false,
  uploadItems = [],
  localErrors = {},
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const loadProductOptions = useCallback(
    () => productOptions,
    [productOptions],
  );
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  const selectedProductOption =
    (productOptions || []).find(
      (item) => String(item.value) === String(selectedProductId || ""),
    ) || null;

  const selectedStatusOption = getStatusOptionByValue(formData.status);
  const selectedDiscountTypeOption = getVariantDiscountTypeOptionByValue(
    formData.discountType,
  );
  const hasDiscountType = Boolean(String(formData.discountType || "").trim());
  const isPercentageDiscount = formData.discountType === "percentage";

  const pricePreview = useMemo(() => {
    const listPrice = Number(formData.price);
    const salePrice = computeVariantSalePrice(
      formData.price,
      formData.discountType,
      formData.discountValue,
    );
    const onSale = variantHasDiscount({
      price: formData.price,
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      salePrice,
    });
    return {
      listLabel:
        Number.isFinite(listPrice) && formData.price !== ""
          ? formatInr(listPrice)
          : "—",
      saleLabel:
        Number.isFinite(salePrice) && formData.price !== ""
          ? formatInr(salePrice)
          : "—",
      onSale,
    };
  }, [
    formData.price,
    formData.discountType,
    formData.discountValue,
  ]);

  const sizeAttribute = useMemo(
    () =>
      (variantAttributeDefinitions || []).find((def) => isSizeCode(def?.code)) ||
      null,
    [variantAttributeDefinitions],
  );

  const sortedVariantAttributes = useMemo(
    () =>
      [...(variantAttributeDefinitions || [])]
        .filter((def) => !isSizeCode(def?.code))
        .sort((a, b) =>
          String(a?.name || "").localeCompare(String(b?.name || "")),
        ),
    [variantAttributeDefinitions],
  );

  const sizeOptions = useMemo(() => {
    const base = (sizeAttribute?.options || []).map((opt) => ({
      value: String(opt?.value || "").toLowerCase(),
      label: String(opt?.label || opt?.value || ""),
    }));
    const seen = new Set(base.map((o) => o.value));
    const extra = [];
    (Array.isArray(formData.sizes) ? formData.sizes : []).forEach((row) => {
      const v = String(row?.value || "").trim().toLowerCase();
      if (!v || seen.has(v)) return;
      seen.add(v);
      extra.push({
        value: v,
        label: `${String(row?.label || v).trim() || v} (legacy)`,
      });
    });
    return [...base, ...extra];
  }, [sizeAttribute, formData.sizes]);

  const currentSizes = Array.isArray(formData.sizes) ? formData.sizes : [];
  const selectedSizeOptions = sizeOptions.filter((opt) =>
    currentSizes.some(
      (row) => String(row?.value || "").toLowerCase() === opt.value,
    ),
  );

  const handleSizesSelectionChange = (options) => {
    if (!onSizesChange) return;
    const picked = Array.isArray(options) ? options : [];
    // Preserve stock/sku for sizes still selected; new sizes start at stock=0.
    const next = picked.map((opt) => {
      const existing = currentSizes.find(
        (row) => String(row?.value || "").toLowerCase() === opt.value,
      );
      return existing
        ? { ...existing, value: opt.value, label: opt.label }
        : { value: opt.value, label: opt.label, sku: "", stock: 0, description: "" };
    });
    onSizesChange(next);
  };

  const handleSizeStockChange = (sizeValue, rawStock) => {
    if (!onSizesChange) return;
    const cleaned = Math.max(0, Math.trunc(Number(rawStock) || 0));
    onSizesChange(
      currentSizes.map((row) =>
        String(row?.value || "").toLowerCase() === sizeValue
          ? { ...row, stock: cleaned }
          : row,
      ),
    );
  };

  const handleSizeDescriptionChange = (sizeValue, rawText) => {
    if (!onSizesChange) return;
    const text = String(rawText ?? "").slice(0, 500);
    onSizesChange(
      currentSizes.map((row) =>
        String(row?.value || "").toLowerCase() === sizeValue
          ? { ...row, description: text }
          : row,
      ),
    );
  };

  return (
    <>
      <Row className="g-3">
        <Col md={12}>
          <h6 className="mb-1">Basic Info</h6>
        </Col>

        {hideProductSelect ? null : (
        <Col md={6}>
          <Form.Group>
            <Form.Label>Product *</Form.Label>
            {productLocked ? (
              <Form.Control value={productName || "-"} readOnly />
            ) : (
              <CustomSelect
                key={`pv-product-form-${productOptions.length}`}
                className="entity-form__select"
                value={selectedProductOption}
                onChange={(option) =>
                  onProductChange?.({
                    target: { name: "productId", value: option?.value ?? "" },
                  })
                }
                loadOptions={loadProductOptions}
                placeholder="Select product"
                isRequired
              />
            )}
            <Errors current_key="productId" message={localErrors.productId} />
          </Form.Group>
        </Col>
        )}

        <Col md={hideProductSelect ? 12 : 6}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={selectedStatusOption}
              onChange={(option) =>
                onInputChange?.({
                  target: { name: "status", value: option?.value ?? 1 },
                })
              }
              loadOptions={loadStatusOptions}
              placeholder="Select status"
              isRequired
            />
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="isNewArrival"
                checked={Boolean(formData.isNewArrival)}
                onChange={onInputChange}
              />
              <span>Show in New Arrivals</span>
            </label>
            <Form.Text className="text-light opacity-75 d-block mt-1">
              When enabled, this variant appears on the storefront New Arrivals page
              (separate from All Variants).
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group>
            <Form.Label>Display Name</Form.Label>
            <Form.Control
              name="name"
              value={formData.name || ""}
              onChange={onInputChange}
              maxLength={180}
              placeholder="e.g. Nocturne Textured Kurta"
            />
            <Errors current_key="name" message={localErrors.name} />
            <Form.Text className="text-light opacity-75">
              Marketing label shown on the storefront. Leave blank to fall back to
              the parent product name.
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group>
            <Form.Label>Short Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="shortDescription"
              value={formData.shortDescription || ""}
              onChange={onInputChange}
              maxLength={500}
              placeholder="One- or two-line summary shown on the variant card and detail page."
            />
            <Errors
              current_key="shortDescription"
              message={localErrors.shortDescription}
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>SKU *</Form.Label>
            <Form.Control
              name="sku"
              value={formData.sku || ""}
              onChange={onInputChange}
              maxLength={120}
              placeholder="Auto-generated, editable"
            />
            <Errors current_key="sku" message={localErrors.sku} />
            {multiValueAttributes ? (
              <Form.Text className="text-light opacity-75">
                When you pick more than one option in any variant attribute below,
                each combination gets its own SKU generated automatically.
              </Form.Text>
            ) : null}
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>Price (MRP) *</Form.Label>
            <Form.Control
              type="number"
              name="price"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={onInputChange}
              placeholder="Enter price"
            />
            <Errors current_key="price" message={localErrors.price} />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>Discount type</Form.Label>
            <CustomSelect
              className="entity-form__select"
              value={selectedDiscountTypeOption}
              onChange={(option) =>
                onInputChange({
                  target: {
                    name: "discountType",
                    value: option?.value ?? "",
                  },
                })
              }
              loadOptions={() => VARIANT_DISCOUNT_TYPE_OPTIONS}
              placeholder="No discount"
            />
            <Errors
              current_key="discountType"
              message={localErrors.discountType}
            />
          </Form.Group>
        </Col>

        {hasDiscountType ? (
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                {isPercentageDiscount ? "Discount (%)" : "Discount amount (₹)"}
              </Form.Label>
              <Form.Control
                type="number"
                name="discountValue"
                min={0}
                max={isPercentageDiscount ? 100 : undefined}
                step={isPercentageDiscount ? 1 : 0.01}
                value={formData.discountValue}
                onChange={onInputChange}
                placeholder={isPercentageDiscount ? "e.g. 20" : "e.g. 500"}
              />
              <Errors
                current_key="discountValue"
                message={localErrors.discountValue}
              />
              <Form.Text className="text-light opacity-75">
                Shown on the storefront as sale price (MRP minus this discount).
              </Form.Text>
            </Form.Group>
          </Col>
        ) : null}

        <Col md={6}>
          <Form.Group>
            <Form.Label>Price after discount</Form.Label>
            <Form.Control
              readOnly
              value={pricePreview.saleLabel}
              className="bg-dark-subtle"
            />
            <Form.Text className="text-light opacity-75">
              {pricePreview.onSale
                ? `Customer pays ${pricePreview.saleLabel} (MRP ${pricePreview.listLabel})`
                : "Same as MRP when no discount is set."}
            </Form.Text>
          </Form.Group>
        </Col>

        {sizeAttribute ? null : (
          <Col md={6}>
            <Form.Group>
              <Form.Label>Stock *</Form.Label>
              <Form.Control
                type="number"
                name="stock"
                min={0}
                step={1}
                value={formData.stock}
                onChange={onInputChange}
                placeholder="Enter stock"
              />
              <Errors current_key="stock" message={localErrors.stock} />
            </Form.Group>
          </Col>
        )}

        <Col md={12}>
          <h6 className="mb-1 mt-2">Product Attributes (Read Only)</h6>
        </Col>
        {(productAttributeDefinitions || []).length > 0 ? (
          (productAttributeDefinitions || []).map((attribute) => {
            const code = attribute?.code || "";
            const fieldValue = productAttributes?.[code];
            const inputType = attribute?.inputType;
            const selectOptions = (attribute?.options || []).map((item) => ({
              value: item.value,
              label: item.label,
            }));
            const selectedOption =
              selectOptions.find(
                (item) => String(item.value) === String(fieldValue ?? ""),
              ) || null;

            return (
              <Col md={6} key={`pv-product-attr-${attribute?._id || code}`}>
                <Form.Group>
                  <Form.Label>{attribute?.name}</Form.Label>
                  {inputType === "boolean" ? (
                    <label className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(fieldValue)}
                        disabled
                      />
                      <span>Yes</span>
                    </label>
                  ) : inputType === "select" ? (
                    <CustomSelect
                      className="entity-form__select"
                      value={selectedOption}
                      loadOptions={() => selectOptions}
                      isDisabled
                      isRequired={false}
                    />
                  ) : (
                    <input
                      type="text"
                      value={fieldValue ?? ""}
                      readOnly
                      className="form-control"
                    />
                  )}
                </Form.Group>
              </Col>
            );
          })
        ) : (
          <Col md={12}>
            <Form.Group>
              <Form.Label>Product Attributes</Form.Label>
              <input
                type="text"
                value="No product attributes available."
                readOnly
                className="form-control"
              />
            </Form.Group>
          </Col>
        )}

        {sizeAttribute ? (
          <>
            <Col md={12}>
              <h6 className="mb-1 mt-2">
                Sizes &amp; Per-Size Stock
                {sizeAttribute?.isRequired ? " *" : ""}
              </h6>
              <p className="small text-light opacity-75 mb-2">
                Pick every size this variant ships in and enter the stock for each. Optional
                hover text per size (e.g. measurements) appears when customers move the pointer
                over that size on the product page.
              </p>
              <Errors current_key="sizes" message={localErrors.sizes} />
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Available Sizes</Form.Label>
                <CustomSelect
                  key={`pv-sizes-multi-${sizeOptions.length}`}
                  className="entity-form__select"
                  value={selectedSizeOptions}
                  onChange={handleSizesSelectionChange}
                  loadOptions={() => sizeOptions}
                  placeholder="Select sizes (S, M, L, XL, ...)"
                  isMulti
                />
              </Form.Group>
            </Col>
            {currentSizes.length > 0 ? (
              <Col md={12}>
                <Row className="g-2 pv-sizes-grid">
                  {currentSizes.map((row) => (
                    <Col md={4} sm={6} key={`pv-size-row-${row.value}`}>
                      <Form.Group className="pv-size-card">
                        <Form.Label className="pv-size-card__label">
                          <span className="pv-size-card__badge">
                            {row.label || String(row.value || "").toUpperCase()}
                          </span>
                          <small className="pv-size-card__hint">Stock *</small>
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min={0}
                          step={1}
                          value={Number(row.stock || 0)}
                          onChange={(e) =>
                            handleSizeStockChange(row.value, e.target.value)
                          }
                          placeholder="0"
                        />
                        <Errors
                          current_key={`sizes.${row.value}.stock`}
                          message={localErrors[`sizes.${row.value}.stock`]}
                        />
                        <Form.Label className="pv-size-card__sub-label mt-2 mb-1">
                          Hover text (optional)
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={row.description || ""}
                          onChange={(e) =>
                            handleSizeDescriptionChange(row.value, e.target.value)
                          }
                          maxLength={500}
                          placeholder="e.g. CHEST-116.84cm | HIP-116.84cm | SHOULDER-46.99cm"
                        />
                        <Form.Text className="text-light opacity-50 small">
                          {(row.description || "").length}/500
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  ))}
                </Row>
              </Col>
            ) : null}
          </>
        ) : null}

        <Col md={12}>
          <h6 className="mb-1 mt-2">Variant Attributes</h6>
          {multiValueAttributes ? (
            <p className="small text-light opacity-75 mb-2">
              Pick one or more values per attribute — every combination becomes a
              separate variant (e.g. pick Navy + Beige to create two color variants
              in one click). Size is managed in the Sizes section above.
            </p>
          ) : null}
          <Errors current_key="attributes" message={localErrors.attributes} />
        </Col>
        {sortedVariantAttributes.map((attribute) => {
          const code = attribute?.code || "";
          const baseSelectOptions = (attribute?.options || []).map((item) => ({
            value: item.value,
            label: item.label,
          }));
          const rawCurrent = formData.attributes?.[code];
          const currentScalar =
            Array.isArray(rawCurrent) || rawCurrent === undefined || rawCurrent === null
              ? ""
              : String(rawCurrent ?? "").trim();
          const selectOptions =
            !multiValueAttributes &&
            currentScalar &&
            !baseSelectOptions.some(
              (item) => String(item.value) === String(currentScalar),
            )
              ? [
                  ...baseSelectOptions,
                  {
                    value: currentScalar,
                    label: `${currentScalar} (legacy)`,
                  },
                ]
              : baseSelectOptions;

          if (multiValueAttributes) {
            const raw = formData.attributes?.[code];
            const selectedValues = Array.isArray(raw)
              ? raw
              : raw
                ? [raw]
                : [];
            const selectedOptions = selectOptions.filter((item) =>
              selectedValues.map(String).includes(String(item.value)),
            );
            return (
              <Col md={6} key={`pv-attr-${attribute?._id || code}`}>
                <Form.Group>
                  <Form.Label>
                    {attribute?.name}
                    {attribute?.isRequired ? " *" : ""}
                  </Form.Label>
                  <CustomSelect
                    key={`pv-attribute-multi-${code}-${selectOptions.length}`}
                    className="entity-form__select"
                    value={selectedOptions}
                    onChange={(options) => {
                      const values = Array.isArray(options)
                        ? options.map((opt) => opt?.value).filter(Boolean)
                        : [];
                      onMultiAttributeChange?.(code, values);
                    }}
                    loadOptions={() => selectOptions}
                    placeholder={`Select ${attribute?.name || code} (multi)`}
                    isMulti
                  />
                  <Errors
                    current_key={`attributes.${code}`}
                    message={localErrors[`attributes.${code}`]}
                  />
                </Form.Group>
              </Col>
            );
          }

          const selectedOption =
            selectOptions.find(
              (item) =>
                String(item.value) ===
                String(formData.attributes?.[code] || ""),
            ) || null;

          return (
            <Col md={6} key={`pv-attr-${attribute?._id || code}`}>
              <Form.Group>
                <Form.Label>
                  {attribute?.name}
                  {attribute?.isRequired ? " *" : ""}
                </Form.Label>
                <CustomSelect
                  key={`pv-attribute-${code}-${selectOptions.length}`}
                  className="entity-form__select"
                  value={selectedOption}
                  onChange={(option) =>
                    onAttributeChange(code, option?.value ?? "")
                  }
                  loadOptions={() => selectOptions}
                  placeholder={`Select ${attribute?.name || code}`}
                />
                <Errors
                  current_key={`attributes.${code}`}
                  message={localErrors[`attributes.${code}`]}
                />
              </Form.Group>
            </Col>
          );
        })}

        <Col md={12}>
          <h6 className="mb-1 mt-2">Variant Images</h6>
        </Col>
        <Col md={12}>
          <Form.Group>
            <Form.Control
              id="product-variant-image-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => onUploadImages(Array.from(e.target.files || []))}
              disabled={uploadingImages}
              className="d-none"
            />
            <div className="small text-light opacity-75">
              {uploadingImages
                ? "Uploading images..."
                : "You can upload multiple images."}
            </div>
          </Form.Group>

          <div className="small text-light opacity-75 mt-2">
            {
              (uploadItems || []).filter((item) => item.status === "success")
                .length
            }{" "}
            / {(uploadItems || []).length} images selected
          </div>

          <div className="d-flex flex-wrap gap-3 mt-2">
            {(uploadItems || []).map((image) => (
              <div
                key={image.id}
                className={`position-relative rounded overflow-hidden border pv-upload-card ${
                  image.status === "error" ? "border-danger" : ""
                }`}
                style={{ width: "132px" }}
              >
                <img
                  src={image.previewUrl || image.url}
                  alt="Variant"
                  style={{
                    width: "132px",
                    height: "132px",
                    objectFit: "cover",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setPreviewImageUrl(image.previewUrl || image.url)
                  }
                />
                <div className="position-absolute top-0 end-0 p-2">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-white text-decoration-none"
                    onClick={() => onRemoveImageUpload?.(image.id)}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>

                {image.status === "error" ? (
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-white text-decoration-none"
                      onClick={() => onRetryImageUpload?.(image.id)}
                      title="Retry upload"
                    >
                      ↻
                    </button>
                  </div>
                ) : null}

                {image.status === "uploading" ? (
                  <div className="position-absolute start-0 end-0 bottom-0 px-2 pb-2">
                    <div className="progress" style={{ height: "5px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${Math.max(0, Math.min(100, image.progress || 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            <label
              htmlFor="product-variant-image-input"
              className="d-flex align-items-center justify-content-center rounded border border-secondary-subtle text-muted"
              style={{
                width: "132px",
                height: "132px",
                borderStyle: "dashed",
                cursor: uploadingImages ? "not-allowed" : "pointer",
              }}
            >
              <div className="text-center">
                <div
                  className="text-light"
                  style={{ fontSize: "20px", lineHeight: 1 }}
                >
                  +
                </div>
                <small className="text-light opacity-75">Add Image</small>
              </div>
            </label>
          </div>
          <Errors current_key="images" message={localErrors.images} />
        </Col>
      </Row>

      <Modal
        show={Boolean(previewImageUrl)}
        onHide={() => setPreviewImageUrl("")}
        centered
      >
        <Modal.Body className="p-2">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt="Preview"
              style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }}
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ProductVariantForm;
