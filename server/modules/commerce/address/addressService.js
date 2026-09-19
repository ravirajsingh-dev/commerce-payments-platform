const mongoose = require("mongoose");
const UserAddress = require("../../../models/UserAddress");

const ADDRESS_FIELDS = [
  "label",
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "country",
  "isDefault",
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const pickAddressFields = (payload = {}) => {
  const data = {};
  for (const field of ADDRESS_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }
  if (data.country && typeof data.country === "string") {
    data.country = data.country.trim().toUpperCase();
  }
  if (data.addressLine2 === undefined && payload.addressLine2 === "") {
    data.addressLine2 = "";
  }
  return data;
};

const clearDefaultForUser = async (userId, exceptId = null, session = null) => {
  const filter = { userId: toObjectId(userId), isDefault: true };
  if (exceptId) {
    filter._id = { $ne: toObjectId(exceptId) };
  }
  const options = session ? { session } : {};
  await UserAddress.updateMany(filter, { $set: { isDefault: false } }, options);
};

const listAddresses = async (userId) =>
  UserAddress.find({ userId: toObjectId(userId) })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

const createAddress = async (userId, payload) => {
  const data = pickAddressFields(payload);
  const existingCount = await UserAddress.countDocuments({
    userId: toObjectId(userId),
  });

  if (existingCount === 0 || data.isDefault === true) {
    data.isDefault = true;
    await clearDefaultForUser(userId);
  } else {
    data.isDefault = false;
  }

  const doc = await UserAddress.create({
    ...data,
    userId: toObjectId(userId),
  });
  return doc.toObject();
};

const findOwnedAddress = async (userId, addressId) => {
  if (!isValidObjectId(addressId)) {
    return null;
  }
  return UserAddress.findOne({
    _id: toObjectId(addressId),
    userId: toObjectId(userId),
  });
};

const updateAddress = async (userId, addressId, payload) => {
  const existing = await findOwnedAddress(userId, addressId);
  if (!existing) {
    return null;
  }

  const data = pickAddressFields(payload);
  if (data.isDefault === true) {
    await clearDefaultForUser(userId, addressId);
  }

  return UserAddress.findOneAndUpdate(
    { _id: existing._id, userId: toObjectId(userId) },
    { $set: data },
    { returnDocument: "after" },
  ).lean();
};

const deleteAddress = async (userId, addressId) => {
  const existing = await findOwnedAddress(userId, addressId);
  if (!existing) {
    return null;
  }

  const wasDefault = existing.isDefault;
  await UserAddress.deleteOne({ _id: existing._id });

  if (wasDefault) {
    const replacement = await UserAddress.findOne({ userId: toObjectId(userId) })
      .sort({ createdAt: -1 })
      .select("_id");
    if (replacement) {
      await clearDefaultForUser(userId);
      await UserAddress.updateOne(
        { _id: replacement._id },
        { $set: { isDefault: true } },
      );
    }
  }

  return { deleted: true };
};

const setDefaultAddress = async (userId, addressId) => {
  const existing = await findOwnedAddress(userId, addressId);
  if (!existing) {
    return null;
  }

  await clearDefaultForUser(userId);
  return UserAddress.findOneAndUpdate(
    { _id: existing._id, userId: toObjectId(userId) },
    { $set: { isDefault: true } },
    { returnDocument: "after" },
  ).lean();
};

module.exports = {
  ADDRESS_FIELDS,
  isValidObjectId,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
