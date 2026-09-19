jest.mock("../../../infra/email/index", () => ({
  sendClaimSubmittedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendClaimApprovedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendClaimRejectedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendClaimCompletedEmail: jest.fn().mockResolvedValue({ success: true }),
}));

const emailService = require("../../../infra/email/index");
const User = require("../../../models/User");
const {
  sendClaimLifecycleEmail,
  scheduleClaimLifecycleEmail,
} = require("../../../modules/commerce/order/orderEmails");

jest.mock("../../../models/User", () => ({
  findById: jest.fn(),
}));

describe("order claim emails (Phase 4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    User.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({ name: "Claim User", email: "claim@example.com" }),
      }),
    });
  });

  it("sendClaimLifecycleEmail dispatches approved template", async () => {
    const result = await sendClaimLifecycleEmail("approved", {
      userId: "user-1",
      orderNo: "RW-TEST-001",
      claimType: "Exchange",
      decisionNote: "Approved",
    });

    expect(result.success).toBe(true);
    expect(emailService.sendClaimApprovedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "claim@example.com",
        orderNo: "RW-TEST-001",
        claimType: "Exchange",
      }),
    );
  });

  it("scheduleClaimLifecycleEmail skips during jest worker", () => {
    process.env.JEST_WORKER_ID = "1";
    scheduleClaimLifecycleEmail("submitted", {
      userId: "user-1",
      orderNo: "RW-TEST-001",
      claimType: "Return",
    });
    expect(emailService.sendClaimSubmittedEmail).not.toHaveBeenCalled();
    delete process.env.JEST_WORKER_ID;
  });
});
