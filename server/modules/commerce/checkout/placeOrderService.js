const mongoose = require("mongoose");
const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const ClaimPolicy = require("../../../models/ClaimPolicy");
const {
  resolveCheckoutAddressSnapshot,
} = require("../address/checkoutAddressService");
const {
  CHECKOUT_ADDRESS_INLINE_FIELDS,
} = require("../address/checkoutAddressShape");
const {
  generateOrderNo,
  ORDER_NUMBER_ERROR,
} = require("../order/orderNumberGenerator");
const {
  decrementStock,
  releaseStock,
  INVENTORY_ERROR,
} = require("../inventory/inventoryService");
const { previewCheckout } = require("./checkoutPreviewService");
const { normalizeSize } = require("../cart/cartService");
const { scheduleOrderPlacedEmail } = require("../order/orderEmails");
const {
  consumeCouponForOrder,
  COUPON_ERROR,
} = require("../coupon/couponService");

const PLACE_ORDER_ERROR = {
  INVALID_PAYMENT_METHOD: "INVALID_PAYMENT_METHOD",
  CHECKOUT_BLOCKED: "CHECKOUT_BLOCKED",
  EMPTY_CART: "EMPTY_CART",
  ORDER_NUMBER_FAILED: "ORDER_NUMBER_FAILED",
};

const {
  STATUS,
  ORDER_PAYMENT_METHOD,
  ORDER_PAYMENT_STATUS,
} = require("../../../shared/constants/order");

const ALLOWED_PAYMENT_METHODS = new Set([ORDER_PAYMENT_METHOD.COD]);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const withOptionalSession = (query, session) =>
  session ? query.session(session) : query;

const isTransactionNotSupported = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  return (
    err?.code === 20 ||
    msg.includes("replica set") ||
    msg.includes("mongos") ||
    msg.includes("transaction numbers are only allowed")
  );
};

const attributesToMap = (attrs) => {
  const map = new Map();
  if (attrs == null) return map;
  const entries =
    attrs instanceof Map
      ? attrs.entries()
      : Object.entries(typeof attrs === "object" ? attrs : {});
  for (const [key, value] of entries) {
    map.set(String(key), String(value ?? ""));
  }
  return map;
};

const resolveSkuSnapshot = (variant, size) => {
  const normalizedSize = normalizeSize(size);
  if (
    Array.isArray(variant.sizes) &&
    variant.sizes.length > 0 &&
    normalizedSize
  ) {
    const row = variant.sizes.find(
      (entry) => normalizeSize(entry?.value) === normalizedSize,
    );
    if (row?.sku && String(row.sku).trim()) {
      return String(row.sku).trim().toUpperCase();
    }
  }
  return String(variant.sku || "")
    .trim()
    .toUpperCase();
};

const serializePlacedOrder = (order, items) => ({
  orderNo: order.orderNo,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  amounts: order.amounts,
  couponCode: order.couponCode || "",
  addressSnapshot: order.addressSnapshot,
  items: items.map((row) => ({
    productId: String(row.productId),
    variantId: String(row.productVariantId),
    size: normalizeSize(row.size),
    quantity: row.quantity,
    unitPriceSnapshot: row.unitPriceSnapshot,
    lineTotal: row.lineTotal,
    productNameSnapshot: row.productNameSnapshot,
    productSlugSnapshot: row.productSlugSnapshot,
    skuSnapshot: row.skuSnapshot,
  })),
  createdAt: order.createdAt,
});

const mapInventoryError = (err) => ({
  ok: false,
  code: err?.code || INVENTORY_ERROR.INSUFFICIENT_STOCK,
  message: err?.message || "Insufficient stock",
  errors: [
    { path: "cart", msg: err?.message || "Insufficient stock for an item." },
  ],
  statusCode: 400,
  meta: err?.meta,
});

const pickAddressBody = (body = {}) => {
  const allowed = new Set([...CHECKOUT_ADDRESS_INLINE_FIELDS, "userAddressId"]);
  const picked = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      picked[key] = body[key];
    }
  }
  return picked;
};

const validatePaymentMethod = (body = {}) => {
  const method = body.paymentMethod;
  if (method === undefined || method === null || method === "") {
    return "cod";
  }
  const normalized = String(method).trim().toLowerCase();
  if (!ALLOWED_PAYMENT_METHODS.has(normalized)) {
    return null;
  }
  return normalized;
};

