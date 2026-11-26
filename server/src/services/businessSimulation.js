import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';

export const BUSINESS_SIMULATION_CONFIG = Object.freeze({
  STARTING_WEEK: 1,
  DURATION_WEEKS: 12,
  STARTING_CAPITAL: 50000,
  MAX_MARKETING_SPEND: 25000,
});

export const BUSINESS_TYPES = Object.freeze({
  cafe: Object.freeze({
    key: 'cafe',
    name: 'Café',
    description: 'High-volume specialty coffee and snacks shop with steady daily footfall.',
    unitCost: 80,
    recommendedPrice: 180,
    minPrice: 80,
    maxPrice: 500,
    weeklyFixedCost: 4500,
    baseWeeklyDemand: 90,
    maxRestockPerWeek: 500,
    priceElasticity: 1.35,
    marketingBoostFactor: 0.008,
  }),
  bakery: Object.freeze({
    key: 'bakery',
    name: 'Bakery',
    description: 'Artisanal breads, cakes, and pastries with strong festival spikes.',
    unitCost: 120,
    recommendedPrice: 260,
    minPrice: 120,
    maxPrice: 700,
    weeklyFixedCost: 4000,
    baseWeeklyDemand: 70,
    maxRestockPerWeek: 400,
    priceElasticity: 1.25,
    marketingBoostFactor: 0.009,
  }),
  clothing_store: Object.freeze({
    key: 'clothing_store',
    name: 'Clothing Store',
    description: 'Higher-ticket apparel boutique with larger per-unit margins and working capital needs.',
    unitCost: 450,
    recommendedPrice: 950,
    minPrice: 450,
    maxPrice: 2500,
    weeklyFixedCost: 5500,
    baseWeeklyDemand: 32,
    maxRestockPerWeek: 200,
    priceElasticity: 1.45,
    marketingBoostFactor: 0.01,
  }),
});

const BUSINESS_TYPE_ALIASES = Object.freeze({
  cafe: 'cafe',
  'café': 'cafe',
  bakery: 'bakery',
  clothing_store: 'clothing_store',
  'clothing store': 'clothing_store',
  clothingstore: 'clothing_store',
});

const FORBIDDEN_CLIENT_FIELDS = Object.freeze([
  'cash',
  'remainingCash',
  'capital',
  'inventory',
  'unitsSold',
  'revenue',
  'expenses',
  'profit',
  'loss',
  'score',
  'grade',
  'week',
  'weeksCompleted',
  'completed',
  'totalRevenue',
  'totalExpenses',
  'totalProfit',
  'totalMarketingSpend',
  'totalUnitsSold',
  'unpaidShortfall',
  'businessType',
  'seed',
]);

const USERS_COLLECTION = 'users';
const BUSINESS_RUNS_SUBCOLLECTION = 'businessRuns';

export class BusinessSimulationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'BusinessSimulationError';
    this.statusCode = statusCode;
  }
}

function roundCurrency(value) {
  return Math.round(Number(value));
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Deterministic PRNG (Mulberry32) so every (seed, week) reproduces identical events.
 */
export function createDeterministicRng(seed) {
  let a = seed >>> 0;
  return function nextFloat() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeBusinessType(rawType) {
  if (typeof rawType !== 'string' || rawType.trim().length === 0) {
    throw new BusinessSimulationError(
      'businessType is required. Supported types: Café (cafe), Bakery (bakery), Clothing Store (clothing_store).',
      400,
    );
  }

  const normalizedKey = BUSINESS_TYPE_ALIASES[rawType.trim().toLowerCase()];
  if (!normalizedKey || !BUSINESS_TYPES[normalizedKey]) {
    throw new BusinessSimulationError(
      `Unsupported businessType "${rawType}". Supported types: Café (cafe), Bakery (bakery), Clothing Store (clothing_store).`,
      400,
    );
  }

  return BUSINESS_TYPES[normalizedKey];
}

export function createInitialBusinessState(businessConfig) {
  return {
    week: BUSINESS_SIMULATION_CONFIG.STARTING_WEEK,
    durationWeeks: BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS,
    businessType: businessConfig.key,
    businessName: businessConfig.name,
    startingCapital: BUSINESS_SIMULATION_CONFIG.STARTING_CAPITAL,
    remainingCash: BUSINESS_SIMULATION_CONFIG.STARTING_CAPITAL,
    inventory: 0,
    unitCost: businessConfig.unitCost,
    recommendedPrice: businessConfig.recommendedPrice,
    minPrice: businessConfig.minPrice,
    maxPrice: businessConfig.maxPrice,
    weeklyFixedCost: businessConfig.weeklyFixedCost,
    totalRevenue: 0,
    totalExpenses: 0,
    totalMarketingSpend: 0,
    totalProfit: 0,
    totalUnitsSold: 0,
    unpaidShortfall: 0,
  };
}

export function validateStartInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BusinessSimulationError('Request body must be a JSON object.', 400);
  }

  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field === 'businessType') continue;
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new BusinessSimulationError(
        `Field "${field}" is server-controlled and cannot be supplied by clients.`,
        400,
      );
    }
  }

  const businessConfig = normalizeBusinessType(body.businessType);
  return { businessConfig };
}

