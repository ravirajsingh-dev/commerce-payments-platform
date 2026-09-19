const mongoose = require("mongoose");
const response = require("../../../config/response");
const { deleteMultipleFromR2, normalizePublicId } = require("../../../utils/r2Helper");
const homepageService = require("./homepageService");

const toBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return Boolean(value);
};

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }
  return value;
};

const R2_FOLDERS = {
  heroDesktop: "homepage/hero/desktop",
  heroMobile: "homepage/hero/mobile",
  showcase: "homepage/showcase/gallery",
  signature: "homepage/signature-styles",
  clientele: "homepage/clientele",
};
const CLIENTELE_NOTE_MAX_LENGTH = 300;

const validateId = (id, fieldName, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.errorResponse(
      res,
      [{ path: fieldName, msg: `Invalid ${fieldName}.` }],
      "Validation Error",
      400,
    );
    return false;
  }
  return true;
};

const getHomeSliders = async (_req, res) => {
  try {
    const rows = await homepageService.getHomeSliders();
    return response.successResponse(res, rows, "Home sliders fetched.");
  } catch (err) {
    console.error("getHomeSliders:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createHomeSlider = async (req, res) => {
  try {
    const { heading, shortDesc, buttonText, buttonLink, status } = req.body;
    const imageFile = req.files?.image?.[0];
    if (!heading || !String(heading).trim()) {
      return response.errorResponse(
        res,
        [{ path: "heading", msg: "Heading is required." }],
        "Validation Error",
        400,
      );
    }
    if (!imageFile) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required." }],
        "Validation Error",
        400,
      );
    }

    const desktopImage = await homepageService.uploadImage(
      imageFile,
      R2_FOLDERS.heroDesktop,
    );
    const nextOrder = await homepageService.getNextSliderOrder();

    const created = await homepageService.createHomeSlider({
      heading: String(heading).trim(),
      shortDesc: String(shortDesc || "").trim(),
      buttonText: String(buttonText || "").trim(),
      buttonLink: String(buttonLink || "").trim(),
      image: desktopImage.url,
      imagePublicId: desktopImage.publicId,
      status: toBool(status, true),
      order: nextOrder,
    });

    return response.successResponse(res, created, "Home slider created.");
  } catch (err) {
    console.error("createHomeSlider:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const updateHomeSlider = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;

    const existing = await homepageService.getHomeSliderById(id);
    if (!existing) {
      return response.errorResponse(
        res,
        [{ msg: "Home slider not found." }],
        "Not found",
        404,
      );
    }

    const imageFile = req.files?.image?.[0];
    const updates = {};
    const fields = [
      "heading",
      "shortDesc",
      "buttonText",
      "buttonLink",
      "status",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.heading !== undefined)
      updates.heading = String(updates.heading).trim();
    if (updates.shortDesc !== undefined)
      updates.shortDesc = String(updates.shortDesc).trim();
    if (updates.buttonText !== undefined)
      updates.buttonText = String(updates.buttonText).trim();
    if (updates.buttonLink !== undefined)
      updates.buttonLink = String(updates.buttonLink).trim();
    if (updates.status !== undefined)
      updates.status = toBool(updates.status, existing.status);

    let orderHandled = false;
    if (req.body.order !== undefined) {
      const nextOrder = toInt(req.body.order, existing.order || 0);
      if (nextOrder !== existing.order) {
        await homepageService.reorderHomeSliderOrder(id, nextOrder);
        orderHandled = true;
      }
    }
    if (orderHandled) delete updates.order;

    // New image: upload first, persist to DB on submit only, then remove previous R2 object (not before).
    let r2KeyToRemoveAfterSave = null;
    if (imageFile) {
      const uploaded = await homepageService.uploadImage(
        imageFile,
        R2_FOLDERS.heroDesktop,
      );
      updates.image = uploaded.url;
      updates.imagePublicId = uploaded.publicId;
      r2KeyToRemoveAfterSave = existing.imagePublicId || existing.image;
    }

    const hasFieldUpdates = Object.keys(updates).length > 0;
    const updated = hasFieldUpdates
      ? await homepageService.updateHomeSlider(id, updates)
      : await homepageService.getHomeSliderById(id);

    if (r2KeyToRemoveAfterSave) {
      await homepageService.safeDeleteImage(r2KeyToRemoveAfterSave);
    }

    return response.successResponse(res, updated, "Home slider updated.");
  } catch (err) {
    console.error("updateHomeSlider:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const deleteHomeSlider = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const deleted = await homepageService.deleteHomeSlider(id);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Home slider not found." }],
        "Not found",
        404,
      );
    }
    await homepageService.safeDeleteImage(
      deleted.imagePublicId || deleted.image,
    );
    return response.successResponse(res, {}, "Home slider deleted.");
  } catch (err) {
    console.error("deleteHomeSlider:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getHomeShowcases = async (_req, res) => {
  try {
    const rows = await homepageService.getHomeShowcases();
    return response.successResponse(res, rows, "Home showcases fetched.");
  } catch (err) {
    console.error("getHomeShowcases:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createHomeShowcase = async (req, res) => {
  try {
    const { heading, description, isActive, images: imagesRaw } = req.body;
    const headingTrim = String(heading || "").trim();
    const descriptionTrim = String(description || "").trim();
    const images = homepageService.normalizeShowcaseImages(
      Array.isArray(imagesRaw) ? imagesRaw : parseJsonField(imagesRaw, []),
    );
    if (!headingTrim) {
      return response.errorResponse(
        res,
        [{ path: "heading", msg: "Heading is required." }],
        "Validation Error",
        400,
      );
    }
    if (!descriptionTrim) {
      return response.errorResponse(
        res,
        [{ path: "description", msg: "Description is required." }],
        "Validation Error",
        400,
      );
    }
    if (images.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "images", msg: "At least one showcase image is required." }],
        "Validation Error",
        400,
      );
    }
    const created = await homepageService.createHomeShowcase({
      heading: headingTrim,
      description: descriptionTrim,
      images,
      isActive: toBool(isActive, true),
    });
    return response.successResponse(res, created, "Showcase created.");
  } catch (err) {
    console.error("createHomeShowcase:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const updateHomeShowcase = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const existing = await homepageService.getHomeShowcaseById(id);
    if (!existing) {
      return response.errorResponse(
        res,
        [{ msg: "Showcase not found." }],
        "Not found",
        404,
      );
    }

    const heading =
      req.body.heading !== undefined
        ? String(req.body.heading || "").trim()
        : String(existing.heading || "").trim();
    if (!heading) {
      return response.errorResponse(
        res,
        [{ path: "heading", msg: "Heading is required." }],
        "Validation Error",
        400,
      );
    }

    const description =
      req.body.description !== undefined
        ? String(req.body.description || "").trim()
        : String(existing.description || "").trim();
    if (!description) {
      return response.errorResponse(
        res,
        [{ path: "description", msg: "Description is required." }],
        "Validation Error",
        400,
      );
    }

    const imagesRaw = req.body.images;
    const normalizedNext = homepageService.normalizeShowcaseImages(
      Array.isArray(imagesRaw) ? imagesRaw : parseJsonField(imagesRaw, []),
    );
    if (normalizedNext.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "images", msg: "At least one showcase image is required." }],
        "Validation Error",
        400,
      );
    }

    const existingIds = (existing.images || [])
      .map((img) => normalizePublicId(img?.publicId || img?.url || ""))
      .filter(Boolean);
    const nextIds = normalizedNext.map((img) => img.publicId).filter(Boolean);
    const removedByDiff = [
      ...new Set(
        existingIds.filter((key) => key && !nextIds.includes(key)),
      ),
    ];
    await deleteMultipleFromR2(removedByDiff);

    const updates = {
      heading,
      description,
      images: normalizedNext,
    };
    if (req.body.isActive !== undefined) {
      updates.isActive = toBool(req.body.isActive, existing.isActive);
    }

    const updated = await homepageService.updateHomeShowcase(id, updates);
    return response.successResponse(res, updated, "Showcase updated.");
  } catch (err) {
    console.error("updateHomeShowcase:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const uploadShowcaseImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "images", msg: "At least one image file is required." }],
        "Validation Error",
        400,
      );
    }
    const uploaded = await homepageService.uploadShowcaseImageFiles(files);
    return response.successResponse(res, uploaded, "Images uploaded.");
  } catch (err) {
    console.error("uploadShowcaseImages:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "Upload failed.",
      500,
    );
  }
};

