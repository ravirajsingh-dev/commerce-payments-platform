const testOrderAmounts = ({
  items = 1000,
  discount = 0,
  shipping = 0,
  gst = 0,
  total,
} = {}) => {
  const computedTotal =
    total != null ? total : Math.max(0, items - discount + gst + shipping);

  return {
    items,
    discount,
    shipping,
    gst,
    total: computedTotal,
  };
};

module.exports = { testOrderAmounts };
