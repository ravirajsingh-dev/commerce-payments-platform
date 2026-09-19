import { Link } from "react-router-dom";

import VariantPriceDisplay from "@src/features/public/components/VariantPriceDisplay";

const RELATED_PRODUCT_COUNT = 4;

/**
 * PDP footer — up to 4 related variant cards from GET /api/store/variants/:id → relatedProducts.
 */
const RelatedProductsSection = ({ items = [] }) => {
  const entries = (Array.isArray(items) ? items : [])
    .filter((row) => row?.product?.slug && row?.variant?._id)
    .slice(0, RELATED_PRODUCT_COUNT);

  if (!entries.length) return null;

  return (
    <section
      className="related-products"
      aria-labelledby="related-products-heading"
    >
      <div className="related-products__inner">
        <h2 id="related-products-heading" className="related-products__title">
          Related Products
        </h2>
        <ul className="related-products__grid">
          {entries.map(({ product, variant }) => {
            const id = String(variant._id);
            const slug = String(product.slug || "").trim();
            const thumb = variant.images?.[0]?.url || "";
            const collectionName = String(product?.name || "").trim() || slug;
            const cardTitle =
              String(variant.name || "").trim() || collectionName || "Product";
            const detailLink = `/collection/${encodeURIComponent(slug)}/${id}`;

            return (
              <li className="related-products__item" key={`related-${slug}-${id}`}>
                <Link
                  to={detailLink}
                  className="related-products__card"
                  aria-label={`View ${cardTitle}`}
                >
                  <div className="related-products__media">
                    {thumb ? (
                      <div
                        className="related-products__media-bg"
                        style={{ backgroundImage: `url(${encodeURI(thumb)})` }}
                        aria-hidden
                      />
                    ) : (
                      <span className="related-products__media-placeholder">
                        {cardTitle}
                      </span>
                    )}
                  </div>
                  <h3 className="related-products__name">{cardTitle}</h3>
                  <VariantPriceDisplay
                    variant={variant}
                    className="related-products__price"
                    priceValueClassName="related-products__price-value"
                    priceNote="Tax Included"
                    priceNoteClassName="related-products__price-note"
                    showBadge={false}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default RelatedProductsSection;
