const { listClaimPolicies } = require("../../../modules/admin/claim-policy/claimPolicyService");

jest.mock("../../../models/ClaimPolicy", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../../../models/Product", () => ({
  aggregate: jest.fn(),
}));

const ClaimPolicy = require("../../../models/ClaimPolicy");
const Product = require("../../../models/Product");

describe("claimPolicyService list (Phase 3 A10)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("attaches productCount to each policy row", async () => {
    const policyId = "507f1f77bcf86cd799439011";
    ClaimPolicy.countDocuments.mockResolvedValue(1);
    ClaimPolicy.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => [
                {
                  _id: policyId,
                  code: "STD",
                  name: "Standard",
                  isActive: true,
                  eligibility: { claimWindowDays: 14, allowedClaimTypes: ["return"] },
                },
              ],
            }),
          }),
        }),
      }),
    });
    ClaimPolicy.aggregate.mockResolvedValue([{ active: 1, inactive: 0 }]);
    Product.aggregate.mockResolvedValue([{ _id: policyId, productCount: 3 }]);

    const result = await listClaimPolicies({ page: 1, limit: 20 });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].productCount).toBe(3);
  });
});
