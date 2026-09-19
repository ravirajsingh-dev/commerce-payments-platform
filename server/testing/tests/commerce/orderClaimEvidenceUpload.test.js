const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.mock("../../../utils/r2Helper", () => ({
  uploadFileToR2: jest.fn(async (file, folder = "") => {
    const name = String(file?.originalname || "file.jpg");
    const key = `${folder}/${Date.now()}-${name}`.replace(/^\/+/, "");
    return {
      url: `https://cdn.test/${encodeURIComponent(key)}`,
      publicId: key,
    };
  }),
}));

const Order = require("../../../models/Order");
const User = require("../../../models/User");
const {
  uploadClaimEvidenceFile,
  ORDER_CLAIM_EVIDENCE_ERROR,
} = require("../../../modules/commerce/order/orderClaimEvidenceService");
const r2Helper = require("../../../utils/r2Helper");

describe("order claim evidence upload", () => {
  let mongoServer;
  let userId;
  let orderNo;

  const sampleFile = (overrides = {}) => ({
    originalname: "damage.jpg",
    mimetype: "image/jpeg",
    size: 120000,
    buffer: Buffer.from("fake-image"),
    ...overrides,
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-claim-evidence-tests",
    });

    const user = await User.create({
      name: "Evidence User",
      phone: "9123456799",
      email: "claim-evidence@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const order = await Order.create({
      userId: user._id,
      orderNo: "RW-20260530-0001",
      status: "delivered",
      paymentStatus: "cod_paid",
      paymentMethod: "cod",
      amounts: {
        items: 1000,
        discount: 0,
        shipping: 0,
        gst: 0,
        total: 1000,
      },
      addressSnapshot: {
        fullName: "Evidence User",
        phone: "9123456799",
        addressLine1: "Test",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
    orderNo = order.orderNo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("uploads claim evidence to R2 for owned order", async () => {
    const result = await uploadClaimEvidenceFile(
      userId,
      orderNo,
      "images",
      sampleFile(),
    );

    expect(result.ok).toBe(true);
    expect(result.file.url).toContain("https://cdn.test/");
    expect(result.file.key).toContain(`orders/claims/evidence/${orderNo}/`);
    expect(r2Helper.uploadFileToR2).toHaveBeenCalled();
  });

  it("rejects invalid evidence category", async () => {
    const result = await uploadClaimEvidenceFile(
      userId,
      orderNo,
      "invalid",
      sampleFile(),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CLAIM_EVIDENCE_ERROR.INVALID_CATEGORY);
  });

  it("rejects unsupported mime type for image category", async () => {
    const result = await uploadClaimEvidenceFile(
      userId,
      orderNo,
      "images",
      sampleFile({ mimetype: "application/pdf", originalname: "proof.pdf" }),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CLAIM_EVIDENCE_ERROR.INVALID_FILE_TYPE);
  });

  it("accepts pdf for courier receipt category", async () => {
    const result = await uploadClaimEvidenceFile(
      userId,
      orderNo,
      "courierReceipt",
      sampleFile({ mimetype: "application/pdf", originalname: "receipt.pdf" }),
    );

    expect(result.ok).toBe(true);
    expect(result.file.key).toContain("receipt.pdf");
  });
});