export function validateWeeklyStepInput(body, businessConfig) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BusinessSimulationError('Request body must be a JSON object.', 400);
  }

  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new BusinessSimulationError(
        `Field "${field}" is calculated on the server and cannot be modified by clients.`,
        400,
      );
    }
  }

  const { runId, restockUnits, sellingPrice, marketingSpend } = body;

  if (typeof runId !== 'string' || runId.trim().length === 0 || runId.trim().length > 128) {
    throw new BusinessSimulationError('runId must be a valid non-empty string.', 400);
  }

  if (
    typeof restockUnits !== 'number' ||
    !Number.isInteger(restockUnits) ||
    restockUnits < 0 ||
    restockUnits > businessConfig.maxRestockPerWeek
  ) {
    throw new BusinessSimulationError(
      `restockUnits must be an integer between 0 and ${businessConfig.maxRestockPerWeek} for ${businessConfig.name}.`,
      400,
    );
  }

  if (
    typeof sellingPrice !== 'number' ||
    !Number.isFinite(sellingPrice) ||
    sellingPrice < businessConfig.minPrice ||
    sellingPrice > businessConfig.maxPrice
  ) {
    throw new BusinessSimulationError(
      `sellingPrice must be between ₹${businessConfig.minPrice} and ₹${businessConfig.maxPrice} for ${businessConfig.name}.`,
      400,
    );
  }

  if (
    typeof marketingSpend !== 'number' ||
    !Number.isFinite(marketingSpend) ||
    marketingSpend < 0 ||
    marketingSpend > BUSINESS_SIMULATION_CONFIG.MAX_MARKETING_SPEND
  ) {
    throw new BusinessSimulationError(
      `marketingSpend must be between ₹0 and ₹${BUSINESS_SIMULATION_CONFIG.MAX_MARKETING_SPEND.toLocaleString('en-IN')}.`,
      400,
    );
  }

  return {
    runId: runId.trim(),
    restockUnits,
    sellingPrice: roundCurrency(sellingPrice),
    marketingSpend: roundCurrency(marketingSpend),
  };
}

/**
 * Deterministic, reproducible weekly business event generator keyed by (seed, week).
 */
