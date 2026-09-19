const ClaimPolicy = require("../../../models/ClaimPolicy");
const Product = require("../../../models/Product");
const { CLAIM_TYPE_VALUES } = require("../../../shared/constants/orderClaim");
const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");

const POLICY_FIELDS =
  "code name isActive eligibility evidenceRules restockPolicy createdAt updatedAt";

const normalizeString = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => normalizeString(value).toUpperCase();

const normalizeStringList = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeString(row).toLowerCase())
    .filter(Boolean);

const normalizeClaimTypes = (rows) => normalizeStringList(rows);

const normalizeNumber = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeRequiredByTypeReason = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      claimType: normalizeString(row?.claimType).toLowerCase(),
      reasonCode: normalizeString(row?.reasonCode).toLowerCase(),
      requiredEvidence: normalizeStringList(row?.requiredEvidence),
    }))
    .filter(
      (row) =>
        row.claimType &&
        row.reasonCode &&
        CLAIM_TYPE_VALUES.includes(row.claimType),
    );

const buildEvidenceRules = (payload = {}) => {
  const source = payload?.evidenceRules;
  if (!source || typeof source !== "object") return undefined;

  return {
    requiredByTypeReason: normalizeRequiredByTypeReason(source.requiredByTypeReason),
    minImages: Math.max(0, normalizeNumber(source.minImages, 0)),
    maxImages: Math.max(0, normalizeNumber(source.maxImages, 10)),
    requireCourierReceipt: source.requireCourierReceipt === true,
    requireDamageProof: source.requireDamageProof === true,
    requireFitProof: source.requireFitProof === true,
    requireProductProof: source.requireProductProof === true,
  };
};

const buildEligibility = (payload = {}) => {
  const source = payload?.eligibility;
  if (!source || typeof source !== "object") return undefined;

  const claimWindowDaysRaw = source.claimWindowDays;
  const claimWindowDays =
    claimWindowDaysRaw === null || claimWindowDaysRaw === undefined || claimWindowDaysRaw === ""
      ? null
      : Number(claimWindowDaysRaw);

  const allowedTypes = normalizeClaimTypes(source.allowedClaimTypes);

  return {
    claimsEnabled: source.claimsEnabled !== false,
    claimWindowDays:
      claimWindowDays === null || Number.isNaN(claimWindowDays) ? null : claimWindowDays,
    allowedClaimTypes: allowedTypes.length > 0 ? allowedTypes : [...CLAIM_TYPE_VALUES],
    allowedClaimReasons: normalizeStringList(source.allowedClaimReasons),
  };
};

const buildRestockPolicy = (payload = {}) => {
  const source = payload?.restockPolicy;
  if (!source || typeof source !== "object") return undefined;

  return {
    restockableByDefault: source.restockableByDefault === true,
    requireQcForRestock: source.requireQcForRestock !== false,
    bespokeNonRestockableByDefault: source.bespokeNonRestockableByDefault !== false,
  };
};

const listClaimPolicies = async (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE, 1),
    100,
  );
  const skip = (page - 1) * limit;

  const filter = {};
  const search = normalizeString(query.search);
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { code: re }];
  }

  const isActiveRaw = normalizeString(query.isActive).toLowerCase();
  if (["true", "false", "1", "0", "yes", "no"].includes(isActiveRaw)) {
    filter.isActive = ["true", "1", "yes"].includes(isActiveRaw);
  }

  const [total, rows, summaryRows] = await Promise.all([
    ClaimPolicy.countDocuments(filter),
    ClaimPolicy.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(POLICY_FIELDS)
      .lean(),
    ClaimPolicy.aggregate([
      {
        $group: {
          _id: null,
          active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, active: 1, inactive: 1 } },
    ]),
  ]);

  const policyIds = rows.map((row) => row._id);
  const productCountRows =
    policyIds.length > 0
      ? await Product.aggregate([
          { $match: { claimPolicyId: { $in: policyIds } } },
          { $group: { _id: "$claimPolicyId", productCount: { $sum: 1 } } },
        ])
      : [];
  const productCountByPolicyId = new Map(
    productCountRows.map((row) => [String(row._id), row.productCount]),
  );
  const rowsWithUsage = rows.map((row) => ({
    ...row,
    productCount: productCountByPolicyId.get(String(row._id)) || 0,
  }));

  return {
    rows: rowsWithUsage,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    summary: summaryRows?.[0] || { active: 0, inactive: 0 },
  };
};

const createClaimPolicy = async (payload = {}) => {
  const code = normalizeCode(payload.code);
  const name = normalizeString(payload.name);

  const doc = await ClaimPolicy.create({
    code,
    name,
    isActive: payload.isActive !== false,
    eligibility: buildEligibility(payload),
    evidenceRules: buildEvidenceRules(payload),
    restockPolicy: buildRestockPolicy(payload),
  });

  return doc.toObject();
};

const getClaimPolicyById = async (id) =>
  ClaimPolicy.findById(id).select(POLICY_FIELDS).lean();

const updateClaimPolicy = async (id, payload = {}) => {
  const updates = {};
  if (payload.code !== undefined) updates.code = normalizeCode(payload.code);
  if (payload.name !== undefined) updates.name = normalizeString(payload.name);
  if (payload.isActive !== undefined) updates.isActive = payload.isActive !== false;

  const eligibility = buildEligibility(payload);
  if (eligibility) updates.eligibility = eligibility;

  const evidenceRules = buildEvidenceRules(payload);
  if (evidenceRules) updates.evidenceRules = evidenceRules;

  const restockPolicy = buildRestockPolicy(payload);
  if (restockPolicy) updates.restockPolicy = restockPolicy;

  const updated = await ClaimPolicy.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .select(POLICY_FIELDS)
    .lean();
  return updated;
};

const setClaimPolicyStatus = async (id, isActive) =>
  ClaimPolicy.findByIdAndUpdate(
    id,
    { $set: { isActive: isActive === true } },
    { returnDocument: "after", runValidators: true },
  )
    .select(POLICY_FIELDS)
    .lean();

const deleteClaimPolicy = async (id) =>
  ClaimPolicy.findByIdAndDelete(id).select(POLICY_FIELDS).lean();

module.exports = {
  listClaimPolicies,
  createClaimPolicy,
  getClaimPolicyById,
  updateClaimPolicy,
  setClaimPolicyStatus,
  deleteClaimPolicy,
};
