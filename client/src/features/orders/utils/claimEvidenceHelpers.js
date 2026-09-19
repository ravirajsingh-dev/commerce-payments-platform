export const CLAIM_EVIDENCE_FIELD_LABELS = {
  images: "Photos",
  courierReceipt: "Courier receipt",
};

export const createEmptyClaimEvidence = () => ({
  images: [],
});

export const createEmptyReturnShipmentEvidence = () => ({
  courierReceipt: [],
});

export const computeClaimPhotoRequirements = (policies) => {
  const snapshots = (Array.isArray(policies) ? policies : []).filter(
    (row) => row?.eligibility?.claimsEnabled !== false,
  );

  if (!snapshots.length) {
    return { minImages: 0, maxImages: 10 };
  }

  let minImages = 0;
  let maxImages = 10;

  for (const snapshot of snapshots) {
    const rules = snapshot?.evidenceRules || {};
    minImages = Math.max(minImages, Number(rules.minImages || 0));
    maxImages = Math.min(maxImages, Number(rules.maxImages ?? 10));
  }

  return { minImages, maxImages };
};

export const validateClaimPhotos = (evidence, requirements) => {
  const images = Array.isArray(evidence?.images) ? evidence.images : [];
  const { minImages, maxImages } = requirements || {};

  if (images.length < (minImages || 0) || images.length > (maxImages ?? 10)) {
    if ((minImages || 0) === (maxImages ?? 10)) {
      return `Please upload exactly ${minImages} photo(s).`;
    }
    return `Please upload between ${minImages || 0} and ${maxImages ?? 10} photo(s).`;
  }

  return "";
};

export const validateReturnShipment = ({ evidence, customerLogistics }) => {
  const courierReceipt = Array.isArray(evidence?.courierReceipt) ? evidence.courierReceipt : [];
  if (courierReceipt.length === 0) {
    return "Please upload your courier receipt.";
  }

  if (!String(customerLogistics?.trackingNumber || "").trim()) {
    return "Please enter the tracking number.";
  }

  return "";
};
