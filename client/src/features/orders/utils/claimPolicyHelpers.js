const normalize = (value) => String(value || "").trim().toLowerCase();

export const DEFAULT_CLAIM_TYPES = [
  { value: "return", label: "Return" },
  { value: "exchange", label: "Exchange" },
  { value: "repair", label: "Repair" },
  { value: "other", label: "Other concern" },
];

export const DEFAULT_CLAIM_REASONS = [
  { value: "size_or_fit_issue", label: "Size or fit issue" },
  { value: "damaged_or_defective", label: "Damaged or defective" },
  { value: "wrong_item_received", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "other", label: "Other" },
];

const TYPE_LABELS = Object.fromEntries(DEFAULT_CLAIM_TYPES.map((row) => [row.value, row.label]));
const REASON_LABELS = Object.fromEntries(DEFAULT_CLAIM_REASONS.map((row) => [row.value, row.label]));

export const resolveClaimFormOptions = (
  itemPolicies = [],
  {
    allTypes = DEFAULT_CLAIM_TYPES,
    allReasons = DEFAULT_CLAIM_REASONS,
  } = {},
) => {
  if (!itemPolicies.length) {
    return {
      policyAllowsClaims: true,
      allowedTypes: allTypes,
      allowedReasons: allReasons,
    };
  }

  const enabledForAll = itemPolicies.every(
    (policy) => policy?.eligibility?.claimsEnabled !== false,
  );
  if (!enabledForAll) {
    return { policyAllowsClaims: false, allowedTypes: [], allowedReasons: [] };
  }

  const unionTypes = new Set();
  const unionReasons = new Set();
  let hasTypeRestrictions = false;
  let hasReasonRestrictions = false;

  itemPolicies.forEach((policy) => {
    const types = policy?.eligibility?.allowedClaimTypes || [];
    const reasons = policy?.eligibility?.allowedClaimReasons || [];
    if (types.length) {
      hasTypeRestrictions = true;
      types.forEach((row) => unionTypes.add(normalize(row)));
    }
    if (reasons.length) {
      hasReasonRestrictions = true;
      reasons.forEach((row) => unionReasons.add(normalize(row)));
    }
  });

  const allowedTypes = (hasTypeRestrictions ? allTypes : allTypes).filter(
    (row) => !hasTypeRestrictions || unionTypes.has(row.value),
  );
  const allowedReasons = (hasReasonRestrictions ? allReasons : allReasons).filter(
    (row) => !hasReasonRestrictions || unionReasons.has(row.value),
  );

  return {
    policyAllowsClaims: allowedTypes.length > 0 && allowedReasons.length > 0,
    allowedTypes: allowedTypes.map((row) => ({
      value: row.value,
      label: TYPE_LABELS[row.value] || row.label || row.value.replaceAll("_", " "),
    })),
    allowedReasons: allowedReasons.map((row) => ({
      value: row.value,
      label: REASON_LABELS[row.value] || row.label || row.value.replaceAll("_", " "),
    })),
  };
};
