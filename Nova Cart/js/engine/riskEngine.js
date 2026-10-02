/**
 * NOVA SmartStock - Transparent Inventory Risk Engine
 * 
 * Implements a weighted prototype scoring model:
 * Risk Score (0-100) =
 *   40% Stock Buffer Risk
 * + 30% Sales Velocity Risk
 * + 20% Inventory Staleness Risk
 * + 10% Historical Stock-out Frequency Risk
 * 
 * Note: Clearly presented as a deterministic rule-based prototype risk engine,
 * NOT a trained machine-learning model.
 */

const RISK_WEIGHTS = {
  stockRisk: 0.40,
  salesVelocity: 0.30,
  staleness: 0.20,
  stockoutHistory: 0.10
};

/**
 * Calculate component scores and final weighted risk score
 */
function calculateProductRisk(product) {
  const stock = Number(product.currentStock) || 0;
  const sales = Number(product.avgDailySales) || 1;
  const hoursAgo = Number(product.lastUpdatedHoursAgo) || 0;
  const history = product.previousStockoutFreq || "Low";
  const isAvailable = product.isAvailable !== false && stock > 0;

  // 1. Stock Buffer Risk (40%)
  // Days of inventory remaining (DIR)
  const daysRemaining = stock / Math.max(0.5, sales);
  let stockRiskScore = 0;

  if (stock === 0) {
    stockRiskScore = 100;
  } else if (daysRemaining <= 0.4) {
    // Less than ~10 working hours of stock
    stockRiskScore = 95;
  } else if (daysRemaining <= 0.75) {
    // Less than 18 hours of stock
    stockRiskScore = 80;
  } else if (daysRemaining <= 1.2) {
    // ~1 day of buffer
    stockRiskScore = 65;
  } else if (daysRemaining <= 2.0) {
    // ~2 days of buffer
    stockRiskScore = 35;
  } else if (daysRemaining <= 3.0) {
    stockRiskScore = 15;
  } else {
    stockRiskScore = 5;
  }

  // 2. Sales Velocity Risk (30%)
  // Higher sales = faster depletion rate if stock drops unexpectedly
  let salesVelocityScore = 0;
  if (sales >= 15) {
    salesVelocityScore = 90;
  } else if (sales >= 10) {
    salesVelocityScore = 75;
  } else if (sales >= 6) {
    salesVelocityScore = 50;
  } else if (sales >= 3) {
    salesVelocityScore = 30;
  } else {
    salesVelocityScore = 15;
  }

  // 3. Inventory Staleness Risk (20%)
  // How long since the physical shelf was confirmed
  let stalenessScore = 0;
  if (hoursAgo >= 48) {
    // 2 or more days
    stalenessScore = 90;
  } else if (hoursAgo >= 24) {
    // 1 to 2 days
    stalenessScore = 70;
  } else if (hoursAgo >= 12) {
    stalenessScore = 45;
  } else if (hoursAgo >= 4) {
    stalenessScore = 20;
  } else {
    stalenessScore = 5; // Verified within 4 hours
  }

  // 4. Previous Stock-out History (10%)
  let historyScore = 0;
  switch (history.toLowerCase()) {
    case "high":
      historyScore = 90;
      break;
    case "medium":
      historyScore = 60;
      break;
    case "low":
      historyScore = 30;
      break;
    case "none":
    default:
      historyScore = 10;
      break;
  }

  // If physically 0 stock
  if (stock === 0) {
    const totalScore = 100;
    return {
      score: 100,
      level: "OUT OF STOCK",
      badgeColor: "bg-red-500/15 text-red-400 border-red-500/30",
      categoryColor: "text-red-400",
      daysRemaining: 0,
      components: {
        stockRisk: 100,
        salesVelocity: salesVelocityScore,
        staleness: stalenessScore,
        stockoutHistory: historyScore
      },
      reason: "Out of Stock — Shelf is empty (0 units). Item is causing order rejections.",
      recommendedAction: "Replenish immediately or toggle unavailable to stop cancellations."
    };
  }

  // Weighted sum
  const rawScore = (
    RISK_WEIGHTS.stockRisk * stockRiskScore +
    RISK_WEIGHTS.salesVelocity * salesVelocityScore +
    RISK_WEIGHTS.staleness * stalenessScore +
    RISK_WEIGHTS.stockoutHistory * historyScore
  );

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Risk Classification
  let level = "LOW";
  let badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  let categoryColor = "text-emerald-400";
  let reason = "";
  let recommendedAction = "Stock healthy. Normal monitoring.";

  if (score >= 81) {
    level = "CRITICAL";
    badgeColor = "bg-rose-500/20 text-rose-400 border-rose-500/40";
    categoryColor = "text-rose-400";
    reason = `Critical Risk — Current stock (${stock} units) covers only ${(daysRemaining * 24).toFixed(0)}h against daily velocity (${sales} units/day). Unverified for ${product.lastUpdatedText || hoursAgo + 'h'}.`;
    recommendedAction = "Verify physical stock now & place urgent restock order";
  } else if (score >= 61) {
    level = "HIGH";
    badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/40";
    categoryColor = "text-amber-400";
    reason = `High Risk — Current stock is ${stock} units while daily sales are ${sales} units (${daysRemaining.toFixed(1)} days of coverage). Last updated ${product.lastUpdatedText || hoursAgo + 'h ago'}.`;
    recommendedAction = "Verify shelf stock and prepare next supplier batch";
  } else if (score >= 31) {
    level = "MEDIUM";
    badgeColor = "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    categoryColor = "text-yellow-300";
    reason = `Medium Risk — Adequate stock (${stock} units) for ~${daysRemaining.toFixed(1)} days. Monitoring sales velocity.`;
    recommendedAction = "Monitor velocity; confirm inventory before peak evening rush";
  } else {
    level = "LOW";
    badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    categoryColor = "text-emerald-400";
    reason = `Low Risk — Healthy inventory (${stock} units, ${daysRemaining.toFixed(1)} days of cover). Recently verified.`;
    recommendedAction = "Optimal stock levels. No immediate action required.";
  }

  return {
    score,
    level,
    badgeColor,
    categoryColor,
    daysRemaining: Number(daysRemaining.toFixed(1)),
    components: {
      stockRisk: Math.round(stockRiskScore),
      salesVelocity: Math.round(salesVelocityScore),
      staleness: Math.round(stalenessScore),
      stockoutHistory: Math.round(historyScore)
    },
    reason,
    recommendedAction
  };
}

/**
 * Batch enrich an array of products with real-time risk scores
 */
function enrichProductsWithRisk(products) {
  return products.map(prod => {
    const risk = calculateProductRisk(prod);
    return {
      ...prod,
      riskScore: risk.score,
      riskLevel: risk.level,
      riskBadgeColor: risk.badgeColor,
      riskCategoryColor: risk.categoryColor,
      daysRemaining: risk.daysRemaining,
      riskReason: risk.reason,
      recommendedAction: risk.recommendedAction,
      riskComponents: risk.components
    };
  });
}

// Module export for Node or global window for browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RISK_WEIGHTS, calculateProductRisk, enrichProductsWithRisk };
}
