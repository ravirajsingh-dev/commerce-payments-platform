const mongoose = require("mongoose");
const {
  validateAndNormalizeOrderAddressSnapshot,
} = require("../modules/commerce/address/validateCheckoutAddress");

const toPlainSnapshot = (value) => {
  if (!value) {
    return value;
  }
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  return { ...value };
};

const applyNormalizedSnapshot = (target, snapshot) => {
  if (target && typeof target.set === "function") {
    target.set(snapshot);
    return;
  }
  Object.assign(target, snapshot);
};

const throwSnapshotValidationError = (doc, plain, errors) => {
  const validationError = new mongoose.Error.ValidationError(doc);
  for (const entry of errors) {
    const path = `addressSnapshot.${entry.path}`;
    validationError.addError(
      path,
      new mongoose.Error.ValidatorError({
        message: entry.msg,
        path,
        value: plain?.[entry.path],
      }),
    );
  }
  throw validationError;
};

const normalizeOrderAddressSnapshot = (doc, snapshotValue) => {
  const plain = toPlainSnapshot(snapshotValue);
  const result = validateAndNormalizeOrderAddressSnapshot(plain);

  if (!result.valid) {
    throwSnapshotValidationError(doc, plain, result.errors);
  }

  applyNormalizedSnapshot(snapshotValue, result.snapshot);
  return result.snapshot;
};

const attachOrderAddressSnapshotValidation = (orderSchema) => {
  orderSchema.pre("validate", function () {
    if (!this.isModified("addressSnapshot") && !this.isNew) {
      return;
    }
    normalizeOrderAddressSnapshot(this, this.addressSnapshot);
  });

  orderSchema.pre(["findOneAndUpdate", "updateOne"], function () {
    const update = this.getUpdate();
    if (!update) {
      return;
    }

    const snapshot =
      update.addressSnapshot ??
      update.$set?.addressSnapshot ??
      update.$setOnInsert?.addressSnapshot;

    if (snapshot === undefined) {
      return;
    }

    const normalized = validateAndNormalizeOrderAddressSnapshot(
      toPlainSnapshot(snapshot),
    );

    if (!normalized.valid) {
      throwSnapshotValidationError(null, toPlainSnapshot(snapshot), normalized.errors);
    }

    if (update.addressSnapshot !== undefined) {
      update.addressSnapshot = normalized.snapshot;
    }
    if (update.$set?.addressSnapshot !== undefined) {
      update.$set.addressSnapshot = normalized.snapshot;
    }
    if (update.$setOnInsert?.addressSnapshot !== undefined) {
      update.$setOnInsert.addressSnapshot = normalized.snapshot;
    }
  });
};

module.exports = {
  attachOrderAddressSnapshotValidation,
};