export function selectWeeklyEvent({ seed, week, businessConfig, restockCost }) {
  const weekSeed = (seed ^ Math.imul(week, 0x9e3779b1)) >>> 0;
  const rng = createDeterministicRng(weekSeed);
  const roll = Math.floor(rng() * 100) + 1; // 1..100

  if (roll <= 20) {
    const pct = 15 + Math.floor(rng() * 11); // 15%..25%
    const surcharge =
      restockCost > 0
        ? roundCurrency((restockCost * pct) / 100)
        : roundCurrency(businessConfig.unitCost * 8);
    return {
      type: 'supplier_price_increase',
      title: 'Supplier Price Increase',
      description: `Wholesale input prices rose by ${pct}%, adding ₹${surcharge.toLocaleString('en-IN')} in supply costs this week.`,
      impactType: 'expense',
      demandMultiplier: 1,
      extraExpense: surcharge,
      discountCredit: 0,
      percentage: pct,
    };
  }

  if (roll <= 40) {
    const boostPct = 30 + Math.floor(rng() * 21); // 30%..50%
    return {
      type: 'festival_demand',
      title: 'Festival Demand Surge',
      description: `Local festival celebrations boosted customer footfall by ${boostPct}% this week.`,
      impactType: 'demand_boost',
      demandMultiplier: 1 + boostPct / 100,
      extraExpense: 0,
      discountCredit: 0,
      percentage: boostPct,
    };
  }

  if (roll <= 58) {
    const repairCost = (20 + Math.floor(rng() * 26)) * 100; // ₹2,000..₹4,500
    return {
      type: 'equipment_breakdown',
      title: 'Equipment Breakdown',
      description: `Urgent equipment repairs cost ₹${repairCost.toLocaleString('en-IN')} this week.`,
      impactType: 'expense',
      demandMultiplier: 0.92,
      extraExpense: repairCost,
      discountCredit: 0,
      percentage: 0,
    };
  }

  if (roll <= 76) {
    const discountPct = 15 + Math.floor(rng() * 11); // 15%..25%
    const credit =
      restockCost > 0
        ? roundCurrency((restockCost * discountPct) / 100)
        : 1200;
    return {
      type: 'unexpected_discount',
      title: 'Unexpected Supplier Discount',
      description: `A vendor clearance deal saved you ₹${credit.toLocaleString('en-IN')} (${discountPct}% rebate) on inventory costs.`,
      impactType: 'savings',
      demandMultiplier: 1,
      extraExpense: 0,
      discountCredit: credit,
      percentage: discountPct,
    };
  }

  if (roll <= 92) {
    const dropPct = 20 + Math.floor(rng() * 16); // 20%..35%
    return {
      type: 'reduced_demand',
      title: 'Reduced Customer Demand',
      description: `Heavy rain and slow mid-week traffic reduced customer demand by ${dropPct}%.`,
      impactType: 'demand_drop',
      demandMultiplier: 1 - dropPct / 100,
      extraExpense: 0,
      discountCredit: 0,
      percentage: dropPct,
    };
  }

  return {
    type: 'steady_week',
    title: 'Steady Market Week',
    description: 'Normal footfall and stable supplier pricing throughout the week.',
    impactType: 'neutral',
    demandMultiplier: 1,
    extraExpense: 0,
    discountCredit: 0,
    percentage: 0,
  };
}

export function calculateBusinessScore(state, history = []) {
  const inventoryValue = state.inventory * state.unitCost;
  const totalBusinessValue = state.remainingCash + inventoryValue - state.unpaidShortfall;

  // 1. Capital growth vs ₹50,000 starting capital (up to 35 points)
  const capitalGain = totalBusinessValue - BUSINESS_SIMULATION_CONFIG.STARTING_CAPITAL;
  const capitalRatio = Math.max(-0.6, Math.min(1, capitalGain / 60000));
  const capitalScore = Math.max(0, Math.min(35, Math.round(17.5 + capitalRatio * 17.5)));

  // 2. Cash reserve health & solvency (up to 25 points)
  const liquidityRatio = Math.min(1, state.remainingCash / 35000);
  const shortfallPenalty = state.unpaidShortfall > 0 ? Math.min(15, Math.ceil(state.unpaidShortfall / 1500)) : 0;
  const liquidityScore = Math.max(0, Math.round(liquidityRatio * 25) - shortfallPenalty);

  // 3. Cumulative profit margin efficiency (up to 20 points)
  let marginScore = 10;
  if (state.totalRevenue > 0) {
    const margin = state.totalProfit / state.totalRevenue;
    marginScore = Math.max(0, Math.min(20, Math.round(((margin + 0.2) / 0.55) * 20)));
  } else if (history.length > 0) {
    marginScore = 0;
  }

  // 4. Consistency & profitable weeks (up to 20 points)
  let consistencyScore = 10;
  if (history.length > 0) {
    const profitableWeeks = history.filter((entry) => (entry.breakdown?.profit || 0) > 0).length;
    const stockoutPenalty = history.filter(
      (entry) => (entry.breakdown?.unmetDemand || 0) > 10 && (entry.breakdown?.unitsSold || 0) === 0,
    ).length * 2;
    consistencyScore = Math.max(
      0,
      Math.min(20, Math.round((profitableWeeks / history.length) * 20) - stockoutPenalty),
    );
  }

  return Math.max(0, Math.min(100, capitalScore + liquidityScore + marginScore + consistencyScore));
}

