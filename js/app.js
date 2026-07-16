import { load, save, markTaskDone, markTaskHeld, markTaskSlipped, carryOverTasks, todayISO, shouldShowMissTwiceNudge } from './storage.js';
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
  renderFilterTabs,
  openImportSheet,
  closeImportSheet,
  openStreakPanel,
  closeStreakPanel,
  showImportError,
  setActiveFilter,
  getActiveFilter
} from './ui.js';

let missTwiceTaskId = null;

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

  if (state.dayState.activeFilter) {
    setActiveFilter(state.dayState.activeFilter);
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
    if (result.task.type === 'curb') return;
    state = markTaskDone(state, result.task.id);
    save(state);
    recordCompletion();
    refresh();
  });

  document.getElementById('markEntry').addEventListener('click', () => {
    const result = nextTask(state);
    if (!result || !result.task) return;
    state = markTaskDone(state, result.task.id);
    save(state);
    recordCompletion();
    refresh();
  });

  document.getElementById('holdTask').addEventListener('click', () => {
    const result = nextTask(state);
    if (!result || !result.task || result.task.type !== 'curb') return;
    state = markTaskHeld(state, result.task.id);
    save(state);
    recordCompletion();
    refresh();
  });

  document.getElementById('slipTask').addEventListener('click', () => {
    const result = nextTask(state);
    if (!result || !result.task || result.task.type !== 'curb') return;
    state = markTaskSlipped(state, result.task.id);
    save(state);
    refresh();
    checkMissTwice(state, result.task.id);
  });

  document.getElementById('imBack').addEventListener('click', () => {
    recordDisruption();
    refresh();
  });

  document.getElementById('fab').addEventListener('click', openImportSheet);

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

  document.getElementById('missTwiceAccept').addEventListener('click', () => {
    if (missTwiceTaskId) {
      const task = state.tasks.find(t => t.id === missTwiceTaskId);
      if (task && task.entryVersion) {
        markTaskDone(state, missTwiceTaskId);
        save(state);
        recordCompletion();
      }
    }
    document.getElementById('missTwiceNudge').classList.add('hidden');
    missTwiceTaskId = null;
    refresh();
  });

  document.getElementById('missTwiceDismiss').addEventListener('click', () => {
    document.getElementById('missTwiceNudge').classList.add('hidden');
    missTwiceTaskId = null;
  });

  document.getElementById('filterTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    const role = tab.dataset.role;
    setActiveFilter(role);
    state = load();
    state.dayState.activeFilter = role;
    save(state);
    renderFilterTabs(state);
    renderQueue(state);
  });

  document.getElementById('importInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImportSheet();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const importSheet = document.getElementById('importSheet');
      const streakPanel = document.getElementById('streakPanel');
      if (!importSheet.classList.contains('hidden')) {
        closeImportSheet();
      } else if (!streakPanel.classList.contains('hidden')) {
        closeStreakPanel();
      }
    }
  });
}

function checkMissTwice(state, taskId) {
  if (shouldShowMissTwiceNudge(state, taskId)) {
    const task = state.tasks.find(t => t.id === taskId);
    const nudge = document.getElementById('missTwiceNudge');
    const msg = document.getElementById('missTwiceMessage');
    if (task && task.entryVersion) {
      msg.textContent = `This slipped twice — shrink it to "${task.entryVersion}" for today?`;
    } else if (task && task.type === 'curb' && task.replacementAction) {
      const replacement = state.tasks.find(t => t.id === task.replacementAction);
      if (replacement) {
        msg.textContent = `This slipped twice — try "${replacement.entryVersion || replacement.title}" instead?`;
      } else {
        msg.textContent = 'This slipped twice — want to shrink it to the two-minute version?';
      }
    } else {
      msg.textContent = 'This slipped twice — want to shrink it to the two-minute version?';
    }
    missTwiceTaskId = taskId;
    nudge.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
