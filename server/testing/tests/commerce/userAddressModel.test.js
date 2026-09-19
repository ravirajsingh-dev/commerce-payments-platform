const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const UserAddress = require("../../../models/UserAddress");

describe("UserAddress model (Phase 2)", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId();

  const validAddress = {
    userId,
    label: "Home",
    fullName: "Ravi Raj Singh",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    addressLine2: "Near City Mall",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-user-address-tests",
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

  it("persists required fields with defaults and timestamps", async () => {
    const doc = await UserAddress.create(validAddress);

    expect(doc.country).toBe("IN");
    expect(doc.isDefault).toBe(false);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
    expect(doc.addressLine2).toBe("Near City Mall");
  });

  it("rejects invalid phone and pincode", async () => {
    await expect(
      UserAddress.create({ ...validAddress, phone: "123456789a" }),
    ).rejects.toThrow(/Phone must be exactly 10 digits/);

    await expect(
      UserAddress.create({ ...validAddress, pincode: "3020ab" }),
    ).rejects.toThrow(/Pincode must be exactly 6 digits/);
  });

  it("allows only one default address per user", async () => {
    await UserAddress.create({ ...validAddress, isDefault: true });
    await expect(
      UserAddress.create({
        ...validAddress,
        label: "Office",
        addressLine1: "45 Business Park",
        isDefault: true,
      }),
    ).rejects.toThrow();
  });

  it("allows multiple non-default addresses for the same user", async () => {
    await UserAddress.create(validAddress);
    const second = await UserAddress.create({
      ...validAddress,
      label: "Office",
      addressLine1: "45 Business Park",
    });

    expect(second.isDefault).toBe(false);
    const count = await UserAddress.countDocuments({ userId });
    expect(count).toBe(2);
  });
});
