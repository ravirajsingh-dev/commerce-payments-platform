import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Col, Form, ListGroup, Row } from "react-bootstrap";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomSelect from "@src/components/common/CustomSelect";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import Errors from "@src/notifications/Errors";
import { getProductVariantById } from "@src/features/e-commerce/catalog/product-variant/productVariantActions";
import {
  createStockAdjustment,
  fetchStockAdjustmentReasons,
  searchVariantsBySku,
} from "../inventoryActions";

const EMPTY_FORM = {
  delta: "",
  reason: "",
  size: "",
};

const StockAdjustmentModal = ({
  show,
  onHide,
  onAdjusted,
  createStockAdjustment,
  fetchStockAdjustmentReasons,
  searchVariantsBySku,
  getProductVariantById,
}) => {
  const [skuQuery, setSkuQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const resetModal = useCallback(() => {
    setSkuQuery("");
    setSearchResults([]);
    setSelectedVariant(null);
    setForm(EMPTY_FORM);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!show) {
      resetModal();
      return;
    }
    const loadReasons = async () => {
      const res = await fetchStockAdjustmentReasons();
      if (res?.status) {
        setReasons(res.data || []);
      }
    };
    loadReasons();
  }, [show, fetchStockAdjustmentReasons, resetModal]);

  useEffect(() => {
    if (!show) return undefined;
    const term = skuQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await searchVariantsBySku(term);
      setSearchResults(res?.status ? res.data : []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [skuQuery, searchVariantsBySku, show]);

  const sizedRows = useMemo(() => {
    const sizes = selectedVariant?.sizes;
    return Array.isArray(sizes) && sizes.length > 0 ? sizes : [];
  }, [selectedVariant]);

  const isSized = sizedRows.length > 0;

  const sizeOptions = useMemo(
    () =>
      sizedRows.map((row) => ({
        value: row.value,
        label: `${row.label || row.value} · ${row.stock ?? 0} in stock`,
      })),
    [sizedRows],
  );

  const loadSizeOptions = useCallback(() => sizeOptions, [sizeOptions]);
  const loadReasonOptions = useCallback(() => reasons, [reasons]);

  const selectedSizeOption = useMemo(
    () => sizeOptions.find((item) => item.value === form.size) ?? null,
    [sizeOptions, form.size],
  );

  const selectedReasonOption = useMemo(
    () => reasons.find((item) => item.value === form.reason) ?? null,
    [reasons, form.reason],
  );

  const currentStock = useMemo(() => {
    if (!selectedVariant) return null;
    if (isSized) {
      const row = sizedRows.find(
        (item) =>
          String(item.value || "").toLowerCase() ===
          String(form.size || "").toLowerCase(),
      );
      return row ? Math.max(0, Number(row.stock) || 0) : null;
    }
    return Math.max(0, Number(selectedVariant.stock) || 0);
  }, [selectedVariant, isSized, sizedRows, form.size]);

  const parsedDelta = Number(form.delta);
  const projectedStock = useMemo(() => {
    if (currentStock === null || !Number.isInteger(parsedDelta)) return null;
    return Math.max(0, currentStock + parsedDelta);
  }, [currentStock, parsedDelta]);

  const selectVariant = useCallback(
    async (row) => {
      if (!row?._id) return;
      setSkuQuery(row.sku || "");
      setSearchResults([]);
      setLoadingVariant(true);
      setForm(EMPTY_FORM);

      const res = await getProductVariantById(String(row._id));
      if (res?.status) {
        const variant = res.data;
        setSelectedVariant(variant);
        const firstSize =
          Array.isArray(variant.sizes) && variant.sizes.length > 0
            ? variant.sizes[0].value
            : "";
        setForm((prev) => ({ ...prev, size: firstSize }));
      } else {
        setSelectedVariant(null);
      }
      setLoadingVariant(false);
    },
    [getProductVariantById],
  );

  const clearSelection = () => {
    setSelectedVariant(null);
    setSkuQuery("");
    setSearchResults([]);
    setForm(EMPTY_FORM);
  };

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canSubmit =
    selectedVariant &&
    Number.isInteger(parsedDelta) &&
    parsedDelta !== 0 &&
    form.reason &&
    (!isSized || form.size) &&
    !submitting;

  const handleClose = () => {
    if (submitting) return;
    resetModal();
    onHide();
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    setSubmitting(true);
    const payload = {
      variantId: String(selectedVariant._id),
      delta: parsedDelta,
      reason: form.reason,
    };
    if (isSized) {
      payload.size = form.size;
    }

    const res = await createStockAdjustment(payload);
    if (res?.status) {
      onAdjusted?.(res.data);
      handleClose();
    }
    setSubmitting(false);
  };

  const productName =
    selectedVariant?.productId?.name || selectedVariant?.productName || "";

  const showSearchHint = skuQuery.trim().length > 0 && skuQuery.trim().length < 2;
  const showNoResults =
    !selectedVariant &&
    !searching &&
    skuQuery.trim().length >= 2 &&
    searchResults.length === 0;

  return (
    <AdvancedModal
      show={show}
      onHide={handleClose}
      title="Adjust stock"
      size="lg"
      closeButton
      bodyClassName="common-modal-body--start admin-inventory-adjust-modal"
      actions={[
        {
          label: "Cancel",
          onClick: handleClose,
          className: "btn btn--outline",
          colSize: 5,
          disabled: submitting,
        },
        {
          label: submitting ? "Saving…" : "Apply adjustment",
          onClick: onSubmit,
          className: "btn btn--theme",
          colSize: 7,
          disabled: !canSubmit,
        },
      ]}
    >
      <p className="admin-inventory-adjust-modal__intro">
        Find a catalog SKU, review current stock, then add or remove units. Use a
        positive number to receive stock and a negative number to remove it.
      </p>

      <section className="admin-inventory-adjust-modal__section" aria-labelledby="adjust-step-find">
        <h6 id="adjust-step-find" className="admin-inventory-adjust-modal__step-title">
          1. Find variant
        </h6>
        <Form.Group className="mb-0">
          <Form.Label htmlFor="stock-adjust-sku-search" className="form-sub-label">
            SKU search
          </Form.Label>
          <Form.Control
            id="stock-adjust-sku-search"
            name="skuQuery"
            value={skuQuery}
            onChange={(e) => {
              setSkuQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSelectedVariant(null);
              }
            }}
            placeholder="Type at least 2 characters of the SKU"
            autoComplete="off"
            disabled={submitting}
          />
          {showSearchHint ? (
            <Form.Text className="text-muted">
              Keep typing — search starts after 2 characters.
            </Form.Text>
          ) : null}
        </Form.Group>

        {searching ? <BouncingLoader minHeight="72px" /> : null}

        {!selectedVariant && searchResults.length > 0 ? (
          <ListGroup className="admin-inventory-sku-search mt-2">
            {searchResults.map((row) => (
              <ListGroup.Item
                key={String(row._id)}
                action
                onClick={() => selectVariant(row)}
                disabled={submitting}
              >
                <div className="admin-inventory-sku-search__row">
                  <span className="admin-inventory-sku-search__sku">{row.sku}</span>
                  <span className="admin-inventory-sku-search__stock">
                    {row.stock ?? 0} units
                  </span>
                </div>
                {row.productName ? (
                  <span className="admin-inventory-sku-search__product">
                    {row.productName}
                  </span>
                ) : null}
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : null}

        {showNoResults ? (
          <p className="admin-inventory-adjust-modal__empty-hint mb-0 mt-2">
            No variants matched that SKU. Try a different search term.
          </p>
        ) : null}
      </section>

      {loadingVariant ? (
        <BouncingLoader minHeight="100px" />
      ) : null}

      {selectedVariant && !loadingVariant ? (
        <>
          <section
            className="admin-inventory-adjust-modal__section"
            aria-labelledby="adjust-step-review"
          >
            <div className="admin-inventory-adjust-modal__section-head">
              <h6
                id="adjust-step-review"
                className="admin-inventory-adjust-modal__step-title mb-0"
              >
                2. Selected variant
              </h6>
              <button
                type="button"
                className="btn btn--outline btn-sm"
                onClick={clearSelection}
                disabled={submitting}
              >
                Change SKU
              </button>
            </div>

            <div className="admin-inventory-selected-variant">
              <p className="admin-inventory-selected-variant__sku mb-1">
                {selectedVariant.sku}
              </p>
              {productName ? (
                <p className="admin-inventory-selected-variant__product mb-3">
                  {productName}
                </p>
              ) : null}

              <div className="admin-inventory-stock-preview">
                <div className="admin-inventory-stock-preview__item">
                  <span className="admin-inventory-stock-preview__label">Current</span>
                  <strong>
                    {isSized && form.size
                      ? `${currentStock ?? "—"} (${form.size})`
                      : currentStock ?? "—"}
                  </strong>
                </div>
                {isSized ? (
                  <div className="admin-inventory-stock-preview__item">
                    <span className="admin-inventory-stock-preview__label">
                      Total (all sizes)
                    </span>
                    <strong>{selectedVariant.stock ?? 0}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section
            className="admin-inventory-adjust-modal__section"
            aria-labelledby="adjust-step-details"
          >
            <h6
              id="adjust-step-details"
              className="admin-inventory-adjust-modal__step-title"
            >
              3. Adjustment details
            </h6>

            <Form onSubmit={onSubmit}>
              <Row className="g-3">
                {isSized ? (
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label className="form-sub-label">Size</Form.Label>
                      <CustomSelect
                        className="entity-form__select"
                        value={selectedSizeOption}
                        onChange={(option) =>
                          setForm((prev) => ({
                            ...prev,
                            size: option?.value ?? "",
                          }))
                        }
                        loadOptions={loadSizeOptions}
                        isDisabled={submitting}
                        placeholder="Select size"
                      />
                      <Errors current_key="size" />
                    </Form.Group>
                  </Col>
                ) : null}

                <Col xs={12} md={isSized ? 6 : 12}>
                  <Form.Group>
                    <Form.Label className="form-sub-label">
                      Quantity change
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="delta"
                      value={form.delta}
                      onChange={onFieldChange}
                      placeholder="e.g. 10 to add, -3 to remove"
                      disabled={submitting}
                      inputMode="numeric"
                    />
                    <Form.Text className="text-muted">
                      Enter + to add units or − to remove (e.g. 5 or -2).
                    </Form.Text>
                    <Errors current_key="delta" />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label className="form-sub-label">Reason</Form.Label>
                    <CustomSelect
                      className="entity-form__select"
                      value={selectedReasonOption}
                      onChange={(option) =>
                        setForm((prev) => ({
                          ...prev,
                          reason: option?.value ?? "",
                        }))
                      }
                      loadOptions={loadReasonOptions}
                      isDisabled={submitting}
                      placeholder="Select a reason"
                    />
                    <Errors current_key="reason" />
                  </Form.Group>
                </Col>

                {projectedStock !== null && Number.isInteger(parsedDelta) ? (
                  <Col xs={12}>
                    <div
                      className={`admin-inventory-stock-preview admin-inventory-stock-preview--result ${
                        parsedDelta < 0 ? "is-decrease" : "is-increase"
                      }`}
                    >
                      <span className="admin-inventory-stock-preview__label">
                        After adjustment
                      </span>
                      <strong>{projectedStock} units</strong>
                      {parsedDelta < 0 && projectedStock === 0 ? (
                        <span className="admin-inventory-stock-preview__note">
                          This will mark the SKU as out of stock.
                        </span>
                      ) : null}
                    </div>
                  </Col>
                ) : null}
              </Row>
            </Form>
          </section>
        </>
      ) : null}
    </AdvancedModal>
  );
};

export default connect(null, {
  createStockAdjustment,
  fetchStockAdjustmentReasons,
  searchVariantsBySku,
  getProductVariantById,
})(StockAdjustmentModal);
