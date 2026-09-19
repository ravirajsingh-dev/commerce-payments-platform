/**
 * Build a carrier track URL by substituting {trackingNumber} / {awb} placeholders.
 */
const buildCarrierTrackingLink = (trackingUrl, trackingNumber) => {
  const url = String(trackingUrl || "").trim();
  const awb = String(trackingNumber || "").trim();
  if (!url || !awb) {
    return null;
  }
  return url.replace(/\{trackingNumber\}/gi, awb).replace(/\{awb\}/gi, awb);
};

module.exports = {
  buildCarrierTrackingLink,
};
