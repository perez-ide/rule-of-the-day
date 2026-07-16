import { load, save, markTaskDone, carryOverTasks, todayISO } from './storage.js';
import { nextTask } from './queue.js';
import { recordDisruption, acceptDegraded, dismissDegraded } from './degraded.js';
import { recordCompletion } from './streak.js';
import { getCurrentAnchor, getAnchorsForToday } from './anchors.js';
import { parseAndMerge } from './import.js';
import {
  renderAll,
  renderNowCard,
  renderStreakPanel,
  renderDegradedBanner,
  renderHeroTime,
  openImportSheet,
  closeImportSheet,
  openStreakPanel,
  closeStreakPanel,
  showImportError
} from './ui.js';

function init() {
  let state = load();

  const carried = carryOverTasks(state);
  state = carried.state;
  if (carried.changed) {
    save(state);
  }

  if (state.dayState.date !== todayISO()) {
    state.dayState.date = todayISO();
    state.dayState.disruptionCount = 0;
    save(state);
  }

  renderAll(state);
  setupEvents(state);

  setInterval(() => {
    renderHeroTime();
    state = load();
    renderNowCard(state);
    renderDegradedBanner(state);
  }, 60000);
}

function setupEvents(initialState) {
  let state = initialState;

  function refresh() {
    state = load();
    renderAll(state);
  }

  document.getElementById('markDone').addEventListener('click', () => {
    const currentAnchor = getCurrentAnchor(getAnchorsForToday());
    if (currentAnchor) {
      recordCompletion();
      refresh();
      return;
    }
    const result = nextTask(state);
    if (!result || !result.task) return;
    state = markTaskDone(state, result.task.id);
    save(state);
    recordCompletion();
    refresh();
  });

  document.getElementById('imBack').addEventListener('click', () => {
    recordDisruption();
    refresh();
  });

  document.getElementById('importTrigger').addEventListener('click', openImportSheet);
  document.getElementById('emptyImportBtn').addEventListener('click', openImportSheet);

  document.getElementById('importSubmit').addEventListener('click', () => {
    const input = document.getElementById('importInput').value.trim();
    if (!input) {
      showImportError('Paste something first.');
      return;
    }
    const result = parseAndMerge(input);
    if (result.success) {
      closeImportSheet();
      refresh();
    } else {
      showImportError(result.errors.join('\n'));
    }
  });

  document.getElementById('importCancel').addEventListener('click', closeImportSheet);

  document.getElementById('streakBadge').addEventListener('click', openStreakPanel);
  document.getElementById('streakClose').addEventListener('click', closeStreakPanel);

  document.getElementById('overlay').addEventListener('click', () => {
    closeImportSheet();
    closeStreakPanel();
  });

  document.getElementById('degradedAccept').addEventListener('click', () => {
    acceptDegraded();
    refresh();
  });

  document.getElementById('degradedDismiss').addEventListener('click', () => {
    dismissDegraded();
    refresh();
  });

  document.getElementById('importInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImportSheet();
  });
}

document.addEventListener('DOMContentLoaded', init);
