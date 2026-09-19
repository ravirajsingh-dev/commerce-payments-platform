import { formatPrice } from "@src/utils/productDetailHelpers";
import {
  getVariantListPrice,
  getVariantSalePrice,
  variantHasDiscount,
  getVariantDiscountBadge,
} from "@src/utils/variantPricingHelpers";

/**
 * Storefront price block — shows sale price + struck MRP when a variant discount is set.
 */
const VariantPriceDisplay = ({
  variant,
  className = "",
  priceValueClassName = "product-card__price-value",
  priceNote = "Tax Included",
  priceNoteClassName = "product-card__price-note",
  showBadge = true,
}) => {
  const listPrice = getVariantListPrice(variant);
  const salePrice = getVariantSalePrice(variant);
  const onSale = variantHasDiscount(variant);
  const badge = showBadge ? getVariantDiscountBadge(variant) : "";

  return (
    <p className={className || undefined}>
      {onSale ? (
        <>
          <span className={`${priceValueClassName} variant-price__sale`}>
            {formatPrice(salePrice)}
          </span>
          <span className="variant-price__mrp" aria-label="Original price">
            {formatPrice(listPrice)}
          </span>
          {badge ? (
            <span className="variant-price__badge">{badge}</span>
          ) : null}
        </>
      ) : (
        <span className={priceValueClassName}>{formatPrice(listPrice)}</span>
      )}
      {priceNote ? (
        <span className={priceNoteClassName}>{priceNote}</span>
      ) : null}
    </p>
  );
};

export default VariantPriceDisplay;
