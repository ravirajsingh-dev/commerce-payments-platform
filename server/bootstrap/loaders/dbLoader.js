/**
 * Database Loader Module
 *
 * Handles MongoDB database connection initialization.
 * This loader connects to MongoDB using the connection string from environment
 * variables and configures connection options for reliability.
 */

const connectDB = require("../../config/db");

/**
 * Older deployments created a unique compound index on (productId, attributeFingerprint).
 * The schema now uses a non-unique index so multiple variant rows can share the same
 * color/fabric "look" (different SKUs, pricing, etc.). Drop the legacy unique index once.
 */
const ensureProductVariantFingerprintIndex = async () => {
  try {
    const ProductVariant = require("../../models/ProductVariant");
    const coll = ProductVariant.collection;
    const indexes = await coll.indexes();
    const compound = indexes.find(
      (i) =>
        i?.key &&
        i.key.productId === 1 &&
        i.key.attributeFingerprint === 1,
    );
    if (!compound?.unique) return;
    await coll.dropIndex(compound.name);
    await coll.createIndex(
      { productId: 1, attributeFingerprint: 1 },
      { unique: false, background: true },
    );
    console.log(
      "✅ product_variants: legacy unique (productId, attributeFingerprint) index replaced with a non-unique index.",
    );
  } catch (e) {
    console.warn(
      "⚠️ product_variants fingerprint index check failed (non-fatal):",
      e?.message || e,
    );
  }
};

/**
 * Legacy carriers collection used a unique `code` field; schema now uses `slug` only.
 * Drop the stale code_1 index so new documents are not rejected with dup key { code: null }.
 */
const ensureCarrierIndexes = async () => {
  try {
    const Carrier = require("../../models/Carrier");
    const coll = Carrier.collection;
    const indexes = await coll.indexes();
    const legacyCodeIndex = indexes.find((i) => i?.key?.code === 1);
    if (legacyCodeIndex) {
      await coll.dropIndex(legacyCodeIndex.name);
      console.log(
        `✅ carriers: dropped legacy index "${legacyCodeIndex.name}" (code field).`,
      );
    }
    await Carrier.syncIndexes();
  } catch (e) {
    console.warn("⚠️ carriers index check failed (non-fatal):", e?.message || e);
  }
};

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
const loadDatabase = async () => {
  try {
    await connectDB();
    await ensureProductVariantFingerprintIndex();
    await ensureCarrierIndexes();
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // connectDB already handles process.exit(1) on failure
    throw error;
  }
};

module.exports = {
  loadDatabase,
};