export function getBusinessGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export function applyWeeklyStep({
  currentState,
  businessConfig,
  seed,
  weeksCompleted,
  history = [],
  decision,
  eventOverride = null,
}) {
  if (weeksCompleted >= BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS) {
    throw new BusinessSimulationError('Business simulation is already completed after 12 weeks.', 409);
  }

  const activeWeek = weeksCompleted + 1;
  const startingCash = roundCurrency(currentState.remainingCash);
  const startingInventory = Math.trunc(currentState.inventory);
  const priorUnpaidShortfall = roundCurrency(currentState.unpaidShortfall || 0);

  // 1. Validate upfront cash spend (restock + marketing cannot exceed available cash)
  const baseRestockCost = roundCurrency(decision.restockUnits * businessConfig.unitCost);
  const upfrontSpend = baseRestockCost + decision.marketingSpend;

  if (upfrontSpend > startingCash) {
    throw new BusinessSimulationError(
      `Insufficient cash for upfront restock and marketing. Available cash: ₹${startingCash.toLocaleString('en-IN')}, required: ₹${upfrontSpend.toLocaleString('en-IN')}.`,
      400,
    );
  }

  // 2. Deterministic weekly event
  const event =
    eventOverride ||
    selectWeeklyEvent({
      seed,
      week: activeWeek,
      businessConfig,
      restockCost: baseRestockCost,
    });

  // 3. Deterministic demand calculation from business base demand, price elasticity, marketing, and event
  const priceRatio = decision.sellingPrice / businessConfig.recommendedPrice;
  const priceFactor = Math.max(
    0.2,
    Math.min(1.8, Math.pow(1 / priceRatio, businessConfig.priceElasticity)),
  );
  const marketingMultiplier =
    1 + Math.min(0.65, Math.sqrt(decision.marketingSpend) * businessConfig.marketingBoostFactor);

  const rawDemand =
    businessConfig.baseWeeklyDemand *
    priceFactor *
    marketingMultiplier *
    (event.demandMultiplier ?? 1);
  const customerDemand = Math.max(0, Math.round(rawDemand));

  // 4. Inventory & Sales
  const availableInventory = startingInventory + decision.restockUnits;
  const unitsSold = Math.min(availableInventory, customerDemand);
  const unmetDemand = Math.max(0, customerDemand - unitsSold);
  const endingInventory = availableInventory - unitsSold;

  // 5. Revenue, Expenses, Marketing Costs, Profit/Loss, and Non-Negative Remaining Cash
  const revenue = roundCurrency(unitsSold * decision.sellingPrice);
  const discountCredit = roundCurrency(event.discountCredit || 0);
  const extraEventExpense = roundCurrency(event.extraExpense || 0);
  const fixedCost = businessConfig.weeklyFixedCost;

  const netRestockCost = Math.max(0, baseRestockCost - discountCredit);
  const totalExpenses = netRestockCost + decision.marketingSpend + fixedCost + extraEventExpense;
  const profit = revenue - totalExpenses;

  // Cash flow: pay upfront spend, add revenue + vendor discount credit, settle fixed/event costs + prior shortfall without negative cash
  const cashAfterSales = startingCash - upfrontSpend + revenue + discountCredit;
  const operatingObligations = fixedCost + extraEventExpense + priorUnpaidShortfall;
  const cashPaidForOperations = Math.min(cashAfterSales, operatingObligations);
  const unpaidShortfall = operatingObligations - cashPaidForOperations;
  const remainingCash = cashAfterSales - cashPaidForOperations;

  // Defense-in-depth non-negative balance invariants
  if (remainingCash < 0 || endingInventory < 0 || unitsSold < 0 || revenue < 0) {
    throw new BusinessSimulationError('Calculation invariant violation: negative balance detected.', 500);
  }

  const nextWeeksCompleted = activeWeek;
  const completed = nextWeeksCompleted >= BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS;
  const nextWeek = completed ? BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS : nextWeeksCompleted + 1;

  const nextState = {
    week: nextWeek,
    durationWeeks: BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS,
    businessType: businessConfig.key,
    businessName: businessConfig.name,
    startingCapital: BUSINESS_SIMULATION_CONFIG.STARTING_CAPITAL,
    remainingCash,
    inventory: endingInventory,
    unitCost: businessConfig.unitCost,
    recommendedPrice: businessConfig.recommendedPrice,
    minPrice: businessConfig.minPrice,
    maxPrice: businessConfig.maxPrice,
    weeklyFixedCost: businessConfig.weeklyFixedCost,
    totalRevenue: roundCurrency((currentState.totalRevenue || 0) + revenue),
    totalExpenses: roundCurrency((currentState.totalExpenses || 0) + totalExpenses),
    totalMarketingSpend: roundCurrency(
      (currentState.totalMarketingSpend || 0) + decision.marketingSpend,
    ),
    totalProfit: roundCurrency((currentState.totalProfit || 0) + profit),
    totalUnitsSold: Math.trunc((currentState.totalUnitsSold || 0) + unitsSold),
    unpaidShortfall,
  };

  const weekEntry = {
    week: activeWeek,
    decision: {
      restockUnits: decision.restockUnits,
      sellingPrice: decision.sellingPrice,
      marketingSpend: decision.marketingSpend,
    },
    breakdown: {
      startingCash,
      startingInventory,
      availableInventory,
      customerDemand,
      unitsSold,
      unmetDemand,
      endingInventory,
      revenue,
      restockCost: baseRestockCost,
      discountCredit,
      netRestockCost,
      marketingCost: decision.marketingSpend,
      fixedCost,
      eventExpense: extraEventExpense,
      expenses: totalExpenses,
      profit,
      remainingCash,
      unpaidShortfall,
    },
    event: {
      type: event.type,
      title: event.title,
      description: event.description,
      impactType: event.impactType,
      demandMultiplier: event.demandMultiplier ?? 1,
      extraExpense: extraEventExpense,
      discountCredit,
    },
    timestamp: new Date().toISOString(),
  };

  const updatedHistory = [...history, weekEntry];
  const score = calculateBusinessScore(nextState, updatedHistory);
  const grade = getBusinessGrade(score);
  weekEntry.scoreAfterWeek = score;

  return {
    state: nextState,
    event: weekEntry.event,
    weekResult: weekEntry,
    score,
    grade,
    weeksCompleted: nextWeeksCompleted,
    completed,
  };
}