const deleteShowcaseImage = async (req, res) => {
  try {
    const publicId = String(req.body?.publicId || "").trim();
    const parsedPublicIds = parseJsonField(req.body?.publicIds, req.body?.publicIds);
    const publicIds = Array.isArray(parsedPublicIds)
      ? parsedPublicIds
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      : [];

    if (!publicId && publicIds.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "publicId", msg: "publicId or publicIds is required." }],
        "Validation Error",
        400,
      );
    }
    if (publicIds.length > 0) {
      await deleteMultipleFromR2(publicIds);
    } else {
      await homepageService.safeDeleteImage(publicId);
    }
    return response.successResponse(res, {}, "Showcase image removed from storage.");
  } catch (err) {
    console.error("deleteShowcaseImage:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteHomeShowcase = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const deleted = await homepageService.deleteHomeShowcase(id);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Showcase not found." }],
        "Not found",
        404,
      );
    }
    await Promise.all(
      (deleted.images || []).map((image) =>
        homepageService.safeDeleteImage(image.publicId || image.url),
      ),
    );
    return response.successResponse(res, {}, "Showcase deleted.");
  } catch (err) {
    console.error("deleteHomeShowcase:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getSignatureStyles = async (_req, res) => {
  try {
    const rows = await homepageService.getSignatureStyles();
    return response.successResponse(res, rows, "Signature styles fetched.");
  } catch (err) {
    console.error("getSignatureStyles:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createSignatureStyle = async (req, res) => {
  try {
    const { title, subtitle, isActive, productId } = req.body;
    const imageFile = req.files?.image?.[0];
    if (!title || !String(title).trim()) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title is required." }],
        "Validation Error",
        400,
      );
    }
    const pidRaw = String(productId || "").trim();
    if (!pidRaw || !mongoose.Types.ObjectId.isValid(pidRaw)) {
      return response.errorResponse(
        res,
        [{ path: "productId", msg: "Product is required." }],
        "Validation Error",
        400,
      );
    }
    if (!imageFile) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required." }],
        "Validation Error",
        400,
      );
    }
    const routePath =
      await homepageService.resolveCollectionPathForProductId(pidRaw);
    if (!routePath) {
      return response.errorResponse(
        res,
        [{ path: "productId", msg: "Product not found or missing slug." }],
        "Validation Error",
        400,
      );
    }
    const uploaded = await homepageService.uploadImage(
      imageFile,
      R2_FOLDERS.signature,
    );
    const nextOrder = await homepageService.getNextSignatureStyleOrder();
    const created = await homepageService.createSignatureStyle({
      title: String(title).trim(),
      subtitle: String(subtitle || "").trim(),
      productId: new mongoose.Types.ObjectId(pidRaw),
      routePath,
      order: nextOrder,
      isActive: toBool(isActive, true),
      image: uploaded.url,
      imagePublicId: uploaded.publicId,
    });
    return response.successResponse(res, created, "Signature style created.");
  } catch (err) {
    console.error("createSignatureStyle:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const updateSignatureStyle = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const existing = await homepageService.findSignatureStyleById(id);
    if (!existing)
      return response.errorResponse(
        res,
        [{ msg: "Signature style not found." }],
        "Not found",
        404,
      );

    const updates = {};
    if (req.body.title !== undefined)
      updates.title = String(req.body.title || "").trim();
    if (req.body.subtitle !== undefined)
      updates.subtitle = String(req.body.subtitle || "").trim();
    if (req.body.isActive !== undefined) {
      updates.isActive = toBool(req.body.isActive, existing.isActive);
    }

    let orderHandled = false;
    if (req.body.order !== undefined) {
      const nextOrder = toInt(req.body.order, existing.order || 0);
      if (nextOrder !== existing.order) {
        await homepageService.reorderSignatureStyleOrder(id, nextOrder);
        orderHandled = true;
      }
    }

    const rawProductId =
      req.body.productId !== undefined
        ? String(req.body.productId || "").trim()
        : null;
    let targetProductId = existing.productId;
    if (rawProductId) {
      if (!mongoose.Types.ObjectId.isValid(rawProductId)) {
        return response.errorResponse(
          res,
          [{ path: "productId", msg: "Invalid product id." }],
          "Validation Error",
          400,
        );
      }
      updates.productId = new mongoose.Types.ObjectId(rawProductId);
      targetProductId = updates.productId;
    }
    if (!targetProductId) {
      return response.errorResponse(
        res,
        [{ path: "productId", msg: "Product is required." }],
        "Validation Error",
        400,
      );
    }
    const resolvedPath =
      await homepageService.resolveCollectionPathForProductId(targetProductId);
    if (!resolvedPath) {
      return response.errorResponse(
        res,
        [{ path: "productId", msg: "Product not found or missing slug." }],
        "Validation Error",
        400,
      );
    }
    updates.routePath = resolvedPath;

    let newUploadPublicId = null;
    const imageFile = req.files?.image?.[0];
    if (imageFile) {
      const uploaded = await homepageService.uploadImage(
        imageFile,
        R2_FOLDERS.signature,
      );
      newUploadPublicId = uploaded.publicId;
      updates.image = uploaded.url;
      updates.imagePublicId = uploaded.publicId;
    }

    if (orderHandled) delete updates.order;

    const hasFieldUpdates = Object.keys(updates).length > 0;
    let updated;
    try {
      updated = hasFieldUpdates
        ? await homepageService.updateSignatureStyle(id, updates)
        : await homepageService.findSignatureStyleById(id);
    } catch (dbErr) {
      if (newUploadPublicId) {
        await homepageService.safeDeleteImage(newUploadPublicId);
      }
      throw dbErr;
    }

    if (imageFile && existing) {
      try {
        await homepageService.deleteSignatureStyleR2ByDocument(existing);
      } catch (r2Err) {
        console.error("signatureStyleUpdate R2 cleanup:", r2Err);
      }
    }

    return response.successResponse(res, updated, "Signature style updated.");
  } catch (err) {
    console.error("updateSignatureStyle:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const deleteSignatureStyle = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const deleted = await homepageService.deleteSignatureStyle(id);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Signature style not found." }],
        "Not found",
        404,
      );
    }
    try {
      await homepageService.deleteSignatureStyleR2ByDocument(deleted);
    } catch (r2Err) {
      console.error("deleteSignatureStyle R2 cleanup:", r2Err);
    }
    return response.successResponse(res, {}, "Signature style deleted.");
  } catch (err) {
    console.error("deleteSignatureStyle:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getClientele = async (_req, res) => {
  try {
    const rows = await homepageService.getClientele();
    return response.successResponse(res, rows, "Clientele fetched.");
  } catch (err) {
    console.error("getClienteles:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createClientele = async (req, res) => {
  try {
    const { name, note, isActive } = req.body;
    const safeNote = String(note || "").trim();
    const imageFile = req.files?.image?.[0];
    if (!name || !String(name).trim()) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name is required." }],
        "Validation Error",
        400,
      );
    }
    if (!imageFile) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required." }],
        "Validation Error",
        400,
      );
    }
    const uploaded = await homepageService.uploadImage(
      imageFile,
      R2_FOLDERS.clientele,
    );
    const nextOrder = await homepageService.getNextClienteleOrder();
    const created = await homepageService.createClientele({
      name: String(name).trim(),
      note: safeNote.slice(0, CLIENTELE_NOTE_MAX_LENGTH),
      order: nextOrder,
      isActive: toBool(isActive, true),
      image: uploaded.url,
      imagePublicId: uploaded.publicId,
    });
    return response.successResponse(res, created, "Clientele created.");
  } catch (err) {
    console.error("createClientele:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const updateClientele = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const existing = await homepageService.findClienteleById(id);
    if (!existing)
      return response.errorResponse(
        res,
        [{ msg: "Clientele not found." }],
        "Not found",
        404,
      );

    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name || "").trim();
    }
    if (req.body.note !== undefined) {
      const safeNote = String(req.body.note || "").trim();
      updates.note = safeNote.slice(0, CLIENTELE_NOTE_MAX_LENGTH);
    }
    if (req.body.isActive !== undefined) {
      updates.isActive = toBool(req.body.isActive, existing.isActive);
    }

    let orderHandled = false;
    if (req.body.order !== undefined) {
      const nextOrder = toInt(req.body.order, existing.order || 0);
      if (nextOrder !== existing.order) {
        await homepageService.reorderClienteleOrder(id, nextOrder);
        orderHandled = true;
      }
    }

    const imageFile = req.files?.image?.[0];
    if (imageFile) {
      const uploaded = await homepageService.uploadImage(
        imageFile,
        R2_FOLDERS.clientele,
      );
      updates.image = uploaded.url;
      updates.imagePublicId = uploaded.publicId;
      await homepageService.safeDeleteImage(existing.imagePublicId);
    }

    if (orderHandled) delete updates.order;

    const hasFieldUpdates = Object.keys(updates).length > 0;
    const updated = hasFieldUpdates
      ? await homepageService.updateClientele(id, updates)
      : await homepageService.findClienteleById(id);
    return response.successResponse(res, updated, "Clientele updated.");
  } catch (err) {
    console.error("updateClientele:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "An error occurred",
      500,
    );
  }
};

const deleteClientele = async (req, res) => {
  try {
    const id = req.params.id;
    if (!validateId(id, "id", res)) return;
    const deleted = await homepageService.deleteClientele(id);
    if (!deleted)
      return response.errorResponse(
        res,
        [{ msg: "Clientele not found." }],
        "Not found",
        404,
      );
    await homepageService.safeDeleteImage(deleted.imagePublicId);
    return response.successResponse(res, {}, "Clientele deleted.");
  } catch (err) {
    console.error("deleteClientele:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getHomeSliders,
  createHomeSlider,
  updateHomeSlider,
  deleteHomeSlider,
  getHomeShowcases,
  createHomeShowcase,
  updateHomeShowcase,
  uploadShowcaseImages,
  deleteShowcaseImage,
  deleteHomeShowcase,
  getSignatureStyles,
  createSignatureStyle,
  updateSignatureStyle,
  deleteSignatureStyle,
  getClientele,
  createClientele,
  updateClientele,
  deleteClientele,
};
