/**
 * One-shot: drop legacy UNIQUE compound index on (productId, attributeFingerprint)
 * and recreate it as non-unique, matching server/models/ProductVariant.js.
 *
 * Usage (from repo root, with MONGO_URI in env):
 *   node server/scripts/fixProductVariantFingerprintIndex.js
 */

require("../config/config");
const mongoose = require("mongoose");
const { MONGO_URI } = require("../config/config");

const main = async () => {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  });
  const coll = mongoose.connection.collection("product_variants");
  const indexes = await coll.indexes();
  const compound = indexes.find(
    (i) =>
      i?.key &&
      i.key.productId === 1 &&
      i.key.attributeFingerprint === 1,
  );
  if (!compound) {
    console.log("No compound index on (productId, attributeFingerprint); nothing to do.");
    await mongoose.disconnect();
    return;
  }
  if (!compound.unique) {
    console.log("Index already non-unique; nothing to do.");
    await mongoose.disconnect();
    return;
  }
  await coll.dropIndex(compound.name);
  await coll.createIndex(
    { productId: 1, attributeFingerprint: 1 },
    { unique: false, background: true },
  );
  console.log(
    `Dropped unique index "${compound.name}" and created non-unique compound index.`,
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
