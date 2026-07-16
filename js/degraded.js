import { getDisruptionCount, incrementDisruption, save, load, todayISO } from './storage.js';

const DEGRADED_OFFER_THRESHOLD = 1;
const DEGRADED_AUTO_THRESHOLD = 3;
const DEGRADED_DURATION = 15;

function shouldOfferDegraded(state) {
  return getDisruptionCount(state) >= DEGRADED_OFFER_THRESHOLD;
}

function shouldAutoDegrade(state) {
  return getDisruptionCount(state) >= DEGRADED_AUTO_THRESHOLD;
}

function isDegradedActive(state) {
  if (shouldAutoDegrade(state)) return true;
  if (!shouldOfferDegraded(state)) return false;
  return state.dayState.degradedAccepted === true;
}

function getDegradedDuration() {
  return DEGRADED_DURATION;
}

function recordDisruption() {
  const state = load();
  incrementDisruption(state);
  save(state);
  return getDisruptionCount(state);
}

function acceptDegraded() {
  const state = load();
  const today = todayISO();
  if (state.dayState.date !== today) {
    state.dayState.date = today;
    state.dayState.disruptionCount = 0;
  }
  state.dayState.degradedAccepted = true;
  delete state.dayState.degradedDismissed;
  save(state);
}

function dismissDegraded() {
  const state = load();
  const today = todayISO();
  if (state.dayState.date !== today) {
    state.dayState.date = today;
    state.dayState.disruptionCount = 0;
  }
  state.dayState.degradedDismissed = true;
  delete state.dayState.degradedAccepted;
  save(state);
}

function isDegradedDismissed(state) {
  return state.dayState.degradedDismissed === true;
}

export {
  shouldOfferDegraded,
  shouldAutoDegrade,
  isDegradedActive,
  getDegradedDuration,
  recordDisruption,
  acceptDegraded,
  dismissDegraded,
  isDegradedDismissed,
  DEGRADED_OFFER_THRESHOLD,
  DEGRADED_AUTO_THRESHOLD
};
