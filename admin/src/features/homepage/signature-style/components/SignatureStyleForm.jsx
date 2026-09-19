import { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Col, Form, Row } from "react-bootstrap";
import CustomSelect from "@src/components/common/CustomSelect";
import { fetchProductsForSelect } from "@src/features/e-commerce/catalog/product/productActions";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => String(item.value) === String(value)) ||
  STATUS_OPTIONS[0];

const SignatureStyleForm = ({
  formData,
  onInputChange,
  onProductChange,
  fetchProductsForSelect,
  isEditMode = false,
  existingImageUrl = "",
}) => {
  const [objectUrl, setObjectUrl] = useState("");
  useEffect(() => {
    if (formData.image instanceof File) {
      const u = URL.createObjectURL(formData.image);
      setObjectUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setObjectUrl("");
    return undefined;
  }, [formData.image]);

  const loadProductOptions = useCallback(async () => {
    const result = await fetchProductsForSelect({ limit: 100 });
    const products = result?.status ? result.data : [];
    return {
      data: products.map((p) => ({
        value: String(p._id),
        label: `${p.name} (${p.slug})`,
        slug: p.slug,
      })),
    };
  }, [fetchProductsForSelect]);

  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  const previewSrc =
    objectUrl || (isEditMode && existingImageUrl ? existingImageUrl : "");

  const selectedProduct =
    formData.productId != null && String(formData.productId).trim() !== ""
      ? {
          value: String(formData.productId),
          label: formData.productLabel || String(formData.productId),
        }
      : null;

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Heading *</Form.Label>
          <Form.Control
            name="title"
            value={formData.title}
            onChange={onInputChange}
            required
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Subheading</Form.Label>
          <Form.Control
            name="subtitle"
            value={formData.subtitle}
            onChange={onInputChange}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Product *</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={selectedProduct}
            onChange={(option) => onProductChange(option)}
            loadOptions={loadProductOptions}
            placeholder="Select product (links to collection)"
            isRequired
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Collection path</Form.Label>
          <Form.Control
            readOnly
            value={formData.collectionPath || ""}
            placeholder="/collection/your-product-slug"
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Image {!isEditMode && "*"}</Form.Label>
          <Form.Control
            type="file"
            name="image"
            onChange={onInputChange}
            accept="image/*"
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOption(formData.isActive)}
            onChange={(option) =>
              onInputChange({
                target: { name: "isActive", value: option?.value ?? "true" },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
      {previewSrc ? (
        <Col xs={12}>
          <div className="border rounded p-2 d-inline-block bg-light">
            <img
              src={previewSrc}
              alt=""
              className="d-block"
              style={{
                maxHeight: "200px",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </Col>
      ) : null}
    </Row>
  );
};

export default connect(null, { fetchProductsForSelect })(SignatureStyleForm);