const loadVariantCatalog = async (variantIds, session) => {
  const variants = await withOptionalSession(
    ProductVariant.find({ _id: { $in: variantIds } }).select(
      "sku name price attributes sizes productId status",
    ),
    session,
  ).lean();

  const productIds = [...new Set(variants.map((row) => String(row.productId)))];

  const products = await withOptionalSession(
    Product.find({ _id: { $in: productIds } }).select(
      "name slug status claimPolicyId",
    ),
    session,
  ).lean();

  const claimPolicyIds = [
    ...new Set(
      products
        .map((row) => (row?.claimPolicyId ? String(row.claimPolicyId) : ""))
        .filter(Boolean),
    ),
  ];
  const claimPolicies = claimPolicyIds.length
    ? await withOptionalSession(
        ClaimPolicy.find({ _id: { $in: claimPolicyIds } }).select(
          "code name isActive eligibility evidenceRules restockPolicy",
        ),
        session,
      ).lean()
    : [];
  const claimPolicyById = new Map(
    claimPolicies.map((row) => [String(row._id), row]),
  );

  const productById = new Map(
    products.map((row) => [
      String(row._id),
      {
        ...row,
        claimPolicy:
          row.claimPolicyId != null
            ? claimPolicyById.get(String(row.claimPolicyId)) || null
            : null,
      },
    ]),
  );
  return new Map(
    variants.map((row) => [
      String(row._id),
      { ...row, product: productById.get(String(row.productId)) },
    ]),
  );
};

const releaseDecrementedLines = async (lines, session) => {
  for (const line of lines) {
    await releaseStock(line.variantId, {
      size: line.size || null,
      qty: line.quantity,
      session: session || undefined,
    });
  }
};

const buildClaimPolicySnapshot = (policy) => {
  if (!policy || policy.isActive === false) {
    return null;
  }
  return {
    policyId: String(policy._id),
    code: String(policy.code || "")
      .trim()
      .toUpperCase(),
    name: String(policy.name || "").trim(),
    capturedAt: new Date(),
    eligibility: {
      claimsEnabled: policy.eligibility?.claimsEnabled !== false,
      claimWindowDays:
        policy.eligibility?.claimWindowDays === null ||
        policy.eligibility?.claimWindowDays === undefined
          ? null
          : Number(policy.eligibility.claimWindowDays),
      allowedClaimTypes: Array.isArray(policy.eligibility?.allowedClaimTypes)
        ? [...policy.eligibility.allowedClaimTypes]
        : [],
      allowedClaimReasons: Array.isArray(
        policy.eligibility?.allowedClaimReasons,
      )
        ? [...policy.eligibility.allowedClaimReasons]
        : [],
    },
    evidenceRules: {
      requiredByTypeReason: Array.isArray(
        policy.evidenceRules?.requiredByTypeReason,
      )
        ? policy.evidenceRules.requiredByTypeReason.map((row) => ({
            claimType: row?.claimType || "",
            reasonCode: row?.reasonCode || "",
            requiredEvidence: Array.isArray(row?.requiredEvidence)
              ? [...row.requiredEvidence]
              : [],
          }))
        : [],
      minImages:
        policy.evidenceRules?.minImages === undefined
          ? 0
          : Number(policy.evidenceRules.minImages),
      maxImages:
        policy.evidenceRules?.maxImages === undefined
          ? 10
          : Number(policy.evidenceRules.maxImages),
      requireCourierReceipt:
        policy.evidenceRules?.requireCourierReceipt === true,
      requireDamageProof: policy.evidenceRules?.requireDamageProof === true,
      requireFitProof: policy.evidenceRules?.requireFitProof === true,
      requireProductProof: policy.evidenceRules?.requireProductProof === true,
    },
    restockPolicy: {
      restockableByDefault: policy.restockPolicy?.restockableByDefault === true,
      requireQcForRestock: policy.restockPolicy?.requireQcForRestock !== false,
      bespokeNonRestockableByDefault:
        policy.restockPolicy?.bespokeNonRestockableByDefault !== false,
    },
  };
};

