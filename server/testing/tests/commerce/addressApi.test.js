const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const UserAddress = require("../../../models/UserAddress");
const addressService = require("../../../modules/commerce/address/addressService");

describe("address API (Phase 3)", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  const basePayload = {
    label: "Home",
    fullName: "Ravi Raj Singh",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-address-api-tests",
    });
    await UserAddress.syncIndexes();
  });

  afterEach(async () => {
    await UserAddress.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("lists addresses newest-first with default first", async () => {
    await addressService.createAddress(userId, basePayload);
    await addressService.createAddress(userId, {
      ...basePayload,
      label: "Office",
      addressLine1: "45 Business Park",
      isDefault: true,
    });

    const addresses = await addressService.listAddresses(userId);
    expect(addresses).toHaveLength(2);
    expect(addresses[0].isDefault).toBe(true);
    expect(addresses[0].label).toBe("Office");
  });

  it("makes the first saved address the default", async () => {
    const created = await addressService.createAddress(userId, basePayload);
    expect(created.isDefault).toBe(true);
  });

  it("updates an owned address", async () => {
    const created = await addressService.createAddress(userId, basePayload);
    const updated = await addressService.updateAddress(userId, created._id, {
      city: "Udaipur",
    });

    expect(updated.city).toBe("Udaipur");
  });

  it("returns null when updating another user's address", async () => {
    const created = await addressService.createAddress(userId, basePayload);
    const updated = await addressService.updateAddress(otherUserId, created._id, {
      city: "Udaipur",
    });
    expect(updated).toBeNull();
  });

  it("sets default and clears the previous default", async () => {
    const home = await addressService.createAddress(userId, basePayload);
    const office = await addressService.createAddress(userId, {
      ...basePayload,
      label: "Office",
      addressLine1: "45 Business Park",
    });

    const defaulted = await addressService.setDefaultAddress(userId, office._id);
    expect(defaulted.isDefault).toBe(true);

    const homeAfter = await UserAddress.findById(home._id).lean();
    expect(homeAfter.isDefault).toBe(false);
  });

  it("deletes an address and promotes a new default when needed", async () => {
    const home = await addressService.createAddress(userId, basePayload);
    const office = await addressService.createAddress(userId, {
      ...basePayload,
      label: "Office",
      addressLine1: "45 Business Park",
      isDefault: true,
    });

    await addressService.deleteAddress(userId, office._id);

    const remaining = await UserAddress.findById(home._id).lean();
    expect(remaining).not.toBeNull();
    expect(remaining.isDefault).toBe(true);
  });

  it("mounts authenticated address routes under /api/users/addresses", () => {
    const userRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/user/userRoutes.js"),
      "utf8",
    );
    const addressRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/address/addressRoutes.js"),
      "utf8",
    );

    expect(userRoutesSource).toContain('"/addresses"');
    expect(userRoutesSource).toContain("../commerce/address/addressRoutes");
    expect(addressRoutesSource).toContain("UserAuth");
    expect(addressRoutesSource).toContain('"/:id/set-default"');
  });
});
