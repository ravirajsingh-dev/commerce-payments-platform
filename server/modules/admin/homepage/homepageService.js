const HomeSlider = require("../../../models/HomeSlider");
const HomeShowcase = require("../../../models/HomeShowcase");
const SignatureStyle = require("../../../models/SignatureStyle");
const Clientele = require("../../../models/Clientele");
const Product = require("../../../models/Product");
const {
  uploadFileToR2,
  deleteFileFromR2,
  normalizePublicId,
  deleteMultipleFromR2,
} = require("../../../utils/r2Helper");

const SHOWCASE_GALLERY_FOLDER = "homepage/showcase/gallery";

const TEMP_SLIDER_ORDER = 999999;
const TEMP_SIGNATURE_ORDER = 999998;
const TEMP_CLIENTELE_ORDER = 999997;

let legacyHomeSliderMigrationDone = false;

const uploadImage = async (file, folder) => {
  const uploaded = await uploadFileToR2(file, folder);
  return { url: uploaded.url, publicId: uploaded.publicId };
};

const safeDeleteImage = async (publicId) => {
  const normalized = normalizePublicId(publicId);
  if (!normalized) return;
  await deleteFileFromR2(normalized);
};

/** Deletes every distinct R2 key referenced by a signature-style row (legacy rows may store URL only). */
const deleteSignatureStyleR2ByDocument = async (doc) => {
  if (!doc) return;
  const keys = new Set();
  for (const c of [doc.imagePublicId, doc.image]) {
    const k = normalizePublicId(c);
    if (k) keys.add(k);
  }
  await deleteMultipleFromR2([...keys]);
};

const normalizeShowcaseImages = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      const url = String(image?.url || "").trim();
      const publicId = normalizePublicId(image?.publicId || image?.url || "");
      return { url, publicId };
    })
    .filter((image) => image.url && image.publicId);
};

const uploadShowcaseImageFiles = async (files = []) => {
  const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (normalizedFiles.length === 0) return [];
  const uploadedPublicIds = [];
  try {
    const uploaded = await Promise.all(
      normalizedFiles.map(async (file) => {
        const result = await uploadImage(file, SHOWCASE_GALLERY_FOLDER);
        if (result?.publicId) uploadedPublicIds.push(result.publicId);
        return result;
      }),
    );
    return uploaded;
  } catch (err) {
    await deleteMultipleFromR2(uploadedPublicIds);
    throw err;
  }
};

const normalizeHomeSliderOrdersSequential = async () => {
  const rows = await HomeSlider.find({})
    .sort({ order: 1, createdAt: 1 })
    .select("_id")
    .lean();
  const ops = rows.map((r, i) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { order: i + 1 } },
    },
  }));
  if (ops.length) await HomeSlider.bulkWrite(ops);
};

const migrateLegacyHomeSlidersIfNeeded = async () => {
  if (legacyHomeSliderMigrationDone) return;
  try {
    const legacyRows = await HomeSlider.find({
      $or: [{ heading: { $exists: false } }, { heading: null }],
    }).lean();

    if (legacyRows.length === 0) {
      legacyHomeSliderMigrationDone = true;
      return;
    }

    for (const doc of legacyRows) {
      const heading =
        (doc.title != null && String(doc.title).trim()) ||
        (doc.heading != null && String(doc.heading).trim()) ||
        "Slide";
      const shortDesc =
        doc.shortDesc != null
          ? String(doc.shortDesc).trim()
          : doc.subtitle != null
            ? String(doc.subtitle).trim()
            : "";
      const status =
        typeof doc.status === "boolean" ? doc.status : doc.isActive !== false;
      const order = Number.isFinite(Number(doc.order))
        ? Math.trunc(Number(doc.order))
        : 1;

      await HomeSlider.updateOne(
        { _id: doc._id },
        {
          $set: { heading, shortDesc, status, order },
          $unset: {
            title: "",
            subtitle: "",
            isActive: "",
            autoPlay: "",
            mobileImage: "",
            mobileImagePublicId: "",
          },
        },
      );
    }

    await normalizeHomeSliderOrdersSequential();
    legacyHomeSliderMigrationDone = true;
  } catch (err) {
    console.error("migrateLegacyHomeSlidersIfNeeded:", err);
  }
};

const getNextSliderOrder = async () => {
  await migrateLegacyHomeSlidersIfNeeded();
  const agg = await HomeSlider.aggregate([
    { $group: { _id: null, maxOrder: { $max: "$order" } } },
  ]);
  const max = agg[0]?.maxOrder;
  return Number.isFinite(max) ? max + 1 : 1;
};

const reorderHomeSliderOrder = async (id, newOrder) => {
  await migrateLegacyHomeSlidersIfNeeded();
  const current = await HomeSlider.findById(id).lean();
  if (!current) return;
  const oldOrder = Math.trunc(Number(current.order)) || 0;
  newOrder = Math.trunc(Number(newOrder));
  if (!Number.isFinite(newOrder) || newOrder < 1 || oldOrder === newOrder)
    return;

  await HomeSlider.findByIdAndUpdate(id, {
    $set: { order: TEMP_SLIDER_ORDER },
  });

  if (newOrder > oldOrder) {
    await HomeSlider.updateMany(
      { _id: { $ne: current._id }, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } },
    );
  } else {
    await HomeSlider.updateMany(
      { _id: { $ne: current._id }, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } },
    );
  }

  await HomeSlider.findByIdAndUpdate(id, { $set: { order: newOrder } });
};

const getHomeSliders = async () => {
  await migrateLegacyHomeSlidersIfNeeded();
  return HomeSlider.find({}).sort({ order: 1, createdAt: -1 }).lean();
};

