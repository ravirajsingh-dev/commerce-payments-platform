const BASE_CLAIM_TYPES = ["return", "exchange", "repair", "other"];

const BASE_CLAIM_REASONS = [
  "size_or_fit_issue",
  "damaged_or_defective",
  "wrong_item_received",
  "not_as_described",
  "quality_issue",
  "other",
];

const CLAIM_TYPE_OPTIONS = BASE_CLAIM_TYPES.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));

export const EVIDENCE_FIELD_OPTIONS = [
  { value: "courierReceipt", label: "Courier receipt" },
  { value: "damageProof", label: "Damage proof" },
  { value: "fitProof", label: "Fit proof" },
  { value: "productProof", label: "Product proof" },
];

export const normalizeEvidenceKey = (raw = "") => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const byLabel = EVIDENCE_FIELD_OPTIONS.find(
    (item) =>
      item.label.toLowerCase() === trimmed.toLowerCase() ||
      item.value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) return byLabel.value;
  const slug = trimmed
    .replace(/[^a-zA-Z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
  if (!slug) return "";
  return slug.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const formatEvidenceLabel = (key = "") => {
  const normalized = String(key || "").trim();
  const known = EVIDENCE_FIELD_OPTIONS.find((item) => item.value === normalized);
  if (known) return known.label;
  return normalized
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const buildEvidenceOptions = (matrixRows = []) => {
  const map = new Map(EVIDENCE_FIELD_OPTIONS.map((item) => [item.value, item]));
  (matrixRows || []).forEach((row) => {
    (row?.requiredEvidence || []).forEach((key) => {
      const value = normalizeEvidenceKey(key);
      if (!value || map.has(value)) return;
      map.set(value, { value, label: formatEvidenceLabel(value) });
    });
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
};

export const generatePolicyCodeFromName = (name = "") => {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  return base ? `CP_${base}`.slice(0, 60) : "";
};

export const getInitialClaimPolicyForm = () => ({
  code: "",
  name: "",
  isActive: true,
  claimsEnabled: true,
  claimWindowDays: 7,
  allowedClaimTypes: [...BASE_CLAIM_TYPES],
  allowedClaimReasons: [],
  minImages: 0,
  maxImages: 10,
  requireCourierReceipt: false,
  requireDamageProof: false,
  requireFitProof: false,
  requireProductProof: false,
  requiredByTypeReason: [],
  restockableByDefault: false,
  requireQcForRestock: true,
  bespokeNonRestockableByDefault: true,
});

export const getUnifiedRequiredEvidence = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const normalized = rows.map((row) =>
    [...(row?.requiredEvidence || [])].map((key) => normalizeEvidenceKey(key)).filter(Boolean).sort(),
  );
  const first = normalized[0] || [];
  const allSame = normalized.every(
    (list) => list.length === first.length && list.every((key, index) => key === first[index]),
  );
  if (allSame) return [...(rows[0]?.requiredEvidence || [])].map((key) => normalizeEvidenceKey(key)).filter(Boolean);
  const union = new Set();
  rows.forEach((row) => {
    (row?.requiredEvidence || []).forEach((key) => {
      const value = normalizeEvidenceKey(key);
      if (value) union.add(value);
    });
  });
  return [...union];
};

export const applyUnifiedRequiredEvidence = (types = [], reasons = [], existing = [], unified = []) => {
  const evidence = (Array.isArray(unified) ? unified : [])
    .map((key) => normalizeEvidenceKey(key))
    .filter(Boolean);
  return syncTypeReasonMatrix(types, reasons, existing).map((row) => ({
    ...row,
    requiredEvidence: [...evidence],
  }));
};

const syncTypeReasonMatrix = (types = [], reasons = [], existing = []) => {
  const map = new Map(
    (existing || []).map((row) => [
      `${String(row?.claimType || "").toLowerCase()}|${String(row?.reasonCode || "").toLowerCase()}`,
      row,
    ]),
  );
  const next = [];
  for (const claimType of types) {
    for (const reasonCode of reasons) {
      const key = `${claimType}|${reasonCode}`;
      const prev = map.get(key);
      next.push({
        claimType,
        reasonCode,
        requiredEvidence: Array.isArray(prev?.requiredEvidence) ? [...prev.requiredEvidence] : [],
      });
    }
  }
  return next;
};

export const policyToFormData = (policy = {}) => {
  const allowedClaimTypes =
    policy?.eligibility?.allowedClaimTypes?.length > 0
      ? policy.eligibility.allowedClaimTypes.map((item) => String(item).toLowerCase())
      : [...BASE_CLAIM_TYPES];
  const allowedClaimReasons = (policy?.eligibility?.allowedClaimReasons || []).map((item) =>
    String(item).toLowerCase(),
  );
  const existingMatrix = Array.isArray(policy?.evidenceRules?.requiredByTypeReason)
    ? policy.evidenceRules.requiredByTypeReason.map((row) => ({
        claimType: String(row?.claimType || "").toLowerCase(),
        reasonCode: String(row?.reasonCode || "").toLowerCase(),
        requiredEvidence: Array.isArray(row?.requiredEvidence) ? [...row.requiredEvidence] : [],
      }))
    : [];

  return {
    code: policy.code || "",
    name: policy.name || "",
    isActive: policy.isActive !== false,
    claimsEnabled: policy?.eligibility?.claimsEnabled !== false,
    claimWindowDays: policy?.eligibility?.claimWindowDays ?? 7,
    allowedClaimTypes,
    allowedClaimReasons,
    minImages: policy?.evidenceRules?.minImages ?? 0,
    maxImages: policy?.evidenceRules?.maxImages ?? 10,
    requireCourierReceipt: policy?.evidenceRules?.requireCourierReceipt === true,
    requireDamageProof: policy?.evidenceRules?.requireDamageProof === true,
    requireFitProof: policy?.evidenceRules?.requireFitProof === true,
    requireProductProof: policy?.evidenceRules?.requireProductProof === true,
    requiredByTypeReason: applyUnifiedRequiredEvidence(
      allowedClaimTypes,
      allowedClaimReasons,
      existingMatrix,
      getUnifiedRequiredEvidence(existingMatrix),
    ),
    restockableByDefault: policy?.restockPolicy?.restockableByDefault === true,
    requireQcForRestock: policy?.restockPolicy?.requireQcForRestock !== false,
    bespokeNonRestockableByDefault:
      policy?.restockPolicy?.bespokeNonRestockableByDefault !== false,
  };
};

export const formDataToPayload = (formData = {}) => ({
  code: formData.code,
  name: formData.name,
  isActive: formData.isActive !== false,
  eligibility: {
    claimsEnabled: formData.claimsEnabled,
    claimWindowDays: Number(formData.claimWindowDays),
    allowedClaimTypes: formData.allowedClaimTypes || [],
    allowedClaimReasons: formData.allowedClaimReasons || [],
  },
  evidenceRules: {
    minImages: Number(formData.minImages),
    maxImages: Number(formData.maxImages),
    requireCourierReceipt: formData.requireCourierReceipt,
    requireDamageProof: formData.requireDamageProof,
    requireFitProof: formData.requireFitProof,
    requireProductProof: formData.requireProductProof,
    requiredByTypeReason: (formData.requiredByTypeReason || []).map((row) => ({
      claimType: row.claimType,
      reasonCode: row.reasonCode,
      requiredEvidence: row.requiredEvidence || [],
    })),
  },
  restockPolicy: {
    restockableByDefault: formData.restockableByDefault,
    requireQcForRestock: formData.requireQcForRestock,
    bespokeNonRestockableByDefault: formData.bespokeNonRestockableByDefault,
  },
});

export const buildReasonOptions = (rows = [], formReasons = []) => {
  const next = new Set([...BASE_CLAIM_REASONS]);
  (rows || []).forEach((row) => {
    (row?.eligibility?.allowedClaimReasons || []).forEach((item) =>
      next.add(String(item || "").trim().toLowerCase()),
    );
  });
  (formReasons || []).forEach((item) => next.add(String(item || "").trim().toLowerCase()));
  return [...next]
    .filter(Boolean)
    .map((value) => ({ value, label: value.replace(/_/g, " ") }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const buildTypeOptions = (rows = [], formTypes = []) => {
  const next = new Set([...BASE_CLAIM_TYPES]);
  (rows || []).forEach((row) => {
    (row?.eligibility?.allowedClaimTypes || []).forEach((item) =>
      next.add(String(item || "").trim().toLowerCase()),
    );
  });
  (formTypes || []).forEach((item) => next.add(String(item || "").trim().toLowerCase()));
  return [...next]
    .filter(Boolean)
    .map((value) => ({ value, label: value.replace(/_/g, " ") }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
