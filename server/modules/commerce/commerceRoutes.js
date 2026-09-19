const express = require("express");

const router = express.Router();

router.use("/cart", require("./cart/cartRoutes"));
router.use("/checkout", require("./checkout/checkoutRoutes"));
router.use("/orders", require("./order/orderRoutes"));
router.use("/reviews", require("./review/reviewRoutes"));
router.use("/wishlist", require("./wishlist/wishlistRoutes"));

module.exports = router;
