import { load, save, todayISO } from './storage.js';

function recordCompletion() {
  const state = load();
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (
    state.streak.lastCompletionDate &&
    state.streak.lastCompletionDate !== today &&
    state.streak.lastCompletionDate !== yesterdayISO
  ) {
    state.streak.currentStreak = 0;
  }

  if (state.streak.lastCompletionDate !== today) {
    state.streak.currentStreak = (state.streak.currentStreak || 0) + 1;
    state.streak.lastCompletionDate = today;
    state.streak.history.unshift({ date: today, completedCount: 1 });
    if (state.streak.history.length > 14) {
      state.streak.history = state.streak.history.slice(0, 14);
    }
    state.score = (state.score || 0) + 1;
  } else {
    if (state.streak.history.length > 0 && state.streak.history[0].date === today) {
      state.streak.history[0].completedCount += 1;
    }
    state.score = (state.score || 0) + 1;
  }

  save(state);
  return state.streak.currentStreak;
}

function getStreak() {
  const state = load();
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (
    state.streak.lastCompletionDate !== today &&
    state.streak.lastCompletionDate !== yesterdayISO
  ) {
    if (state.streak.currentStreak !== 0) {
      state.streak.currentStreak = 0;
      save(state);
    }
  }

  return {
    current: state.streak.currentStreak || 0,
    history: state.streak.history || [],
    score: state.score || 0
  };
}

function getRecentHistory() {
  const state = load();
  const days = [];
  const today = new Date();
  const historyMap = {};
  for (const h of state.streak.history || []) {
    historyMap[h.date] = h.completedCount;
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, completed: historyMap[iso] || 0 });
  }
  return days;
}

export { recordCompletion, getStreak, getRecentHistory };
