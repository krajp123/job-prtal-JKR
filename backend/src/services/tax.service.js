const DEFAULT_GST_RATE = 18;

function calculateCharge(baseAmount, { gstEnabled = true, gstRate = DEFAULT_GST_RATE } = {}) {
  const base = Math.round(Number(baseAmount) * 100) / 100;
  const rate = Number(gstRate);
  const gstAmount = gstEnabled && Number.isFinite(rate) && rate > 0 ? Math.round(base * rate) / 100 : 0;
  return {
    baseAmount: base,
    gstRate: gstAmount > 0 ? rate : 0,
    gstAmount,
    totalAmount: Math.round((base + gstAmount) * 100) / 100,
  };
}

module.exports = { DEFAULT_GST_RATE, calculateCharge };
