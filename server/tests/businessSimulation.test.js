import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import app from '../src/app.js';
import {
  BUSINESS_SIMULATION_CONFIG,
  BUSINESS_TYPES,
  applyWeeklyStep,
  assertBusinessRunOwnership,
  createInitialBusinessState,
  normalizeBusinessType,
  selectWeeklyEvent,
  validateStartInput,
  validateWeeklyStepInput,
} from '../src/services/businessSimulation.js';

function inProcessRequest(method, url, headers = {}) {
  return new Promise((resolve) => {
    const socket = new PassThrough();
    const incoming = new http.IncomingMessage(socket);
    incoming.method = method;
    incoming.url = url;
    incoming.headers = headers;

    const res = new http.ServerResponse(incoming);
    const chunks = [];
    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      return res;
    };

    app(incoming, res);
    incoming.emit('end');
  });
}

test('Authentication: all /api/business/* routes require Firebase auth while /api/health, /api/personal, and /api/mentor stay intact', async () => {
  const health = await inProcessRequest('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body, '{"status":"ok"}');

  for (const [method, path] of [
    ['POST', '/api/business/start'],
    ['POST', '/api/business/step'],
    ['GET', '/api/business/history'],
    ['POST', '/api/personal/start'],
    ['GET', '/api/mentor/status'],
  ]) {
    const res = await inProcessRequest(method, path);
    assert.equal(res.status, 401, `${method} ${path} should return 401 without Bearer token`);
  }

  const badHeader = await inProcessRequest('GET', '/api/business/history', {
    authorization: 'Basic invalid',
  });
  assert.equal(badHeader.status, 401);
});

test('Business types & initial state: supports Café, Bakery, Clothing Store with ₹50,000 capital and 12 weeks', () => {
  assert.equal(normalizeBusinessType('Café').key, 'cafe');
  assert.equal(normalizeBusinessType('cafe').name, 'Café');
  assert.equal(normalizeBusinessType('Bakery').key, 'bakery');
  assert.equal(normalizeBusinessType('Clothing Store').key, 'clothing_store');
  assert.equal(normalizeBusinessType('clothing_store').name, 'Clothing Store');

  assert.throws(() => normalizeBusinessType('Tech Startup'), (err) => err.statusCode === 400);
  assert.throws(
    () => validateStartInput({ businessType: 'cafe', remainingCash: 999999 }),
    (err) => err.statusCode === 400,
  );

  for (const key of Object.keys(BUSINESS_TYPES)) {
    const state = createInitialBusinessState(BUSINESS_TYPES[key]);
    assert.equal(state.week, 1);
    assert.equal(state.durationWeeks, 12);
    assert.equal(state.startingCapital, 50000);
    assert.equal(state.remainingCash, 50000);
    assert.equal(state.inventory, 0);
  }
});

test('Validation: rejects invalid decisions, excessive spending, negative balances, and client financial tampering', () => {
  const cafe = BUSINESS_TYPES.cafe;

  // Reject client-supplied financial fields
  for (const badField of ['remainingCash', 'inventory', 'revenue', 'expenses', 'profit', 'score', 'week']) {
    assert.throws(
      () =>
        validateWeeklyStepInput(
          { runId: 'run-1', restockUnits: 50, sellingPrice: 180, marketingSpend: 1000, [badField]: 999 },
          cafe,
        ),
      /calculated on the server/,
    );
  }

  // Reject invalid values
  assert.throws(
    () => validateWeeklyStepInput({ runId: '', restockUnits: 10, sellingPrice: 180, marketingSpend: 0 }, cafe),
    /runId/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: -5, sellingPrice: 180, marketingSpend: 0 }, cafe),
    /restockUnits/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: 10.5, sellingPrice: 180, marketingSpend: 0 }, cafe),
    /restockUnits/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: 10, sellingPrice: 40, marketingSpend: 0 }, cafe),
    /sellingPrice/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: 10, sellingPrice: 9999, marketingSpend: 0 }, cafe),
    /sellingPrice/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: 10, sellingPrice: 180, marketingSpend: -100 }, cafe),
    /marketingSpend/,
  );
  assert.throws(
    () => validateWeeklyStepInput({ runId: 'run-1', restockUnits: 10, sellingPrice: 180, marketingSpend: 50000 }, cafe),
    /marketingSpend/,
  );

  // Reject upfront spend exceeding available cash (500 * ₹80 = ₹40,000 + ₹15,000 marketing = ₹55,000 > ₹50,000)
  const initialState = createInitialBusinessState(cafe);
  assert.throws(
    () =>
      applyWeeklyStep({
        currentState: initialState,
        businessConfig: cafe,
        seed: 42,
        weeksCompleted: 0,
        history: [],
        decision: validateWeeklyStepInput(
          { runId: 'run-1', restockUnits: 500, sellingPrice: 180, marketingSpend: 15000 },
          cafe,
        ),
      }),
    /Insufficient cash/,
  );
});

