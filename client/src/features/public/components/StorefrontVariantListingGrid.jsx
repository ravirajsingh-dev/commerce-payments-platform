import { Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

import { buildVariantSubtitle } from "@src/utils/storefrontVariantHelpers";
import VariantPriceDisplay from "@src/features/public/components/VariantPriceDisplay";

/**
 * @param {Array<{ product: { slug?: string, name?: string }, variant: object }>} entries
 * @param {boolean} showCollectionLabel — show collection name above the variant title
 * @param {boolean} showSubtitle       — show color/fabric/sizes line (default false)
 * @param {boolean} showStock          — show in/out-of-stock badge (default false)
 */
const StorefrontVariantListingGrid = ({
  entries = [],
  showCollectionLabel = false,
  showSubtitle = false,
  showStock = false,
}) => (
  <Row className="collection-page__grid g-1 g-sm-2 g-md-4">
    {entries.map(({ product, variant }) => {
      const id = variant?._id != null ? String(variant._id) : "";
      const slug = String(product?.slug || "").trim();
      const collectionName = String(product?.name || "").trim() || slug;
      if (!id || !slug) return null;

      const thumb = variant.images?.[0]?.url || "";
      const cardTitle =
        String(variant.name || "").trim() || collectionName || "Variant";
      const subtitle = showSubtitle ? buildVariantSubtitle(variant) : "";
      const detailLink = `/collection/${encodeURIComponent(slug)}/${id}`;
      const inStock = Boolean(variant.inStock);

      return (
        <Col xs={6} md={4} key={`${slug}-${id}`}>
          <Link to={detailLink} className="product-card">
            <div className="product-card__media" aria-label={cardTitle}>
              {thumb ? (
                <div
                  className="product-card__media-bg"
                  style={{ backgroundImage: `url(${encodeURI(thumb)})` }}
                  aria-hidden
                />
              ) : (
                <span className="product-card__media-placeholder">
                  {cardTitle}
                </span>
              )}
            </div>
            <div className="product-card__body">
              {showCollectionLabel && collectionName ? (
                <p className="product-card__collection-label mb-1">
                  {collectionName}
                </p>
              ) : null}
              <h2 className="product-card__title">{cardTitle}</h2>
              {subtitle ? (
                <p className="product-card__subtitle collection-page__variant-meta">
                  {subtitle}
                </p>
              ) : null}
              <VariantPriceDisplay
                variant={variant}
                className="product-card__price"
              />
              {showStock ? (
                <span
                  className={`product-card__stock${inStock ? "" : " product-card__stock--oos"}`}
                >
                  {inStock ? "In stock" : "Out of stock"}
                </span>
              ) : null}
            </div>
          </Link>
        </Col>
      );
    })}
  </Row>
);

export default StorefrontVariantListingGrid;
