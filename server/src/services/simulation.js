import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';

export const SIMULATION_CONFIG = Object.freeze({
  STARTING_MONTH: 1,
  DURATION_MONTHS: 12,
  MONTHLY_INCOME: 30000,
  STARTING_WALLET: 30000,
  STARTING_SAVINGS: 0,
  STARTING_DEBT: 0,
  MONTHLY_LOAN_INTEREST_RATE: 0.02,
  MAX_LOAN_PER_MONTH: 100000,
  MAX_TOTAL_DEBT: 300000,
  MAX_SPENDING_BUDGET: 500000,
});

const FORBIDDEN_CLIENT_FIELDS = [
  'wallet',
  'savings',
  'debt',
  'month',
  'currentMonth',
  'monthsCompleted',
  'monthlyIncome',
  'score',
  'grade',
  'completed',
  'netWorth',
  'xp',
  'level',
  'rentAdjustment',
];

const USERS_COLLECTION = 'users';
const RUNS_SUBCOLLECTION = 'runs';

export class SimulationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'SimulationError';
    this.statusCode = statusCode;
  }
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

function roundCurrency(amount) {
  return Math.round(Number(amount));
}

function randomIntInclusive(min, max) {
  return crypto.randomInt(min, max + 1);
}

export function createInitialState() {
  return {
    month: SIMULATION_CONFIG.STARTING_MONTH,
    monthlyIncome: SIMULATION_CONFIG.MONTHLY_INCOME,
    wallet: SIMULATION_CONFIG.STARTING_WALLET,
    savings: SIMULATION_CONFIG.STARTING_SAVINGS,
    debt: SIMULATION_CONFIG.STARTING_DEBT,
    netWorth:
      SIMULATION_CONFIG.STARTING_WALLET +
      SIMULATION_CONFIG.STARTING_SAVINGS -
      SIMULATION_CONFIG.STARTING_DEBT,
    rentAdjustment: 0,
    monthlyInterestRate: SIMULATION_CONFIG.MONTHLY_LOAN_INTEREST_RATE,
    durationMonths: SIMULATION_CONFIG.DURATION_MONTHS,
  };
}

export function validateStepInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SimulationError('Request body must be a JSON object.', 400);
  }

  // Reject any attempt by client/AI to tamper with server-controlled financial values
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new SimulationError(
        `Field "${field}" is calculated on the server and cannot be modified by clients.`,
        400,
      );
    }
  }

  const {
    runId,
    savingsPercentage,
    spendingBudget,
    loanAmount = 0,
    repayAmount = 0,
  } = body;

  if (typeof runId !== 'string' || runId.trim().length === 0 || runId.trim().length > 128) {
    throw new SimulationError('runId must be a valid non-empty string.', 400);
  }

  if (
    typeof savingsPercentage !== 'number' ||
    !Number.isFinite(savingsPercentage) ||
    savingsPercentage < 0 ||
    savingsPercentage > 100
  ) {
    throw new SimulationError('savingsPercentage must be a finite number between 0 and 100.', 400);
  }

  if (
    typeof spendingBudget !== 'number' ||
    !Number.isFinite(spendingBudget) ||
    spendingBudget < 0 ||
    spendingBudget > SIMULATION_CONFIG.MAX_SPENDING_BUDGET
  ) {
    throw new SimulationError(
      `spendingBudget must be a finite number between 0 and ${SIMULATION_CONFIG.MAX_SPENDING_BUDGET}.`,
      400,
    );
  }

  if (
    typeof loanAmount !== 'number' ||
    !Number.isFinite(loanAmount) ||
    loanAmount < 0 ||
    loanAmount > SIMULATION_CONFIG.MAX_LOAN_PER_MONTH
  ) {
    throw new SimulationError(
      `loanAmount must be a finite number between 0 and ${SIMULATION_CONFIG.MAX_LOAN_PER_MONTH}.`,
      400,
    );
  }

  if (typeof repayAmount !== 'number' || !Number.isFinite(repayAmount) || repayAmount < 0) {
    throw new SimulationError('repayAmount must be a finite number greater than or equal to 0.', 400);
  }

  const normalizedLoan = roundCurrency(loanAmount);
  const normalizedRepay = roundCurrency(repayAmount);
  const normalizedSpending = roundCurrency(spendingBudget);
  const normalizedSavingsPct = Math.round(savingsPercentage * 100) / 100;

  if (normalizedLoan > 0 && normalizedRepay > 0) {
    throw new SimulationError(
      'Cannot take a new loan and repay an existing loan in the same month.',
      400,
    );
  }

  return {
    runId: runId.trim(),
    savingsPercentage: normalizedSavingsPct,
    spendingBudget: normalizedSpending,
    loanAmount: normalizedLoan,
    repayAmount: normalizedRepay,
  };
}