export function assertBusinessRunOwnership(uid, runData) {
  if (!uid || typeof uid !== 'string') {
    throw new BusinessSimulationError('Unauthorized: Missing authenticated user identifier.', 401);
  }
  if (!runData || typeof runData !== 'object') {
    throw new BusinessSimulationError('Business simulation run not found.', 404);
  }
  if (runData.uid !== uid) {
    throw new BusinessSimulationError('Forbidden: You do not own this business simulation run.', 403);
  }
}

function serializeBusinessRun(docId, data) {
  const history = Array.isArray(data.history) ? data.history : [];
  const score = typeof data.score === 'number' ? data.score : 50;
  return {
    runId: docId,
    type: 'business_simulation',
    businessType: data.businessType,
    businessName: data.businessName,
    status: data.completed ? 'completed' : 'active',
    completed: Boolean(data.completed),
    durationWeeks: data.durationWeeks || BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS,
    weeksCompleted: typeof data.weeksCompleted === 'number' ? data.weeksCompleted : history.length,
    state: data.state,
    score,
    grade: data.grade || getBusinessGrade(score),
    history,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function startBusinessSimulation(uid, rawBody) {
  const { businessConfig } = validateStartInput(rawBody);
  const db = getDb();
  const runsRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(BUSINESS_RUNS_SUBCOLLECTION);
  const runDocRef = runsRef.doc();

  const seed = crypto.randomInt(1, 2147483647);
  const initialState = createInitialBusinessState(businessConfig);
  const initialScore = calculateBusinessScore(initialState, []);
  const initialGrade = getBusinessGrade(initialScore);

  await runDocRef.set({
    runId: runDocRef.id,
    uid,
    type: 'business_simulation',
    businessType: businessConfig.key,
    businessName: businessConfig.name,
    seed,
    status: 'active',
    completed: false,
    durationWeeks: BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS,
    weeksCompleted: 0,
    state: initialState,
    score: initialScore,
    grade: initialGrade,
    history: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const savedSnap = await runDocRef.get();
  const run = serializeBusinessRun(runDocRef.id, savedSnap.data() || {});

  return {
    runId: run.runId,
    businessType: run.businessType,
    businessName: run.businessName,
    state: run.state,
    event: null,
    score: run.score,
    grade: run.grade,
    weeksCompleted: run.weeksCompleted,
    completed: run.completed,
    createdAt: run.createdAt,
  };
}

export async function stepBusinessSimulation(uid, rawBody) {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new BusinessSimulationError('Request body must be a JSON object.', 400);
  }

  const rawRunId = rawBody.runId;
  if (typeof rawRunId !== 'string' || rawRunId.trim().length === 0 || rawRunId.trim().length > 128) {
    throw new BusinessSimulationError('runId must be a valid non-empty string.', 400);
  }

  const normalizedRunId = rawRunId.trim();
  const db = getDb();
  const runRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(BUSINESS_RUNS_SUBCOLLECTION)
    .doc(normalizedRunId);

  let stepOutput = null;

  await db.runTransaction(async (transaction) => {
    const runSnap = await transaction.get(runRef);

    if (!runSnap.exists) {
      throw new BusinessSimulationError('Business simulation run not found for this user.', 404);
    }

    const runData = runSnap.data();
    assertBusinessRunOwnership(uid, runData);

    if (runData.completed) {
      throw new BusinessSimulationError('Business simulation run is already completed.', 409);
    }

    const businessConfig = normalizeBusinessType(runData.businessType);
    const decision = validateWeeklyStepInput(rawBody, businessConfig);

    const currentHistory = Array.isArray(runData.history) ? runData.history : [];
    const currentWeeksCompleted =
      typeof runData.weeksCompleted === 'number' ? runData.weeksCompleted : currentHistory.length;

    stepOutput = applyWeeklyStep({
      currentState: runData.state || createInitialBusinessState(businessConfig),
      businessConfig,
      seed: typeof runData.seed === 'number' ? runData.seed : 1337,
      weeksCompleted: currentWeeksCompleted,
      history: currentHistory,
      decision,
    });

    transaction.update(runRef, {
      state: stepOutput.state,
      score: stepOutput.score,
      grade: stepOutput.grade,
      weeksCompleted: stepOutput.weeksCompleted,
      completed: stepOutput.completed,
      status: stepOutput.completed ? 'completed' : 'active',
      history: [...currentHistory, stepOutput.weekResult],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    runId: normalizedRunId,
    businessType: stepOutput.state.businessType,
    businessName: stepOutput.state.businessName,
    state: stepOutput.state,
    event: stepOutput.event,
    decision: stepOutput.weekResult.decision,
    breakdown: stepOutput.weekResult.breakdown,
    score: stepOutput.score,
    grade: stepOutput.grade,
    weeksCompleted: stepOutput.weeksCompleted,
    completed: stepOutput.completed,
  };
}

export async function getBusinessSimulationHistory(uid, runId = null) {
  const db = getDb();
  const runsRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(BUSINESS_RUNS_SUBCOLLECTION);

  if (runId) {
    if (typeof runId !== 'string' || runId.trim().length === 0 || runId.trim().length > 128) {
      throw new BusinessSimulationError('Invalid runId query parameter.', 400);
    }

    const docSnap = await runsRef.doc(runId.trim()).get();
    if (!docSnap.exists) {
      throw new BusinessSimulationError('Business simulation run not found.', 404);
    }

    const data = docSnap.data();
    assertBusinessRunOwnership(uid, data);

    return { run: serializeBusinessRun(docSnap.id, data) };
  }

  const snapshot = await runsRef.orderBy('createdAt', 'desc').limit(25).get();
  const runs = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.uid && data.uid !== uid) {
      continue;
    }
    runs.push(serializeBusinessRun(doc.id, data));
  }

  return { runs };
}
