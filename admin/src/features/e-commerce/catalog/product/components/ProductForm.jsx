import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import Errors from "@src/notifications/Errors";
import ProductSizeChart from "@src/features/e-commerce/catalog/product/components/ProductSizeChart";

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Draft" },
  { value: 3, label: "Inactive" },
];

const getStatusOptionByValue = (value) =>
  STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) || null;

const ProductForm = ({
  formData,
  onInputChange,
  onAttributeChange,
  onFieldBlur,
  searchKeywordsInput = "",
  onSearchKeywordsChange,
  seoKeywordsInput = "",
  onSeoKeywordsChange,
  localErrors = {},
  primaryCategoryOptions = [],
  categoryOptions = [],
  attributeSetOptions = [],
  claimPolicyOptions = [],
  attributeDefinitions = [],
  onSizeChartChange,
}) => {
  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);
  const loadPrimaryCategoryOptions = useCallback(
    () => primaryCategoryOptions,
    [primaryCategoryOptions],
  );
  const loadAttributeSetOptions = useCallback(
    () => attributeSetOptions,
    [attributeSetOptions],
  );
  const loadCategoryOptions = useCallback(
    () => categoryOptions,
    [categoryOptions],
  );
  const loadClaimPolicyOptions = useCallback(
    () => claimPolicyOptions,
    [claimPolicyOptions],
  );

  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  const selectedPrimaryCategoryOption =
    (primaryCategoryOptions || []).find(
      (item) => String(item.value) === String(formData.primaryCategoryId || ""),
    ) || null;
  const selectedAttributeSetOption =
    (attributeSetOptions || []).find(
      (item) => String(item.value) === String(formData.attributeSetId || ""),
    ) || null;
  const selectedCategoryOptions = (categoryOptions || []).filter((item) =>
    (formData.categoryIds || []).map(String).includes(String(item.value)),
  );
  const selectedClaimPolicyOption =
    (claimPolicyOptions || []).find(
      (item) => String(item.value) === String(formData.claimPolicyId || ""),
    ) || null;

  return (
    <Row className="g-3">
      <Col md={12}>
        <h6 className="mb-1">Basic Info</h6>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Name *</Form.Label>
          <Form.Control
            name="name"
            value={formData.name}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={120}
          />
          <Errors current_key="name" message={localErrors.name} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Search Keywords</Form.Label>
          <Form.Control
            name="searchKeywords"
            value={searchKeywordsInput}
            onChange={onSearchKeywordsChange}
            placeholder="nike, running shoes, sports"
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Slug *</Form.Label>
          <Form.Control name="slug" value={formData.slug} readOnly maxLength={140} />
          <Errors current_key="slug" message={localErrors.slug} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <h6 className="mb-1 mt-2">Description</h6>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            name="description"
            value={formData.description || ""}
            onChange={onInputChange}
            onBlur={handleBlur}
            placeholder="Write short product description"
          />
          <Errors current_key="description" message={localErrors.description} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <h6 className="mb-1 mt-2">SEO</h6>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Meta Title</Form.Label>
          <Form.Control
            name="seo.metaTitle"
            value={formData?.seo?.metaTitle || ""}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors
            current_key="seo.metaTitle"
            message={localErrors["seo.metaTitle"]}
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Meta Keywords</Form.Label>
          <Form.Control
            name="seo.metaKeywords"
            value={seoKeywordsInput}
            onChange={onSeoKeywordsChange}
            onBlur={handleBlur}
            placeholder="nike shoes, running"
          />
          <Errors
            current_key="seo.metaKeywords"
            message={localErrors["seo.metaKeywords"]}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Meta Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="seo.metaDescription"
            value={formData?.seo?.metaDescription || ""}
            onChange={onInputChange}
            onBlur={handleBlur}
          />
          <Errors
            current_key="seo.metaDescription"
            message={localErrors["seo.metaDescription"]}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Delivery Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="deliveryDescription"
            value={formData.deliveryDescription || ""}
            onChange={onInputChange}
            onBlur={handleBlur}
            placeholder="Usually ships within 7 to 10 working days (India) & 15 to 20 days (Overseas)"
          />
          <Errors
            current_key="deliveryDescription"
            message={localErrors.deliveryDescription}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Purchase Note</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="purchaseNote"
            value={formData.purchaseNote || ""}
            onChange={onInputChange}
            onBlur={handleBlur}
            placeholder="Prices are provided solely for Bandhgala Jacket. Please note that accessories, jewelry, buttons, and other items displayed are not part of this purchase."
          />
          <Errors
            current_key="purchaseNote"
            message={localErrors.purchaseNote}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <h6 className="mb-1 mt-2">Category</h6>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Primary Category *</Form.Label>
          <CustomSelect
            key={`product-primary-category-form-${primaryCategoryOptions.length}`}
            className="entity-form__select"
            value={selectedPrimaryCategoryOption}
            onChange={(option) =>
              onInputChange({
                target: {
                  name: "primaryCategoryId",
                  value: option?.value ?? "",
                },
              })
            }
            loadOptions={loadPrimaryCategoryOptions}
            placeholder="Select primary category"
            isRequired
          />
          <Errors current_key="primaryCategoryId" message={localErrors.primaryCategoryId} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Categories</Form.Label>
          <CustomSelect
            key={`product-categories-form-${categoryOptions.length}`}
            className="entity-form__select"
            value={selectedCategoryOptions}
            onChange={(options) =>
              onInputChange({
                target: {
                  name: "categoryIds",
                  value: Array.isArray(options)
                    ? options.map((option) => option.value)
                    : [],
                },
              })
            }
            loadOptions={loadCategoryOptions}
            placeholder="Select categories"
            isMulti
          />
          <Errors current_key="categoryIds" message={localErrors.categoryIds} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <h6 className="mb-1 mt-2">Attribute Set</h6>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Attribute Set *</Form.Label>
          <CustomSelect
            key={`product-attribute-set-form-${attributeSetOptions.length}`}
            className="entity-form__select"
            value={selectedAttributeSetOption}
            onChange={(option) =>
              onInputChange({
                target: { name: "attributeSetId", value: option?.value ?? "" },
              })
            }
            loadOptions={loadAttributeSetOptions}
            placeholder="Select attribute set"
            isRequired
          />
          <Errors current_key="attributeSetId" message={localErrors.attributeSetId} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOptionByValue(formData.status)}
            onChange={(option) =>
              onInputChange({
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
        <h6 className="mb-1 mt-2">Claims</h6>
      </Col>
      <Col md={4}>
        <Form.Group className="mb-2">
          <label className="custom-checkbox mt-4">
            <input
              id="product-claims-enabled"
              type="checkbox"
              checked={Boolean(formData.claimsEnabled)}
              onChange={(e) =>
                onInputChange({
                  target: { name: "claimsEnabled", value: e.target.checked },
                })
              }
            />
            <span>Enable claims for this product</span>
          </label>
        </Form.Group>
      </Col>
      <Col md={8}>
        <Form.Group>
          <Form.Label>Claim policy</Form.Label>
          <CustomSelect
            key={`product-claim-policy-form-${claimPolicyOptions.length}`}
            className="entity-form__select"
            value={selectedClaimPolicyOption}
            onChange={(option) =>
              onInputChange({
                target: { name: "claimPolicyId", value: option?.value ?? "" },
              })
            }
            loadOptions={loadClaimPolicyOptions}
            placeholder={
              formData.claimsEnabled ? "Select claim policy" : "Enable claims to select policy"
            }
            isDisabled={!formData.claimsEnabled}
          />
          <Errors current_key="claimPolicyId" message={localErrors.claimPolicyId} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <div className="pv-size-chart-section">
          <div className="pv-size-chart-section__header">
            <h6 className="mb-0">Size Chart (optional)</h6>
            <span className="pv-size-chart-section__badge">
              {formData?.sizeChart?.sizes?.length || 0} sizes ·{" "}
              {formData?.sizeChart?.rows?.length || 0} rows
            </span>
          </div>
          <p className="small text-light opacity-75 mb-3">
            Build a fully custom size chart for this product. Add ANY sizes
            (XS, S, M, L, XL, XXL, XXXL, FREE SIZE...) and ANY measurements
            (LENGTH, CHEST, TUMMY, HIP, COLLAR, SHOULDER, SLV. LENGTH, BICEP,
            ARMHOLE...). One chart per product is shared by all variants.
            Leave empty for products that don&apos;t need a chart (belts,
            pocket squares, stoles, etc.). Values are in centimetres — the
            storefront shows a CM / INCHES toggle.
          </p>
          <ProductSizeChart
            chart={
              formData.sizeChart && typeof formData.sizeChart === "object"
                ? formData.sizeChart
                : { sizes: [], rows: [] }
            }
            onChange={onSizeChartChange}
          />
        </div>
      </Col>
      {formData.attributeSetId && Array.isArray(attributeDefinitions) ? (
        <>
          <Col md={12}>
            <h6 className="mb-1 mt-2">Product Attributes</h6>
          </Col>
          {attributeDefinitions
            .filter((attribute) => attribute?.isVariant === false)
            .map((attribute) => {
              const code = attribute?.code || "";
              const fieldName = `attributes.${code}`;
              const fieldValue = formData?.attributes?.[code];
              const selectOptions = (attribute?.options || []).map((item) => ({
                value: item.value,
                label: item.label,
              }));
              const selectedAttributeOption =
                selectOptions.find(
                  (item) => String(item.value) === String(fieldValue ?? ""),
                ) || null;

              return (
                <Col md={6} key={`product-attribute-${attribute?._id || code}`}>
                  <Form.Group>
                    <Form.Label>
                      {attribute?.name}
                      {attribute?.isRequired ? " *" : ""}
                    </Form.Label>
                    {attribute?.inputType === "text" ? (
                      <Form.Control
                        type="text"
                        value={fieldValue ?? ""}
                        onChange={(e) => onAttributeChange?.(code, e.target.value)}
                      />
                    ) : null}
                    {attribute?.inputType === "number" ? (
                      <Form.Control
                        type="number"
                        value={fieldValue ?? ""}
                        onChange={(e) => onAttributeChange?.(code, e.target.value)}
                      />
                    ) : null}
                    {attribute?.inputType === "boolean" ? (
                      <label className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(fieldValue)}
                          onChange={(e) => onAttributeChange?.(code, e.target.checked)}
                        />
                        <span>Yes</span>
                      </label>
                    ) : null}
                    {attribute?.inputType === "select" ? (
                      <CustomSelect
                        key={`product-attribute-select-${code}-${selectOptions.length}`}
                        className="entity-form__select"
                        value={selectedAttributeOption}
                        onChange={(option) => onAttributeChange?.(code, option?.value ?? "")}
                        loadOptions={() => selectOptions}
                        placeholder="Select option"
                      />
                    ) : null}
                    <Errors current_key={fieldName} message={localErrors[fieldName]} />
                  </Form.Group>
                </Col>
              );
            })}
        </>
      ) : null}
    </Row>
  );
};

export default ProductForm;
