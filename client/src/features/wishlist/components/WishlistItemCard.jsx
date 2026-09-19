import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaTrash } from "react-icons/fa";

import VariantPriceDisplay from "@src/features/public/components/VariantPriceDisplay";
import WishlistLineSpecGrid from "./WishlistLineSpecGrid";

const WishlistItemCard = ({
  item,
  selectedSize = "",
  onSizeChange,
  onRemove,
  onAddToCart,
  removing,
  adding,
}) => {
  const requiresSize = Boolean(item.requiresSize);
  const sizeOptions = Array.isArray(item.sizeOptions) ? item.sizeOptions : [];
  const effectiveSize =
    selectedSize ||
    item.defaultSize ||
    sizeOptions.find((row) => row.stock > 0)?.value ||
    "";

  const selectedRow = requiresSize
    ? sizeOptions.find((row) => row.value === effectiveSize)
    : null;

  const lineInStock = requiresSize
    ? Boolean(selectedRow && selectedRow.stock > 0)
    : item.inStock;

  const canAddToCart =
    item.isAvailable && lineInStock && (!requiresSize || Boolean(effectiveSize));

  const detailLink =
    item.productSlug && item.variantId
      ? `/collection/${encodeURIComponent(item.productSlug)}/${item.variantId}`
      : "/collections";

  const title = String(item.displayName || "Product").trim();

  const attributes = useMemo(() => {
    const rows = [
      {
        code: "stock",
        label: "Stock",
        value: item.isAvailable
          ? lineInStock
            ? "In stock"
            : requiresSize && effectiveSize
              ? "Size out of stock"
              : "Out of stock"
          : "Unavailable",
        isStock: true,
        inStock: lineInStock && item.isAvailable,
      },
    ];

    const lines = Array.isArray(item.attributeLines) ? item.attributeLines : [];
    lines.forEach((row) => {
      const value = String(row?.value || "").trim();
      if (!value) return;
      rows.push({
        code: row.code,
        label: row.label,
        value,
      });
    });

    return rows;
  }, [
    item.attributeLines,
    item.isAvailable,
    lineInStock,
    requiresSize,
    effectiveSize,
  ]);

  const hasSize = requiresSize && sizeOptions.length > 0;
  const hasSpecs = attributes.length > 0 || hasSize;
  const busy = adding || removing;

  const handleSizeChange = useCallback(
    (size) => onSizeChange?.(item.variantId, size),
    [item.variantId, onSizeChange],
  );

  const handleAddToCart = useCallback(() => {
    onAddToCart?.(item, effectiveSize);
  }, [item, effectiveSize, onAddToCart]);

  const media = item.imageUrl ? (
    <div
      className="cart-line__thumb"
      style={{ backgroundImage: `url(${encodeURI(item.imageUrl)})` }}
      aria-hidden
    />
  ) : (
    <div className="cart-line__thumb cart-line__thumb--placeholder">
      {title.slice(0, 1)}
    </div>
  );

  return (
    <article className={`cart-line${busy ? " cart-line--busy" : ""}`}>
      {detailLink ? (
        <Link to={detailLink} className="cart-line__media-link">
          {media}
        </Link>
      ) : (
        <div className="cart-line__media-link">{media}</div>
      )}

      <div className="cart-line__body">
        <div className="cart-line__head">
          <div className="cart-line__head-main">
            {detailLink ? (
              <Link to={detailLink} className="cart-line__title">
                {title}
              </Link>
            ) : (
              <h2 className="cart-line__title">{title}</h2>
            )}
            {item.productName && item.productName !== title ? (
              <p className="wishlist-line__subtitle">{item.productName}</p>
            ) : null}
          </div>
          <div className="cart-line__head-end">
            <div className="cart-line__pricing">
              <VariantPriceDisplay
                variant={{
                  price: item.listPrice ?? item.price,
                  salePrice: item.price,
                  discountType: item.discountType,
                  discountValue: item.discountValue,
                  hasDiscount: item.listPrice > item.price + 0.001,
                }}
                className="cart-line__price"
                priceValueClassName="cart-line__price"
                priceNote=""
                showBadge={false}
              />
            </div>
            <button
              type="button"
              className="cart-line__remove"
              onClick={() => onRemove(item)}
              disabled={removing || busy}
              aria-label={`Remove ${title} from wishlist`}
            >
              <FaTrash aria-hidden />
            </button>
          </div>
        </div>

        {hasSpecs ? (
          <div className="cart-line__spec-row">
            <WishlistLineSpecGrid
              attributes={attributes}
              hasSize={hasSize}
              sizeValue={effectiveSize}
              sizeOptions={sizeOptions}
              sizeDisabled={busy}
              sizeBusy={adding}
              sizeLabel={`Size for ${title}`}
              onSizeChange={handleSizeChange}
              canAddToCart={canAddToCart}
              adding={adding}
              onAddToCart={handleAddToCart}
            />
          </div>
        ) : (
          <div className="cart-line__spec-row cart-line__spec-row--qty-only">
            <WishlistLineSpecGrid
              attributes={[]}
              hasSize={false}
              canAddToCart={canAddToCart}
              adding={adding}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}
      </div>
    </article>
  );
};

export default WishlistItemCard;
