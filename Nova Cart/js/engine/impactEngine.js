/**
 * NOVA SmartStock - Business Impact Simulation Engine
 * 
 * Accurately models the financial & operational ROI based on NOVA CART's case facts:
 * - 38,500 monthly orders
 * - ₹486 Average Order Value (AOV)
 * - ₹26.1 Lakh monthly revenue
 * - 11% current cancellation rate (up from 6%)
 * - 35% of cancellations directly caused by unavailable inventory
 * - 620 partner stores across 3 Indian cities
 * 
 * NOTE: Clearly labelled as MODELLED / PROTOTYPE ESTIMATES for strategic evaluation.
 */

const NOVA_BASE_CASE = {
  monthlyOrders: 38500,
  averageOrderValue: 486,
  monthlyRevenueLakhs: 26.1,
  currentCancellationRate: 11.0, // 11%
  stockoutCancellationShare: 0.35, // 35% of cancellations are stock-out related
  currentRepeatPurchaseRate: 27.0, // 27% (down from 41%)
  avgSupportCostPerCancellation: 95, // ₹95 for support agent, refund gateway fee, rider compensation
  totalPartnerStores: 620
};

/**
 * Calculates real-time impact simulation based on user-adjustable scenario parameters
 */
function calculateBusinessImpact(params = {}) {
  const currentRate = params.currentRate ?? NOVA_BASE_CASE.currentCancellationRate;
  const targetRate = params.targetRate ?? 8.0; // Default target scenario (3% reduction)
  const storeAdoptionPct = params.storeAdoptionPct ?? 75; // % of 620 stores actively using SmartStock
  const aov = params.aov ?? NOVA_BASE_CASE.averageOrderValue;
  const monthlyOrders = params.monthlyOrders ?? NOVA_BASE_CASE.monthlyOrders;

  // Rate delta
  const rateReduction = Math.max(0, currentRate - targetRate);
  
  // Total cancellations today vs target
  const currentTotalCancellations = Math.round(monthlyOrders * (currentRate / 100));
  const targetTotalCancellations = Math.round(monthlyOrders * (targetRate / 100));
  const totalCancellationsPrevented = currentTotalCancellations - targetTotalCancellations;

  // Stockout specific calculations (35% of cancellations)
  const currentStockoutCancellations = Math.round(currentTotalCancellations * NOVA_BASE_CASE.stockoutCancellationShare);
  const targetStockoutCancellations = Math.round(targetTotalCancellations * NOVA_BASE_CASE.stockoutCancellationShare);
  
  // Adjusted by store adoption factor
  const adoptionMultiplier = storeAdoptionPct / 100;
  const stockoutCancellationsPrevented = Math.round(
    (currentStockoutCancellations - targetStockoutCancellations) * adoptionMultiplier
  );

  // Financial impact
  const gmvRecoveredMonthly = Math.round(totalCancellationsPrevented * aov * adoptionMultiplier);
  const annualGmvRecovered = gmvRecoveredMonthly * 12;

  // Operational cost savings (support tickets, refund fees, rider idle pay)
  const monthlySupportSavings = Math.round(
    totalCancellationsPrevented * NOVA_BASE_CASE.avgSupportCostPerCancellation * adoptionMultiplier
  );
  const annualSupportSavings = monthlySupportSavings * 12;

  // Total monthly economic value created
  const totalMonthlyValue = gmvRecoveredMonthly + monthlySupportSavings;
  const totalAnnualValue = totalMonthlyValue * 12;

  // Inventory accuracy improvement model
  const baselineAccuracy = 72; // Avg across stores
  const projectedAccuracy = Math.min(96, Math.round(baselineAccuracy + (rateReduction * 4.2 * adoptionMultiplier)));

  // Repeat purchase recovery estimate
  const repeatPurchaseGain = Number((rateReduction * 0.9 * adoptionMultiplier).toFixed(1));
  const projectedRepeatRate = Math.min(41, Number((NOVA_BASE_CASE.currentRepeatPurchaseRate + repeatPurchaseGain).toFixed(1)));

  return {
    meta: {
      type: "MODELLED_PROTOTYPE_ESTIMATE",
      disclaimer: "These figures are simulated business estimates based on NOVA CART case benchmarks."
    },
    assumptions: {
      monthlyOrders,
      aov,
      currentRate,
      targetRate,
      storeAdoptionPct,
      participatingStores: Math.round(NOVA_BASE_CASE.totalPartnerStores * adoptionMultiplier)
    },
    metrics: {
      rateReductionPercentagePoints: Number(rateReduction.toFixed(1)),
      monthlyCancellationsPrevented: Math.round(totalCancellationsPrevented * adoptionMultiplier),
      stockoutOrdersSaved: stockoutCancellationsPrevented,
      baselineAccuracy,
      projectedAccuracy,
      accuracyGainPct: projectedAccuracy - baselineAccuracy,
      projectedRepeatRate,
      repeatGainPoints: repeatPurchaseGain,
      gmvRecoveredMonthly,
      annualGmvRecovered,
      monthlySupportSavings,
      annualSupportSavings,
      totalMonthlyValue,
      totalAnnualValue
    }
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { NOVA_BASE_CASE, calculateBusinessImpact };
}
