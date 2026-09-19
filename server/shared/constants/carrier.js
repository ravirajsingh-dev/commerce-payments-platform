/** Carrier fulfillment — online (courier AWB) vs offline (pickup, bus, showroom, etc.) */
const FULFILLMENT_MODE = {
  ONLINE: { value: "online", label: "Online" },
  OFFLINE: { value: "offline", label: "Offline" },
};

const FULFILLMENT_MODE_LIST = Object.values(FULFILLMENT_MODE);
const FULFILLMENT_MODE_VALUES = FULFILLMENT_MODE_LIST.map((row) => row.value);
const FULFILLMENT_MODE_SET = new Set(FULFILLMENT_MODE_VALUES);

const isOfflineFulfillmentMode = (value) => value === FULFILLMENT_MODE.OFFLINE.value;

module.exports = {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_VALUES,
  FULFILLMENT_MODE_SET,
  isOfflineFulfillmentMode,
};
