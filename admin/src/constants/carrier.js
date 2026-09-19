export const FULFILLMENT_MODE = {
  ONLINE: { value: "online", label: "Online" },
  OFFLINE: { value: "offline", label: "Offline" },
};

export const FULFILLMENT_MODE_LIST = Object.values(FULFILLMENT_MODE);

export const fulfillmentModeLabel = (value) =>
  FULFILLMENT_MODE_LIST.find((row) => row.value === value)?.label ?? value;

export const isOfflineFulfillmentMode = (value) =>
  value === FULFILLMENT_MODE.OFFLINE.value;