export function generateUnexpectedEvent({ spendingBudget, rng = randomIntInclusive }) {
  const roll = rng(1, 100);

  if (roll <= 22) {
    const amount = rng(25, 75) * 100; // ₹2,500 – ₹7,500
    return {
      type: 'medical_emergency',
      title: 'Unexpected Medical Expense',
      description: `An unplanned clinic visit and prescriptions cost ₹${amount.toLocaleString('en-IN')}.`,
      impactType: 'expense',
      amount,
      rentDelta: 0,
    };
  }

  if (roll <= 42) {
    const inflationPct = rng(8, 15);
    const amount = Math.max(800, roundCurrency((spendingBudget * inflationPct) / 100));
    return {
      type: 'inflation',
      title: 'Inflation Spike',
      description: `Rising grocery and utility prices increased this month's living costs by ${inflationPct}% (+₹${amount.toLocaleString('en-IN')}).`,
      impactType: 'expense',
      amount,
      inflationPercentage: inflationPct,
      rentDelta: 0,
    };
  }

  if (roll <= 60) {
    const rentDelta = rng(15, 30) * 100; // ₹1,500 – ₹3,000
    return {
      type: 'rent_increase',
      title: 'Rent Revision Notice',
      description: `Your landlord increased monthly rent by ₹${rentDelta.toLocaleString('en-IN')}.`,
      impactType: 'expense',
      amount: rentDelta,
      rentDelta,
    };
  }

  if (roll <= 80) {
    const amount = rng(30, 70) * 100; // ₹3,000 – ₹7,000
    return {
      type: 'bonus',
      title: 'Performance Bonus',
      description: `Strong work performance earned you a ₹${amount.toLocaleString('en-IN')} bonus.`,
      impactType: 'income',
      amount,
      rentDelta: 0,
    };
  }

  const amount = rng(20, 55) * 100; // ₹2,000 – ₹5,500
  return {
    type: 'additional_income',
    title: 'Side Income Opportunity',
    description: `A weekend freelance project brought in ₹${amount.toLocaleString('en-IN')} extra income.`,
    impactType: 'income',
    amount,
    rentDelta: 0,
  };
}

export function calculateScore(state, history = []) {
  // 1. Savings & emergency buffer (up to 35 points; target ~₹90,000 = 3 months income)
  const emergencyTarget = SIMULATION_CONFIG.MONTHLY_INCOME * 3;
  const savingsScore = Math.min(35, Math.round((state.savings / emergencyTarget) * 35));

  // 2. Debt management (up to 25 points; full score at ₹0 debt)
  const debtRatio = state.debt / (SIMULATION_CONFIG.MONTHLY_INCOME * 4);
  const debtScore = Math.max(0, Math.round(25 * (1 - Math.min(1, debtRatio))));

  // 3. Net worth growth above starting ₹30,000 (up to 25 points)
  const netWorthGain = Math.max(0, state.netWorth - SIMULATION_CONFIG.STARTING_WALLET);
  const netWorthTarget = SIMULATION_CONFIG.MONTHLY_INCOME * 5;
  const netWorthScore = Math.min(25, Math.round((netWorthGain / netWorthTarget) * 25));

  // 4. Consistency & discipline across completed months (up to 15 points)
  let disciplineScore = 10;
  if (history.length > 0) {
    const avgSavingsPct =
      history.reduce((sum, entry) => sum + (entry.decision?.savingsPercentage || 0), 0) /
      history.length;
    const emergencyDebtMonths = history.filter(
      (entry) => (entry.breakdown?.emergencyDebtAdded || 0) > 0,
    ).length;

    const savingsHabitPts = Math.min(15, Math.round((avgSavingsPct / 25) * 15));
    const penalty = emergencyDebtMonths * 3;
    disciplineScore = Math.max(0, Math.min(15, savingsHabitPts - penalty));
  }

  const total = Math.max(0, Math.min(100, savingsScore + debtScore + netWorthScore + disciplineScore));
  return total;
}

