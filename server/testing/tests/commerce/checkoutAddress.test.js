const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const UserAddress = require("../../../models/UserAddress");
const {
  CHECKOUT_ADDRESS_STRATEGY,
  CHECKOUT_ADDRESS_SNAPSHOT_FIELDS,
} = require("../../../modules/commerce/address/checkoutAddressShape");
const {
  validateCheckoutAddress,
  userAddressToSnapshot,
} = require("../../../modules/commerce/address/validateCheckoutAddress");
const {
  resolveCheckoutAddressSnapshot,
} = require("../../../modules/commerce/address/checkoutAddressService");

describe("checkout address (Phase 4)", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId();

  const validInline = {
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
      dbName: "commerce-checkout-address-tests",
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

  it("documents guest vs saved-book strategy in code", () => {
    expect(CHECKOUT_ADDRESS_STRATEGY.savedBook).toBe("logged_in_only");
    expect(CHECKOUT_ADDRESS_STRATEGY.guestPersistence).toBe("order_snapshot_only");
    expect(CHECKOUT_ADDRESS_SNAPSHOT_FIELDS).toEqual(
      expect.arrayContaining([
        "fullName",
        "phone",
        "addressLine1",
        "city",
        "state",
        "pincode",
        "country",
        "userAddressId",
      ]),
    );
  });

  it("validates and normalizes inline checkout address fields", () => {
    const result = validateCheckoutAddress(validInline);

    expect(result.valid).toBe(true);
    expect(result.snapshot).toEqual({
      fullName: "Ravi Raj Singh",
      phone: "9876543210",
      addressLine1: "12 MG Road",
      addressLine2: "Near City Mall",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      country: "IN",
    });
  });

  it("rejects invalid phone, pincode, and unexpected fields", () => {
    const phoneResult = validateCheckoutAddress({
      ...validInline,
      phone: "123456789a",
    });
    expect(phoneResult.valid).toBe(false);
    expect(phoneResult.errors.some((e) => e.path === "phone")).toBe(true);

    const pincodeResult = validateCheckoutAddress({
      ...validInline,
      pincode: "30",
    });
    expect(pincodeResult.valid).toBe(false);

    const extraResult = validateCheckoutAddress({
      ...validInline,
      label: "Home",
    });
    expect(extraResult.valid).toBe(false);
    expect(extraResult.errors.some((e) => e.path === "label")).toBe(true);
  });

  it("maps UserAddress rows to snapshot shape with userAddressId", async () => {
    const saved = await UserAddress.create({
      userId,
      label: "Home",
      ...validInline,
    });

    const snapshot = userAddressToSnapshot(saved.toObject());
    expect(snapshot.label).toBeUndefined();
    expect(snapshot.userAddressId).toBe(String(saved._id));
    expect(snapshot.fullName).toBe(validInline.fullName);
  });

  it("allows guests to validate inline address without auth", async () => {
    const result = await resolveCheckoutAddressSnapshot({
      userId: undefined,
      body: validInline,
    });

    expect(result.valid).toBe(true);
    expect(result.snapshot.country).toBe("IN");
  });

  it("requires auth when using userAddressId", async () => {
    const saved = await UserAddress.create({
      userId,
      label: "Home",
      ...validInline,
    });

    const result = await resolveCheckoutAddressSnapshot({
      userId: undefined,
      body: { userAddressId: String(saved._id) },
    });

    expect(result.valid).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("resolves snapshot from a saved address for the owning user", async () => {
    const saved = await UserAddress.create({
      userId,
      label: "Home",
      ...validInline,
    });

    const result = await resolveCheckoutAddressSnapshot({
      userId,
      body: { userAddressId: String(saved._id) },
    });

    expect(result.valid).toBe(true);
    expect(result.snapshot.userAddressId).toBe(String(saved._id));
    expect(result.snapshot.fullName).toBe(validInline.fullName);
  });

  it("exposes POST /api/checkout/validate-address on checkout routes", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/checkout/checkoutRoutes.js",
      ),
      "utf8",
    );

    expect(source).toContain('"/validate-address"');
    expect(source).toContain("validateCheckoutAddressHandler");
  });
});
