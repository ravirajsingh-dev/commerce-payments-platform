const Cart = require("../../../models/Cart");
const {
  normalizeOwner,
  ownerFromUserId,
  normalizeGuestSessionId,
} = require("./cartOwner");
const {
  normalizeSize,
  findItemIndex,
  finalizeCartResponse,
  getCart,
} = require("./cartService");
const { getAvailableStock } = require("../inventory/inventoryService");

const toObjectId = (id) => new (require("mongoose").Types.ObjectId)(id);

const mergeGuestCartIntoUser = async (userId, guestSessionId) => {
  const owner = normalizeOwner(userId);
  if (owner.type !== "user") {
    return {
      ok: false,
      message: "Invalid user.",
      statusCode: 400,
    };
  }

  const normalizedSession = normalizeGuestSessionId(guestSessionId);
  if (!normalizedSession) {
    return getCart(owner.userId);
  }

  const guestCart = await Cart.findOne({ sessionId: normalizedSession });
  if (!guestCart || !Array.isArray(guestCart.items) || guestCart.items.length === 0) {
    if (guestCart) {
      await guestCart.deleteOne();
    }
    return getCart(owner.userId);
  }

  let userCart = await Cart.findOne({ userId: toObjectId(owner.userId) });
  if (!userCart) {
    userCart = new Cart({
      userId: toObjectId(owner.userId),
      items: [],
      couponCode: "",
    });
  }

  for (const guestLine of guestCart.items) {
    const variantId = String(guestLine.productVariantId);
    const size = normalizeSize(guestLine.size);
    const existingIndex = findItemIndex(userCart.items, variantId, size);

    let available = 0;
    try {
      const stock = await getAvailableStock(variantId, size || null);
      available = Number(stock?.available) || 0;
    } catch {
      available = 0;
    }

    const guestQty = Math.max(0, Number(guestLine.quantity) || 0);
    if (guestQty <= 0 || available <= 0) {
      continue;
    }

    if (existingIndex >= 0) {
      const currentQty = Number(userCart.items[existingIndex].quantity) || 0;
      const mergedQty = Math.min(available, currentQty + guestQty);
      userCart.items[existingIndex].quantity = mergedQty;
      userCart.items[existingIndex].unitPriceSnapshot =
        Number(guestLine.unitPriceSnapshot) ||
        userCart.items[existingIndex].unitPriceSnapshot;
    } else {
      userCart.items.push({
        productId: guestLine.productId,
        productVariantId: guestLine.productVariantId,
        size,
        attributesSnapshot: guestLine.attributesSnapshot,
        quantity: Math.min(available, guestQty),
        unitPriceSnapshot: Number(guestLine.unitPriceSnapshot) || 0,
      });
    }
  }

  const userCoupon = String(userCart.couponCode || "").trim();
  const guestCoupon = String(guestCart.couponCode || "").trim();
  if (!userCoupon && guestCoupon) {
    userCart.couponCode = guestCoupon;
  }

  userCart.markModified("items");
  await userCart.save();
  await guestCart.deleteOne();

  return {
    ok: true,
    cart: await finalizeCartResponse(userCart, ownerFromUserId(owner.userId)),
    merged: true,
  };
};

module.exports = {
  mergeGuestCartIntoUser,
};
