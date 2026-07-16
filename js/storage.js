const STORAGE_KEY = 'rotd';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    return { ...defaultState(), ...data };
  } catch {
    return defaultState();
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Storage save failed', e);
  }
}

function defaultState() {
  return {
    schemaVersion: 2,
    tasks: [],
    streak: { currentStreak: 0, lastCompletionDate: null, history: [] },
    dayState: { date: todayISO(), disruptionCount: 0 },
    score: 0,
    activeFilter: 'all'
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getTasks(state) {
  const today = todayISO();
  return (state.tasks || []).filter(t => t.day === today);
}

function getPendingTasks(state) {
  return getTasks(state).filter(t => t.status === 'pending' || t.status === 'carried_over' || t.status === 'held');
}

function addTasks(state, newTasks) {
  const today = todayISO();
  const existing = state.tasks || [];
  for (const t of newTasks) {
    existing.push({
      ...t,
      id: t.id || crypto.randomUUID(),
      day: today,
      status: t.status || 'pending',
      source: t.source || 'claude-import',
      type: t.type || 'build',
      consecutiveMissCount: t.consecutiveMissCount || 0
    });
  }
  state.tasks = existing;
  return state;
}

function markTaskDone(state, taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (task) {
    task.status = 'done';
    task.consecutiveMissCount = 0;
  }
  return state;
}

function markTaskHeld(state, taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (task) {
    task.status = 'held';
    task.consecutiveMissCount = 0;
  }
  return state;
}

function markTaskSlipped(state, taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (task) {
    task.status = 'slipped';
    task.consecutiveMissCount = (task.consecutiveMissCount || 0) + 1;
  }
  return state;
}

function carryOverTasks(state) {
  const today = todayISO();
  let changed = false;
  for (const t of state.tasks || []) {
    if (t.day !== today && (t.status === 'pending' || t.status === 'carried_over')) {
      t.status = 'carried_over';
      t.day = today;
      changed = true;
    }
  }
  if (changed) {
    state.dayState.date = today;
  }
  return { state, changed };
}

function incrementDisruption(state) {
  state.dayState.disruptionCount = (state.dayState.disruptionCount || 0) + 1;
  return state;
}

function getDisruptionCount(state) {
  if (state.dayState.date !== todayISO()) {
    return 0;
  }
  return state.dayState.disruptionCount || 0;
}

function shouldShowMissTwiceNudge(state, taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  return task && task.consecutiveMissCount >= 2;
}

export {
  load,
  save,
  defaultState,
  todayISO,
  getTasks,
  getPendingTasks,
  addTasks,
  markTaskDone,
  markTaskHeld,
  markTaskSlipped,
  carryOverTasks,
  incrementDisruption,
  getDisruptionCount,
  shouldShowMissTwiceNudge
};