export function getGradeFromScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export function applyMonthlyStep({
  currentState,
  monthsCompleted,
  history = [],
  decision,
  eventOverride = null,
}) {
  if (monthsCompleted >= SIMULATION_CONFIG.DURATION_MONTHS) {
    throw new SimulationError('Simulation is already completed after 12 months.', 409);
  }

  const activeMonth = monthsCompleted + 1;
  const startingWallet = roundCurrency(currentState.wallet);
  const startingSavings = roundCurrency(currentState.savings);
  const startingDebt = roundCurrency(currentState.debt);
  const currentRentAdjustment = roundCurrency(currentState.rentAdjustment || 0);
  const incomeReceived = SIMULATION_CONFIG.MONTHLY_INCOME;

  // 1. Apply 2% monthly interest on existing debt
  const interestAccrued = roundCurrency(
    startingDebt * SIMULATION_CONFIG.MONTHLY_LOAN_INTEREST_RATE,
  );
  const debtAfterInterest = startingDebt + interestAccrued;

  // 2. Validate loan & repayment rules
  if (decision.loanAmount > 0) {
    if (debtAfterInterest + decision.loanAmount > SIMULATION_CONFIG.MAX_TOTAL_DEBT) {
      throw new SimulationError(
        `Loan denied: total debt cannot exceed ₹${SIMULATION_CONFIG.MAX_TOTAL_DEBT.toLocaleString('en-IN')}.`,
        400,
      );
    }
  }

  if (decision.repayAmount > 0) {
    if (debtAfterInterest === 0) {
      throw new SimulationError('Cannot repay loan because current debt is ₹0.', 400);
    }
    if (decision.repayAmount > debtAfterInterest) {
      throw new SimulationError(
        `repayAmount (₹${decision.repayAmount.toLocaleString('en-IN')}) exceeds current debt including 2% interest (₹${debtAfterInterest.toLocaleString('en-IN')}).`,
        400,
      );
    }
  }

  // 3. Calculate savings allocation from monthly income & validate planned outflows
  const savingsDeposit = roundCurrency((incomeReceived * decision.savingsPercentage) / 100);
  const availableBeforeOutflows = startingWallet + incomeReceived + decision.loanAmount;
  const mandatoryLivingOverhead = currentRentAdjustment;
  const plannedOutflows =
    savingsDeposit + decision.spendingBudget + mandatoryLivingOverhead + decision.repayAmount;

  if (plannedOutflows > availableBeforeOutflows) {
    throw new SimulationError(
      `Insufficient funds for planned decisions. Available: ₹${availableBeforeOutflows.toLocaleString('en-IN')}, required: ₹${plannedOutflows.toLocaleString('en-IN')} (including ₹${mandatoryLivingOverhead.toLocaleString('en-IN')} prior rent adjustments).`,
      400,
    );
  }

  let wallet = availableBeforeOutflows - plannedOutflows;
  let savings = startingSavings + savingsDeposit;
  let debt = debtAfterInterest + decision.loanAmount - decision.repayAmount;

  // 4. Trigger unexpected event & settle without ever producing negative wallet or savings
  const event =
    eventOverride ||
    generateUnexpectedEvent({
      spendingBudget: decision.spendingBudget,
    });

  let eventIncome = 0;
  let eventCost = 0;
  let savingsUsedForEmergency = 0;
  let emergencyDebtAdded = 0;
  const nextRentAdjustment = currentRentAdjustment + roundCurrency(event.rentDelta || 0);

  if (event.impactType === 'income') {
    eventIncome = roundCurrency(event.amount);
    wallet += eventIncome;
  } else if (event.impactType === 'expense') {
    eventCost = roundCurrency(event.amount);
    if (wallet >= eventCost) {
      wallet -= eventCost;
    } else {
      let remaining = eventCost - wallet;
      wallet = 0;

      if (savings >= remaining) {
        savingsUsedForEmergency = remaining;
        savings -= remaining;
        remaining = 0;
      } else {
        savingsUsedForEmergency = savings;
        remaining -= savings;
        savings = 0;
      }

      if (remaining > 0) {
        emergencyDebtAdded = remaining;
        debt += remaining;
      }
    }
  }

  // Defense-in-depth invariant guard
  if (wallet < 0 || savings < 0 || debt < 0) {
    throw new SimulationError('Calculation invariant violation: negative balance detected.', 500);
  }

  const nextMonthsCompleted = activeMonth;
  const completed = nextMonthsCompleted >= SIMULATION_CONFIG.DURATION_MONTHS;
  const nextMonth = completed ? SIMULATION_CONFIG.DURATION_MONTHS : nextMonthsCompleted + 1;
  const netWorth = wallet + savings - debt;

  const nextState = {
    month: nextMonth,
    monthlyIncome: SIMULATION_CONFIG.MONTHLY_INCOME,
    wallet,
    savings,
    debt,
    netWorth,
    rentAdjustment: nextRentAdjustment,
    monthlyInterestRate: SIMULATION_CONFIG.MONTHLY_LOAN_INTEREST_RATE,
    durationMonths: SIMULATION_CONFIG.DURATION_MONTHS,
  };

  const stepEntry = {
    month: activeMonth,
    decision: {
      savingsPercentage: decision.savingsPercentage,
      spendingBudget: decision.spendingBudget,
      loanAmount: decision.loanAmount,
      repayAmount: decision.repayAmount,
    },
    breakdown: {
      startingWallet,
      startingSavings,
      startingDebt,
      incomeReceived,
      interestAccrued,
      savingsDeposit,
      spendingBudget: decision.spendingBudget,
      priorRentAdjustmentPaid: mandatoryLivingOverhead,
      loanAmount: decision.loanAmount,
      repayAmount: decision.repayAmount,
      eventIncome,
      eventCost,
      savingsUsedForEmergency,
      emergencyDebtAdded,
      endingWallet: wallet,
      endingSavings: savings,
      endingDebt: debt,
      netWorth,
    },
    event: {
      type: event.type,
      title: event.title,
      description: event.description,
      impactType: event.impactType,
      amount: roundCurrency(event.amount),
    },
    timestamp: new Date().toISOString(),
  };

  const updatedHistory = [...history, stepEntry];
  const score = calculateScore(nextState, updatedHistory);
  const grade = getGradeFromScore(score);
  stepEntry.scoreAfterMonth = score;

  return {
    state: nextState,
    event: stepEntry.event,
    stepResult: stepEntry,
    score,
    grade,
    monthsCompleted: nextMonthsCompleted,
    completed,
  };
}