test('Calculations: accurately computes inventory, sales, revenue, expenses, profit/loss, non-negative cash, and score', () => {
  const bakery = BUSINESS_TYPES.bakery; // unitCost: 120, recommendedPrice: 260, fixed: 4000, baseDemand: 70
  const state = createInitialBusinessState(bakery);
  const decision = validateWeeklyStepInput(
    { runId: 'run-1', restockUnits: 60, sellingPrice: 260, marketingSpend: 0 },
    bakery,
  );

  // Neutral event override for exact arithmetic verification
  const result = applyWeeklyStep({
    currentState: state,
    businessConfig: bakery,
    seed: 100,
    weeksCompleted: 0,
    history: [],
    decision,
    eventOverride: {
      type: 'steady_week',
      title: 'Steady Market Week',
      description: 'Normal week',
      impactType: 'neutral',
      demandMultiplier: 1,
      extraExpense: 0,
      discountCredit: 0,
    },
  });

  // Demand at recommendedPrice with ₹0 marketing = 70; availableInventory = 60 -> unitsSold = 60, endingInventory = 0
  assert.equal(result.weekResult.breakdown.availableInventory, 60);
  assert.equal(result.weekResult.breakdown.unitsSold, 60);
  assert.equal(result.weekResult.breakdown.endingInventory, 0);
  // Revenue = 60 * 260 = 15600; Restock = 60 * 120 = 7200; Fixed = 4000; Expenses = 11200; Profit = 4400
  assert.equal(result.weekResult.breakdown.revenue, 15600);
  assert.equal(result.weekResult.breakdown.expenses, 11200);
  assert.equal(result.weekResult.breakdown.marketingCost, 0);
  assert.equal(result.weekResult.breakdown.profit, 4400);
  // Remaining cash = 50000 - 7200 + 15600 - 4000 = 54400
  assert.equal(result.state.remainingCash, 54400);
  assert.equal(result.state.week, 2);
  assert.equal(result.completed, false);
  assert.ok(result.score >= 0 && result.score <= 100);
});

test('Reproducibility & events: same seed produces identical 12-week outcomes and covers all 5 event types', () => {
  const cafe = BUSINESS_TYPES.cafe;

  // Verify all 5 random event categories occur across deterministic seeds
  const seenEvents = new Set();
  for (let s = 1; s <= 40; s++) {
    for (let w = 1; w <= 12; w++) {
      const ev = selectWeeklyEvent({ seed: s * 997, week: w, businessConfig: cafe, restockCost: 8000 });
      seenEvents.add(ev.type);
    }
  }
  for (const requiredType of [
    'supplier_price_increase',
    'festival_demand',
    'equipment_breakdown',
    'unexpected_discount',
    'reduced_demand',
  ]) {
    assert.ok(seenEvents.has(requiredType), `Expected event type "${requiredType}" to occur`);
  }

  // Run two identical 12-week simulations with the same seed and verify exact equality
  function runFullSimulation(seed) {
    let state = createInitialBusinessState(cafe);
    let history = [];
    let weeksCompleted = 0;
    let last = null;

    for (let w = 1; w <= BUSINESS_SIMULATION_CONFIG.DURATION_WEEKS; w++) {
      const step = applyWeeklyStep({
        currentState: state,
        businessConfig: cafe,
        seed,
        weeksCompleted,
        history,
        decision: validateWeeklyStepInput(
          { runId: 'repro', restockUnits: 85, sellingPrice: 185, marketingSpend: 1500 },
          cafe,
        ),
      });
      assert.ok(step.state.remainingCash >= 0);
      assert.ok(step.state.inventory >= 0);
      assert.equal(step.completed, w === 12);
      state = step.state;
      history = [...history, step.weekResult];
      weeksCompleted = step.weeksCompleted;
      last = step;
    }

    // Week 13 must throw 409 Conflict
    assert.throws(
      () =>
        applyWeeklyStep({
          currentState: state,
          businessConfig: cafe,
          seed,
          weeksCompleted,
          history,
          decision: validateWeeklyStepInput(
            { runId: 'repro', restockUnits: 50, sellingPrice: 180, marketingSpend: 0 },
            cafe,
          ),
        }),
      (err) => err.statusCode === 409,
    );

    return { state, score: last.score, grade: last.grade, events: history.map((h) => h.event.type) };
  }

  const run1 = runFullSimulation(20261127);
  const run2 = runFullSimulation(20261127);
  assert.deepEqual(run1, run2);
});

test('Non-negative cash protection: heavy breakdown cost never drops remainingCash below ₹0', () => {
  const store = BUSINESS_TYPES.clothing_store;
  const lowCashState = {
    ...createInitialBusinessState(store),
    remainingCash: 1000,
    inventory: 0,
  };

  const result = applyWeeklyStep({
    currentState: lowCashState,
    businessConfig: store,
    seed: 1,
    weeksCompleted: 0,
    history: [],
    decision: validateWeeklyStepInput(
      { runId: 'low', restockUnits: 0, sellingPrice: 950, marketingSpend: 0 },
      store,
    ),
    eventOverride: {
      type: 'equipment_breakdown',
      title: 'Equipment Breakdown',
      description: 'Major repair',
      impactType: 'expense',
      demandMultiplier: 0.9,
      extraExpense: 4000,
      discountCredit: 0,
    },
  });

  assert.equal(result.state.remainingCash, 0);
  assert.ok(result.weekResult.breakdown.profit < 0);
  assert.ok(result.state.unpaidShortfall > 0);
});

test('Ownership checks: blocks cross-user run access with 403 and missing runs with 404', () => {
  assert.doesNotThrow(() => assertBusinessRunOwnership('uid-1', { uid: 'uid-1' }));
  assert.throws(() => assertBusinessRunOwnership('uid-2', { uid: 'uid-1' }), (err) => err.statusCode === 403);
  assert.throws(() => assertBusinessRunOwnership('uid-1', null), (err) => err.statusCode === 404);
});