const persistPlacedOrder = async ({
  userId,
  paymentMethod,
  preview,
  addressSnapshot,
  session,
}) => {
  const userObjectId = toObjectId(userId);
  const cart = await withOptionalSession(
    Cart.findOne({ userId: userObjectId }),
    session,
  );

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    const err = new Error("Cart is empty");
    err.code = PLACE_ORDER_ERROR.EMPTY_CART;
    throw err;
  }

  const variantIds = cart.items.map((item) => item.productVariantId);
  const variantById = await loadVariantCatalog(variantIds, session);
  const decrementedLines = [];

  try {
    for (const line of preview.items) {
      await decrementStock(line.variantId, {
        size: line.size || null,
        qty: line.quantity,
        session: session || undefined,
      });
      decrementedLines.push(line);
    }

    const orderNo = await generateOrderNo({ session: session || undefined });
    const orderDocs = await Order.create(
      [
        {
          orderNo,
          userId: userObjectId,
          status: STATUS.ORDER_PLACED.value,
          paymentStatus: ORDER_PAYMENT_STATUS.COD_PENDING,
          paymentMethod,
          amounts: preview.amounts,
          couponCode: preview.couponCode || cart.couponCode || "",
          addressSnapshot,
        },
      ],
      session ? { session } : {},
    );

    const order = orderDocs[0];

    if (preview.amounts.discount > 0 && preview.couponCode) {
      await consumeCouponForOrder({
        session: session || undefined,
        userId,
        couponCode: preview.couponCode,
        subtotal: preview.amounts.items,
        orderId: order._id,
        orderNo: order.orderNo,
        discountTotal: preview.amounts.discount,
      });
    }

    const gstByLineKey = new Map(
      (preview.gstLineBreakdown || []).map((row) => [
        `${String(row.variantId)}:${normalizeSize(row.size)}`,
        row,
      ]),
    );

    const orderItemDocs = [];

    for (const line of preview.items) {
      const cartLine = cart.items.find(
        (item) =>
          String(item.productVariantId) === String(line.variantId) &&
          normalizeSize(item.size) === normalizeSize(line.size),
      );
      const variant = variantById.get(String(line.variantId));
      const product = variant?.product;
      const claimPolicySnapshot = buildClaimPolicySnapshot(
        product?.claimPolicy,
      );

      if (
        !variant ||
        !product ||
        Number(variant.status) !== 1 ||
        Number(product.status) !== 1
      ) {
        const err = new Error("Product variant is not available");
        err.code = INVENTORY_ERROR.VARIANT_NOT_FOUND;
        throw err;
      }

      const lineKey = `${String(line.variantId)}:${normalizeSize(line.size)}`;
      const gstLine = gstByLineKey.get(lineKey) || {};

      orderItemDocs.push({
        orderId: order._id,
        productId: cartLine?.productId || variant.productId,
        productVariantId: line.variantId,
        size: normalizeSize(line.size),
        attributesSnapshot: attributesToMap(cartLine?.attributesSnapshot),
        productNameSnapshot:
          String(variant.name || "").trim() ||
          String(product.name || "").trim() ||
          "Product",
        productSlugSnapshot: String(product.slug || "")
          .trim()
          .toLowerCase(),
        skuSnapshot: resolveSkuSnapshot(variant, line.size),
        quantity: line.quantity,
        unitPriceSnapshot: line.unitPrice,
        lineTotal: line.lineTotal,
        claimPolicySnapshot,
      });
    }

    const orderItems = await OrderItem.insertMany(
      orderItemDocs,
      session ? { session } : {},
    );

    cart.items = [];
    cart.couponCode = "";
    cart.markModified("items");
    await cart.save(session ? { session } : {});

    return { order, items: orderItems, decrementedLines };
  } catch (err) {
    if (!session && decrementedLines.length > 0) {
      await releaseDecrementedLines(decrementedLines, null);
    }
    throw err;
  }
};

/**
 * Places a COD order: validate address → stock → Order + OrderItems → clear cart.
 */
