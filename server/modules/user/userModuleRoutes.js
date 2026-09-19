const express = require("express");
const router = express.Router();

router.use("/auth/users", require("./auth/registerRoutes"));
router.use("/auth", require("./auth/authRoutes"));
router.use("/users", require("./userRoutes"));

module.exports = router;
