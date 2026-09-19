const express = require("express");
const multer = require("multer");
const path = require("path");
const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const controller = require("./homepageController");

const router = express.Router();

const storage = multer.memoryStorage();
const allowedTypes = /jpeg|jpg|png|webp/;
const fileFilter = (_req, file, cb) => {
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  return cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
};
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter,
});

const auth = [AdminAuth, checkPermission("homeContent", "list")];
const createAuth = [AdminAuth, checkPermission("homeContent", "create")];
const editAuth = [AdminAuth, checkPermission("homeContent", "edit")];
const deleteAuth = [AdminAuth, checkPermission("homeContent", "delete")];

router.get("/sliders/list", auth, controller.getHomeSliders);
router.post(
  "/sliders/create",
  createAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.createHomeSlider,
);
router.put(
  "/sliders/:id",
  editAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.updateHomeSlider,
);
router.delete("/sliders/:id", deleteAuth, controller.deleteHomeSlider);

router.get("/showcases/list", auth, controller.getHomeShowcases);
router.post("/showcases/create", createAuth, controller.createHomeShowcase);
router.put("/showcases/:id", editAuth, controller.updateHomeShowcase);
router.post(
  "/showcases/upload-images",
  createAuth,
  upload.array("images", 100),
  controller.uploadShowcaseImages,
);
router.post(
  "/showcases/delete-image",
  createAuth,
  controller.deleteShowcaseImage,
);
router.delete("/showcases/:id", deleteAuth, controller.deleteHomeShowcase);

router.get("/signature-styles/list", auth, controller.getSignatureStyles);
router.post(
  "/signature-styles/create",
  createAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.createSignatureStyle,
);
router.put(
  "/signature-styles/:id",
  editAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.updateSignatureStyle,
);
router.delete(
  "/signature-styles/:id",
  deleteAuth,
  controller.deleteSignatureStyle,
);

router.get("/clientele/list", auth, controller.getClientele);
router.post(
  "/clientele/create",
  createAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.createClientele,
);
router.put(
  "/clientele/:id",
  editAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.updateClientele,
);
router.delete("/clientele/:id", deleteAuth, controller.deleteClientele);

module.exports = router;