const getHomeSliderById = async (id) => {
  await migrateLegacyHomeSlidersIfNeeded();
  return HomeSlider.findById(id).lean();
};

const createHomeSlider = async (payload) => HomeSlider.create(payload);

const updateHomeSlider = async (id, payload) =>
  HomeSlider.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after", runValidators: true },
  );

const deleteHomeSlider = async (id) => HomeSlider.findByIdAndDelete(id).lean();

const getHomeShowcases = async () =>
  HomeShowcase.find({}).sort({ createdAt: -1 }).lean();

const getHomeShowcaseById = async (id) => HomeShowcase.findById(id).lean();

const createHomeShowcase = async (payload) => HomeShowcase.create(payload);

const updateHomeShowcase = async (id, payload) =>
  HomeShowcase.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after", runValidators: true },
  );

const deleteHomeShowcase = async (id) =>
  HomeShowcase.findByIdAndDelete(id).lean();

const getNextSignatureStyleOrder = async () => {
  const agg = await SignatureStyle.aggregate([
    { $group: { _id: null, maxOrder: { $max: "$order" } } },
  ]);
  const max = agg[0]?.maxOrder;
  return Number.isFinite(max) ? max + 1 : 1;
};

const reorderSignatureStyleOrder = async (id, newOrder) => {
  const current = await SignatureStyle.findById(id).lean();
  if (!current) return;
  const oldOrder = Math.trunc(Number(current.order)) || 0;
  newOrder = Math.trunc(Number(newOrder));
  if (!Number.isFinite(newOrder) || newOrder < 1 || oldOrder === newOrder)
    return;

  await SignatureStyle.findByIdAndUpdate(id, {
    $set: { order: TEMP_SIGNATURE_ORDER },
  });

  if (newOrder > oldOrder) {
    await SignatureStyle.updateMany(
      { _id: { $ne: current._id }, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } },
    );
  } else {
    await SignatureStyle.updateMany(
      { _id: { $ne: current._id }, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } },
    );
  }

  await SignatureStyle.findByIdAndUpdate(id, { $set: { order: newOrder } });
};

const resolveCollectionPathForProductId = async (productId) => {
  if (!productId) return null;
  const product = await Product.findById(productId).select("slug").lean();
  if (!product?.slug) return null;
  const slug = String(product.slug).trim();
  return slug ? `/collection/${slug}` : null;
};

const getSignatureStyles = async () =>
  SignatureStyle.find({})
    .populate("productId", "name slug")
    .sort({ order: 1, createdAt: -1 })
    .lean();

const createSignatureStyle = async (payload) => SignatureStyle.create(payload);

const updateSignatureStyle = async (id, payload) =>
  SignatureStyle.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after", runValidators: true },
  );

const deleteSignatureStyle = async (id) =>
  SignatureStyle.findByIdAndDelete(id).lean();

/** Lean document for admin mutations (not populate-projected). */
const findSignatureStyleById = async (id) =>
  SignatureStyle.findById(id).lean();

const getNextClienteleOrder = async () => {
  const agg = await Clientele.aggregate([
    { $group: { _id: null, maxOrder: { $max: "$order" } } },
  ]);
  const max = agg[0]?.maxOrder;
  return Number.isFinite(max) ? max + 1 : 1;
};

const reorderClienteleOrder = async (id, newOrder) => {
  const current = await Clientele.findById(id).lean();
  if (!current) return;
  const oldOrder = Math.trunc(Number(current.order)) || 0;
  newOrder = Math.trunc(Number(newOrder));
  if (!Number.isFinite(newOrder) || newOrder < 1 || oldOrder === newOrder)
    return;

  await Clientele.findByIdAndUpdate(id, {
    $set: { order: TEMP_CLIENTELE_ORDER },
  });

  if (newOrder > oldOrder) {
    await Clientele.updateMany(
      { _id: { $ne: current._id }, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } },
    );
  } else {
    await Clientele.updateMany(
      { _id: { $ne: current._id }, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } },
    );
  }

  await Clientele.findByIdAndUpdate(id, { $set: { order: newOrder } });
};

const getClientele = async () =>
  Clientele.find({}).sort({ order: 1, createdAt: -1 }).lean();

const createClientele = async (payload) => Clientele.create(payload);

const updateClientele = async (id, payload) =>
  Clientele.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after", runValidators: true },
  );

const deleteClientele = async (id) => Clientele.findByIdAndDelete(id).lean();

const findClienteleById = async (id) => Clientele.findById(id).lean();

module.exports = {
  uploadImage,
  safeDeleteImage,
  deleteSignatureStyleR2ByDocument,
  normalizeShowcaseImages,
  uploadShowcaseImageFiles,
  migrateLegacyHomeSlidersIfNeeded,
  getNextSliderOrder,
  reorderHomeSliderOrder,
  getHomeSliders,
  getHomeSliderById,
  createHomeSlider,
  updateHomeSlider,
  deleteHomeSlider,
  getHomeShowcases,
  getHomeShowcaseById,
  createHomeShowcase,
  updateHomeShowcase,
  deleteHomeShowcase,
  getNextSignatureStyleOrder,
  reorderSignatureStyleOrder,
  resolveCollectionPathForProductId,
  getSignatureStyles,
  createSignatureStyle,
  updateSignatureStyle,
  deleteSignatureStyle,
  findSignatureStyleById,
  getNextClienteleOrder,
  reorderClienteleOrder,
  getClientele,
  createClientele,
  updateClientele,
  deleteClientele,
  findClienteleById,
};
