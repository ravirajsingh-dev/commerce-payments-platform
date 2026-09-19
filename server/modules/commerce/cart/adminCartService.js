const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const {
  CART_ITEM_ISSUE,
  getCart,
  clearCart,
  isValidObjectId,
} = require("./cartService");

const attributesToObject = (attrs) => {
  if (attrs == null) return {};
  if (attrs instanceof Map) {
    return Object.fromEntries(attrs.entries());
  }
  if (typeof attrs === "object") {
    return Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [String(k), String(v ?? "")]),
    );
  }
  return {};
};

const enrichAdminCartItems = async (items = []) => {
  if (!items.length) return [];

  const variantIds = [...new Set(items.map((row) => String(row.variantId)))];
  const productIds = [...new Set(items.map((row) => String(row.productId)))];

  const [variants, products] = await Promise.all([
    ProductVariant.find({ _id: { $in: variantIds } })
      .select("sku name productId attributes")
      .lean(),
    Product.find({ _id: { $in: productIds } }).select("name slug").lean(),
  ]);

  const variantById = new Map(variants.map((row) => [String(row._id), row]));
  const productById = new Map(products.map((row) => [String(row._id), row]));

  return items.map((item) => {
    const variant = variantById.get(String(item.variantId));
    const product = productById.get(String(item.productId));
    const variantAttributes = attributesToObject(variant?.attributes);

    return {
      ...item,
      productName: product?.name || "Product",
      productSlug: product?.slug || "",
      sku: variant?.sku || "",
      variantName: String(variant?.name || "").trim(),
      variantAttributes,
    };
  });
};

const getAdminUserCart = async (userId) => {
  if (!isValidObjectId(userId)) {
    return {
      ok: false,
      message: "Invalid user id",
      errors: [{ path: "user_id", msg: "Invalid user id." }],
      statusCode: 400,
    };
  }

  const user = await User.findById(userId).select("name email phone").lean();
  if (!user) {
    return {
      ok: false,
      message: "User not found",
      errors: [{ path: "user_id", msg: "User not found." }],
      statusCode: 404,
    };
  }

  const cartResult = await getCart(userId);
  const items = await enrichAdminCartItems(cartResult.cart?.items || []);

  return {
    ok: true,
    user: {
      id: String(user._id),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    },
    cart: {
      ...cartResult.cart,
      items,
    },
    issueLabels: CART_ITEM_ISSUE,
  };
};

const clearAdminUserCart = async (userId) => {
  if (!isValidObjectId(userId)) {
    return {
      ok: false,
      message: "Invalid user id",
      errors: [{ path: "user_id", msg: "Invalid user id." }],
      statusCode: 400,
    };
  }

  const user = await User.findById(userId).select("_id").lean();
  if (!user) {
    return {
      ok: false,
      message: "User not found",
      errors: [{ path: "user_id", msg: "User not found." }],
      statusCode: 404,
    };
  }

  const result = await clearCart(userId);
  if (!result.ok) {
    return result;
  }

  const items = await enrichAdminCartItems(result.cart?.items || []);

  return {
    ok: true,
    cleared: Boolean(result.cleared),
    cart: {
      ...result.cart,
      items,
    },
  };
};

module.exports = {
  getAdminUserCart,
  clearAdminUserCart,
};