const placeOrder = async (userId, body = {}) => {
  const paymentMethod = validatePaymentMethod(body);
  if (!paymentMethod) {
    return {
      ok: false,
      code: PLACE_ORDER_ERROR.INVALID_PAYMENT_METHOD,
      message: "Only cash on delivery is available",
      errors: [{ path: "paymentMethod", msg: "Only COD is supported." }],
      statusCode: 400,
    };
  }

  const addressResult = await resolveCheckoutAddressSnapshot({
    userId,
    body: pickAddressBody(body),
  });
  if (!addressResult.valid) {
    const statusCode =
      addressResult.code === "UNAUTHORIZED"
        ? 401
        : addressResult.code === "NOT_FOUND"
          ? 404
          : 400;
    return {
      ok: false,
      code: addressResult.code || "VALIDATION_ERROR",
      message: "Invalid shipping address",
      errors: addressResult.errors,
      statusCode,
    };
  }

  const previewResult = await previewCheckout(userId);
  if (!previewResult.ok) {
    return {
      ok: false,
      code: previewResult.code || PLACE_ORDER_ERROR.EMPTY_CART,
      message: previewResult.message,
      errors: previewResult.errors,
      statusCode: previewResult.statusCode || 400,
    };
  }

  if (!previewResult.preview.canCheckout) {
    const blockingIssues = previewResult.preview.blockingIssues || [];
    const couponInvalid = blockingIssues.includes("COUPON_INVALID");
    return {
      ok: false,
      code: PLACE_ORDER_ERROR.CHECKOUT_BLOCKED,
      message: couponInvalid
        ? previewResult.preview.couponMessage || "Coupon is no longer valid."
        : "Cart cannot be checked out",
      errors: [
        {
          path: couponInvalid ? "code" : "cart",
          msg: couponInvalid
            ? previewResult.preview.couponMessage ||
              "Coupon is no longer valid."
            : "Resolve cart issues before placing your order.",
        },
      ],
      statusCode: 400,
      meta: { blockingIssues },
    };
  }

  const preview = previewResult.preview;
  const session = await mongoose.startSession();

  try {
    let placed = null;

    try {
      await session.withTransaction(async () => {
        placed = await persistPlacedOrder({
          userId,
          paymentMethod,
          preview,
          addressSnapshot: addressResult.snapshot,
          session,
        });
      });
    } catch (txErr) {
      if (!isTransactionNotSupported(txErr)) {
        throw txErr;
      }
      placed = await persistPlacedOrder({
        userId,
        paymentMethod,
        preview,
        addressSnapshot: addressResult.snapshot,
        session: null,
      });
    }

    scheduleOrderPlacedEmail(placed.order, userId);

    return {
      ok: true,
      order: serializePlacedOrder(placed.order, placed.items),
    };
  } catch (err) {
    if (
      err?.code === COUPON_ERROR.EXHAUSTED ||
      err?.code === COUPON_ERROR.USAGE_LIMIT_REACHED ||
      err?.code === COUPON_ERROR.EXPIRED ||
      err?.code === COUPON_ERROR.NOT_STARTED ||
      err?.code === COUPON_ERROR.INACTIVE ||
      err?.code === COUPON_ERROR.MIN_ORDER_NOT_MET ||
      err?.code === COUPON_ERROR.NOT_FOUND
    ) {
      return {
        ok: false,
        code: PLACE_ORDER_ERROR.CHECKOUT_BLOCKED,
        message: err.message || "Coupon is no longer valid.",
        errors: [
          { path: "code", msg: err.message || "Coupon is no longer valid." },
        ],
        statusCode: 400,
      };
    }

    if (err?.code === PLACE_ORDER_ERROR.EMPTY_CART) {
      return {
        ok: false,
        code: PLACE_ORDER_ERROR.EMPTY_CART,
        message: "Cart is empty",
        errors: [
          { path: "cart", msg: "Add items to your cart before checkout." },
        ],
        statusCode: 400,
      };
    }

    if (
      err?.code === INVENTORY_ERROR.INSUFFICIENT_STOCK ||
      err?.code === INVENTORY_ERROR.SIZE_NOT_FOUND ||
      err?.code === INVENTORY_ERROR.SIZE_REQUIRED ||
      err?.code === INVENTORY_ERROR.VARIANT_NOT_FOUND
    ) {
      return mapInventoryError(err);
    }

    if (
      err?.code === ORDER_NUMBER_ERROR.GENERATION_FAILED ||
      err?.code === ORDER_NUMBER_ERROR.ABBREVIATION_REQUIRED
    ) {
      return {
        ok: false,
        code: PLACE_ORDER_ERROR.ORDER_NUMBER_FAILED,
        message: err.message,
        errors: [
          {
            path: "order",
            msg:
              err?.code === ORDER_NUMBER_ERROR.ABBREVIATION_REQUIRED
                ? "Store abbreviation is not configured. Contact support."
                : "Unable to create order number. Try again.",
          },
        ],
        statusCode: 503,
      };
    }

    if (err?.code === 11000 && err?.keyPattern?.orderNo) {
      return {
        ok: false,
        code: PLACE_ORDER_ERROR.ORDER_NUMBER_FAILED,
        message: "Order number conflict",
        errors: [
          { path: "order", msg: "Please try placing your order again." },
        ],
        statusCode: 409,
      };
    }

    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = {
  PLACE_ORDER_ERROR,
  placeOrder,
};
