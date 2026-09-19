import { useCallback, useEffect, useMemo, useState } from "react";
import { Container, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { connect } from "react-redux";
import { FaArrowRight, FaCheck, FaShoppingCart } from "react-icons/fa";

import { getStoreVariantDetail } from "@src/app/state/actions/publicActions";
import {
  buildAttributeMatrix,
  buildSizeOptions,
  hasSizeChartData,
} from "@src/utils/productDetailHelpers";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SizeChartModal from "@src/features/public/components/SizeChartModal";
import ProductDetailLightbox from "@src/features/public/components/ProductDetailLightbox";
import ProductRatingSummary from "@src/features/public/components/ProductRatingSummary";
import ProductReviewsSection from "@src/features/public/components/ProductReviewsSection";
import RelatedProductsSection from "@src/features/public/components/RelatedProductsSection";
import VariantPriceDisplay from "@src/features/public/components/VariantPriceDisplay";
import useVariantReviews from "@src/features/public/hooks/useVariantReviews";
import WishlistButton from "@src/features/wishlist/components/WishlistButton";
import { addToCart } from "@src/features/cart/cartActions";
import { setAlert } from "@src/app/state/actions/alert";

const ProductDetail = ({
  isAuthenticated,
  addingToCart,
  addToCart,
  setAlert,
  getStoreVariantDetail,
}) => {
  const { slug = "", variantId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variant, setVariant] = useState(null);
  const [product, setProduct] = useState(null);
  const [variantAttributes, setVariantAttributes] = useState([]);
  const [activeImageUrl, setActiveImageUrl] = useState("");
  const [selectedSizeValue, setSelectedSizeValue] = useState("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const [showCustomerReviews, setShowCustomerReviews] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const reviewsState = useVariantReviews(
    variant?._id ? String(variant._id) : "",
    isAuthenticated,
  );

  const scrollToCustomerReviews = useCallback(() => {
    reviewsState.sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [reviewsState.sectionRef]);

  const openCustomerReviews = useCallback(() => {
    setShowCustomerReviews((visible) => {
      if (visible) {
        window.setTimeout(scrollToCustomerReviews, 0);
      }
      return true;
    });
  }, [scrollToCustomerReviews]);

  useEffect(() => {
    setShowCustomerReviews(false);
  }, [variantId]);

  useEffect(() => {
    if (!showCustomerReviews) return;
    const timer = window.setTimeout(scrollToCustomerReviews, 80);
    return () => window.clearTimeout(timer);
  }, [showCustomerReviews, scrollToCustomerReviews]);

  useEffect(() => {
    let cancelled = false;
    const fetchVariant = async () => {
      setLoading(true);
      setError("");
      const result = await getStoreVariantDetail(variantId);
      if (cancelled) return;
      if (result?.status && result.data) {
        const {
          variant: v,
          product: p,
          variantAttributes: attrs,
          relatedProducts: related,
        } = result.data;
        setVariant(v);
        setProduct(p);
        setVariantAttributes(attrs);
        setRelatedProducts(Array.isArray(related) ? related : []);
        setActiveImageUrl(v?.images?.[0]?.url || "");
      } else {
        setError(result?.message || "Failed to load product details.");
        setVariant(null);
        setProduct(null);
        setVariantAttributes([]);
        setRelatedProducts([]);
      }
      setLoading(false);
    };
    if (variantId) fetchVariant();
    return () => {
      cancelled = true;
    };
  }, [variantId, getStoreVariantDetail]);

  const collectionLink = slug ? `/collection/${encodeURIComponent(slug)}` : "/";

  const displayName =
    String(variant?.name || "").trim() || product?.name || "Product";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: "Collections", link: "/collections" },
      { label: product?.name || "Collection", link: collectionLink },
      { label: displayName, link: null },
    ],
    [collectionLink, product?.name, displayName],
  );

  const attributeMatrix = useMemo(
    () => buildAttributeMatrix(variantAttributes, variant?.attributes || {}),
    [variantAttributes, variant?.attributes],
  );

  const sizeOptions = useMemo(() => buildSizeOptions(variant), [variant]);

  const sizeOptionsKey = useMemo(
    () => sizeOptions.map((row) => `${row.value}:${row.stock}`).join("|"),
    [sizeOptions],
  );

  useEffect(() => {
    if (!variant || sizeOptions.length === 0) {
      setSelectedSizeValue("");
      return;
    }
    setSelectedSizeValue((current) => {
      const match = sizeOptions.find((row) => row.value === current);
      if (match && match.stock > 0) return match.value;
      const firstInStock = sizeOptions.find((row) => row.stock > 0);
      return (firstInStock || sizeOptions[0]).value;
    });
  }, [variant?._id, sizeOptions, sizeOptionsKey]);

  useEffect(() => {
    setJustAddedToCart(false);
  }, [variantId, selectedSizeValue]);

  const selectedSize = useMemo(
    () => sizeOptions.find((row) => row.value === selectedSizeValue) || null,
    [sizeOptions, selectedSizeValue],
  );

  const images = useMemo(
    () => (Array.isArray(variant?.images) ? variant.images : []),
    [variant?.images],
  );

  const heroImage = activeImageUrl || images[0]?.url || "";

  const activeImageIndex = useMemo(() => {
    const i = images.findIndex((img) => img.url === heroImage);
    return i >= 0 ? i : 0;
  }, [images, heroImage]);

  const openLightbox = useCallback(() => {
    if (!heroImage) return;
    setLightboxOpen(true);
  }, [heroImage]);

  const handleLightboxSelectIndex = useCallback(
    (idx) => {
      const row = images[idx];
      if (row?.url) setActiveImageUrl(row.url);
    },
    [images],
  );

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  if (loading) {
    return (
      <section className="product-detail">
        <BouncingLoader />
      </section>
    );
  }

  if (error || !variant || !product) {
    return (
      <section className="product-detail">
        <AppBreadCrumb breadcrumbs={breadcrumbs} />
        <Container className="py-5">
          <NoRecordsFound
            title="Product unavailable"
            description={error || "This product variant could not be loaded."}
          />
        </Container>
      </section>
    );
  }

  const inStock =
    sizeOptions.length > 0
      ? Number(selectedSize?.stock || 0) > 0
      : Number(variant.stock || 0) > 0;
  const deliveryDescription = product.deliveryDescription?.trim() || "";
  const purchaseNote = product.purchaseNote?.trim() || "";
  const productSlug = String(product.slug || slug || "").trim();
  const parentProductLink = productSlug
    ? `/collection/${encodeURIComponent(productSlug)}`
    : "/collections";
  const productNameTag = String(product.name || "").trim();
  const showStockLine = Boolean(inStock || deliveryDescription);
  const requiresSize = sizeOptions.length > 0;
  const canAddToCart =
    inStock && (!requiresSize || Boolean(selectedSizeValue));

  const onAddToCartClick = async () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }
    if (requiresSize && !selectedSizeValue) {
      setAlert("Please select a size.", "warning");
      return;
    }
    if (!canAddToCart) return;
    const cart = await addToCart({
      variantId,
      ...(requiresSize ? { size: selectedSizeValue } : {}),
      qty: 1,
    });
    if (cart) setJustAddedToCart(true);
  };

  const displaySku =
    selectedSize?.sku ||
    (selectedSize?.value && variant.sku
      ? `${variant.sku}-${String(selectedSize.value).toUpperCase()}`
      : variant.sku || "-");

  return (
    <section className="product-detail">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="py-5">
        <Row className="g-4 g-lg-5">
          <Col xs={12} lg={6}>
            <div className="product-detail__gallery">
              <div className="product-detail__hero-wrap">
                <WishlistButton
                  variantId={variantId}
                  showLabel={false}
                  className="product-detail__gallery-wishlist"
                />
                <button
                  type="button"
                  className="product-detail__hero"
                  style={
                    heroImage
                      ? { backgroundImage: `url(${encodeURI(heroImage)})` }
                      : undefined
                  }
                  onClick={openLightbox}
                  disabled={!heroImage}
                  aria-label={
                    heroImage
                      ? "Open large product image viewer"
                      : "No image available"
                  }
                >
                  {!heroImage ? (
                    <span className="product-detail__hero-placeholder">
                      {displayName}
                    </span>
                  ) : null}
                </button>
              </div>

              {images.length > 1 ? (
                <div className="product-detail__thumbs">
                  {images.map((image) => {
                    const isActive = image.url === heroImage;
                    return (
                      <button
                        type="button"
                        key={image.publicId || image.url}
                        className={`product-detail__thumb${
                          isActive ? " product-detail__thumb--active" : ""
                        }`}
                        style={{
                          backgroundImage: `url(${encodeURI(image.url)})`,
                        }}
                        onClick={() => setActiveImageUrl(image.url)}
                        aria-label={`View image ${image.publicId || ""}`}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Col>

          <Col xs={12} lg={6}>
            <div className="product-detail__info">
              <h1 className="product-detail__title">{displayName}</h1>

              {variant.shortDescription ? (
                <p className="product-detail__short-description">
                  {variant.shortDescription}
                </p>
              ) : null}

              <ProductRatingSummary
                key={variantId}
                summary={reviewsState.summary}
                loading={reviewsState.loading}
                onOpenReviews={openCustomerReviews}
              />

              <VariantPriceDisplay
                variant={variant}
                className="product-detail__price"
                priceValueClassName="product-detail__price-value"
                priceNote="MRP Inclusive of All Taxes"
                priceNoteClassName="product-detail__price-note"
              />

              {hasSizeChartData(product.sizeChart) && sizeOptions.length > 0 ? (
                <div className="product-detail__size-chart-wrap product-detail__size-chart-wrap--before-size">
                  <button
                    type="button"
                    className="product-detail__size-chart-link"
                    onClick={() => setShowSizeChart(true)}
                  >
                    Size Chart
                  </button>
                </div>
              ) : null}

              {sizeOptions.length > 0 ? (
                <div className="product-detail__attributes">
                  <div className="product-detail__attribute-row">
                    <span className="product-detail__attribute-label">Size</span>
                    <div className="product-detail__attribute-options">
                      {sizeOptions.map((option) => {
                        const isSelected = option.value === selectedSizeValue;
                        const isOos = option.stock <= 0;
                        const cls = [
                          "product-detail__attribute-chip",
                          isSelected
                            ? "product-detail__attribute-chip--selected"
                            : "",
                          isOos ? "product-detail__attribute-chip--oos" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const hoverText = String(
                          option.description || "",
                        ).trim();
                        const fallbackTitle = isOos
                          ? `${option.label} (Out of stock)`
                          : option.label;

                        const srHint = hoverText
                          ? `${option.label}: ${hoverText.slice(0, 240)}${
                              hoverText.length > 240 ? "…" : ""
                            }`
                          : fallbackTitle;

                        const chip = (
                          <button
                            type="button"
                            className={cls}
                            onClick={() => setSelectedSizeValue(option.value)}
                            aria-pressed={isSelected}
                            aria-label={srHint}
                            title={hoverText ? undefined : fallbackTitle}
                          >
                            {option.label}
                          </button>
                        );

                        if (!hoverText) {
                          return (
                            <span
                              key={`size-${option.value}`}
                              className="product-detail__size-chip-trigger"
                            >
                              {chip}
                            </span>
                          );
                        }

                        return (
                          <OverlayTrigger
                            key={`size-${option.value}`}
                            placement="top"
                            delay={{ show: 200, hide: 80 }}
                            overlay={
                              <Tooltip
                                id={`size-desc-${option.value}`}
                                className="product-detail__size-tooltip"
                              >
                                {hoverText}
                              </Tooltip>
                            }
                          >
                            <span className="product-detail__size-chip-trigger">
                              {chip}
                            </span>
                          </OverlayTrigger>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}


              {attributeMatrix.length > 0 ? (
                <div className="product-detail__attributes">
                  {attributeMatrix.map((attribute) => {
                    const row = attribute.options[0];
                    const cls = [
                      "product-detail__attribute-chip",
                      "product-detail__attribute-chip--readonly",
                      "product-detail__attribute-chip--selected",
                      row && !row.inStock
                        ? "product-detail__attribute-chip--oos"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        className="product-detail__attribute-row"
                        key={attribute.code}
                      >
                        <span className="product-detail__attribute-label">
                          {attribute.name}
                        </span>
                        <div className="product-detail__attribute-options">
                          {!row ? (
                            <span className="product-detail__attribute-chip product-detail__attribute-chip--readonly">
                              {variant.attributes?.[attribute.code] || "-"}
                            </span>
                          ) : (
                            <span
                              className={cls}
                              title={
                                row.inStock
                                  ? row.label
                                  : `${row.label} (Out of stock)`
                              }
                            >
                              {row.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {hasSizeChartData(product.sizeChart) && sizeOptions.length === 0 ? (
                <div className="product-detail__size-chart-wrap">
                  <button
                    type="button"
                    className="product-detail__size-chart-link"
                    onClick={() => setShowSizeChart(true)}
                  >
                    Size Chart
                  </button>
                </div>
              ) : null}

              <div className="product-detail__actions">
                {justAddedToCart ? (
                  <p className="product-detail__added-status" role="status">
                    <FaCheck aria-hidden />
                    Added to cart
                  </p>
                ) : null}

                <div className="product-detail__action-buttons">
                  {justAddedToCart ? (
                    <Link
                      to="/cart"
                      className="btn btn--theme btn--full product-detail__btn-cart"
                    >
                      View cart
                      <FaArrowRight aria-hidden />
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={`btn btn--full product-detail__btn-add${
                      justAddedToCart ? " btn--outline" : " btn--theme"
                    }`}
                    onClick={onAddToCartClick}
                    disabled={!canAddToCart || addingToCart}
                  >
                    {!addingToCart ? (
                      <FaShoppingCart
                        aria-hidden
                        className="product-detail__btn-icon"
                      />
                    ) : null}
                    {addingToCart ? "Adding…" : "Add to cart"}
                  </button>
                </div>

                {requiresSize && !selectedSizeValue ? (
                  <p className="product-detail__add-hint">
                    Select a size to continue.
                  </p>
                ) : !inStock ? (
                  <p className="product-detail__add-hint">
                    This selection is currently out of stock.
                  </p>
                ) : null}
              </div>

              <ul className="product-detail__meta">
                {purchaseNote ? (
                  <li className="product-detail__meta-item--full">
                    <span className="product-detail__meta-value product-detail__purchase-note">
                      {purchaseNote}
                    </span>
                  </li>
                ) : null}
                {showStockLine ? (
                  <li className="product-detail__meta-item--full">
                    <span className="product-detail__meta-value product-detail__meta-value--stock-line">
                      {inStock ? (
                        <span className="product-detail__stock-status">In Stock</span>
                      ) : null}
                      {inStock && deliveryDescription ? (
                        <span className="product-detail__meta-separator" aria-hidden="true">
                          {" | "}
                        </span>
                      ) : null}
                      {deliveryDescription ? (
                        <span className="product-detail__delivery-description">
                          {deliveryDescription}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ) : null}
                <li>
                  <span className="product-detail__meta-label">SKU</span>
                  <span className="product-detail__meta-value">
                    {displaySku}
                  </span>
                </li>
                {productNameTag ? (
                  <li className="product-detail__meta-item--tags">
                    <span className="product-detail__meta-label">Tags</span>
                    <span className="product-detail__meta-tags">
                      <Link
                        to={parentProductLink}
                        className="product-detail__meta-tag-link"
                      >
                        {productNameTag}
                      </Link>
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </Col>
        </Row>
      </Container>

      <SizeChartModal
        show={showSizeChart}
        onHide={() => setShowSizeChart(false)}
        chart={product.sizeChart}
      />

      <ProductDetailLightbox
        show={lightboxOpen}
        onHide={handleLightboxClose}
        images={images}
        activeIndex={activeImageIndex}
        onSelectIndex={handleLightboxSelectIndex}
        title={displayName}
      />

      {variant?._id && showCustomerReviews ? (
        <ProductReviewsSection
          variantId={String(variant._id)}
          isAuthenticated={isAuthenticated}
          {...reviewsState}
        />
      ) : null}

      <RelatedProductsSection items={relatedProducts} />
    </section>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: Boolean(state.auth.isAuthenticated),
  addingToCart: state.cart.adding,
});

export default connect(mapStateToProps, {
  addToCart,
  setAlert,
  getStoreVariantDetail,
})(ProductDetail);
