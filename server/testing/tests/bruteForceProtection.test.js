const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const {
  checkBruteForceProtection,
  recordFailedAttempt,
  resetAttempts,
} = require("../../shared/utils/bruteForceProtection");
const FailedLoginAttempt = require("../../models/FailedLoginAttempt");

describe("bruteForceProtection (DB-backed)", () => {
  let mongoServer;
  const identifier = "test-user-identifier";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: "phase3-tests" });
  });

  afterEach(async () => {
    await FailedLoginAttempt.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("keeps account unblocked before max attempts", async () => {
    await recordFailedAttempt(identifier);
    await recordFailedAttempt(identifier);

    const state = await checkBruteForceProtection(identifier);
    expect(state.isBlocked).toBe(false);
    expect(state.remainingAttempts).toBe(3);
  });

  it("blocks account at max failed attempts", async () => {
    for (let i = 0; i < 5; i += 1) {
      await recordFailedAttempt(identifier);
    }

    const state = await checkBruteForceProtection(identifier);
    expect(state.isBlocked).toBe(true);
    expect(state.remainingAttempts).toBe(0);
    expect(state.remainingMinutes).toBeGreaterThan(0);
  });

  it("resets attempts after successful login", async () => {
    await recordFailedAttempt(identifier);
    await recordFailedAttempt(identifier);

    await resetAttempts(identifier);

    const state = await checkBruteForceProtection(identifier);
    expect(state.isBlocked).toBe(false);
    expect(state.remainingAttempts).toBe(5);
  });
});
