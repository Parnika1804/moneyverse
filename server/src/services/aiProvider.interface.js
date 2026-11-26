/**
 * Provider-independent AI adapter interface for MoneyVerse AI Mentor.
 *
 * Phase 4 intentionally keeps this provider-agnostic with NO AI SDK installed.
 * Phase 10 will register the official Gemini Enterprise adapter here without
 * modifying mentor routes, controllers, or frontend contracts.
 */

const PLANNED_PROVIDER = 'Gemini Enterprise';
const AVAILABLE_AFTER_PHASE = 10;

let registeredProvider = null;

export function registerAiProvider(adapter) {
  if (
    !adapter ||
    typeof adapter.name !== 'string' ||
    typeof adapter.generateAdvisory !== 'function'
  ) {
    throw new Error('AI provider adapter must define a string "name" and "generateAdvisory()" method.');
  }

  registeredProvider = adapter;
}

export function clearAiProvider() {
  registeredProvider = null;
}

export function getAiProvider() {
  return registeredProvider;
}

export function getAiProviderStatus() {
  if (registeredProvider) {
    return {
      configured: true,
      provider: registeredProvider.name,
      plannedProvider: PLANNED_PROVIDER,
      availableAfterPhase: AVAILABLE_AFTER_PHASE,
      message: `AI Mentor connected via ${registeredProvider.name}.`,
    };
  }

  return {
    configured: false,
    provider: null,
    plannedProvider: PLANNED_PROVIDER,
    availableAfterPhase: AVAILABLE_AFTER_PHASE,
    message: 'AI analysis will become available after Phase 10 (Gemini Enterprise integration).',
  };
}