function serializeRunDocument(docId, data) {
  return {
    runId: docId,
    type: data.type || 'personal_finance',
    status: data.completed ? 'completed' : 'active',
    completed: Boolean(data.completed),
    durationMonths: data.durationMonths || SIMULATION_CONFIG.DURATION_MONTHS,
    monthsCompleted: typeof data.monthsCompleted === 'number' ? data.monthsCompleted : 0,
    state: data.state || createInitialState(),
    score: typeof data.score === 'number' ? data.score : 0,
    grade: data.grade || getGradeFromScore(typeof data.score === 'number' ? data.score : 0),
    history: Array.isArray(data.history) ? data.history : [],
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function startPersonalSimulation(uid) {
  const db = getDb();
  const runsRef = db.collection(USERS_COLLECTION).doc(uid).collection(RUNS_SUBCOLLECTION);
  const runDocRef = runsRef.doc();

  const initialState = createInitialState();
  const initialScore = calculateScore(initialState, []);
  const initialGrade = getGradeFromScore(initialScore);

  await runDocRef.set({
    runId: runDocRef.id,
    uid,
    type: 'personal_finance',
    status: 'active',
    completed: false,
    durationMonths: SIMULATION_CONFIG.DURATION_MONTHS,
    monthsCompleted: 0,
    state: initialState,
    score: initialScore,
    grade: initialGrade,
    history: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const savedSnap = await runDocRef.get();
  const run = serializeRunDocument(runDocRef.id, savedSnap.data() || {});

  return {
    runId: run.runId,
    state: run.state,
    event: null,
    score: run.score,
    grade: run.grade,
    monthsCompleted: run.monthsCompleted,
    completed: run.completed,
    createdAt: run.createdAt,
  };
}

export async function stepPersonalSimulation(uid, rawInput) {
  const decision = validateStepInput(rawInput);
  const db = getDb();
  const runRef = db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(RUNS_SUBCOLLECTION)
    .doc(decision.runId);

  let stepOutput = null;

  await db.runTransaction(async (transaction) => {
    const runSnap = await transaction.get(runRef);

    if (!runSnap.exists) {
      throw new SimulationError('Simulation run not found for this user.', 404);
    }

    const runData = runSnap.data();

    if (runData.uid && runData.uid !== uid) {
      throw new SimulationError('Forbidden: You do not own this simulation run.', 403);
    }

    if (runData.completed) {
      throw new SimulationError('Simulation run is already completed.', 409);
    }

    const currentHistory = Array.isArray(runData.history) ? runData.history : [];
    const currentMonthsCompleted =
      typeof runData.monthsCompleted === 'number' ? runData.monthsCompleted : currentHistory.length;

    stepOutput = applyMonthlyStep({
      currentState: runData.state || createInitialState(),
      monthsCompleted: currentMonthsCompleted,
      history: currentHistory,
      decision,
    });

    const nextHistory = [...currentHistory, stepOutput.stepResult];

    transaction.update(runRef, {
      state: stepOutput.state,
      score: stepOutput.score,
      grade: stepOutput.grade,
      monthsCompleted: stepOutput.monthsCompleted,
      completed: stepOutput.completed,
      status: stepOutput.completed ? 'completed' : 'active',
      history: nextHistory,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    runId: decision.runId,
    state: stepOutput.state,
    event: stepOutput.event,
    decision: stepOutput.stepResult.decision,
    breakdown: stepOutput.stepResult.breakdown,
    score: stepOutput.score,
    grade: stepOutput.grade,
    monthsCompleted: stepOutput.monthsCompleted,
    completed: stepOutput.completed,
  };
}

export async function getPersonalSimulationHistory(uid, runId = null) {
  const db = getDb();
  const runsRef = db.collection(USERS_COLLECTION).doc(uid).collection(RUNS_SUBCOLLECTION);

  if (runId) {
    if (typeof runId !== 'string' || runId.trim().length === 0) {
      throw new SimulationError('Invalid runId query parameter.', 400);
    }

    const docSnap = await runsRef.doc(runId.trim()).get();
    if (!docSnap.exists) {
      throw new SimulationError('Simulation run not found.', 404);
    }

    const run = serializeRunDocument(docSnap.id, docSnap.data() || {});
    return { run };
  }

  const snapshot = await runsRef.orderBy('createdAt', 'desc').limit(25).get();
  const runs = snapshot.docs.map((doc) => serializeRunDocument(doc.id, doc.data() || {}));

  return { runs };
}
