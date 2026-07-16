import { getAnchorsForToday, getCurrentAnchor, getNextAnchor, runwayUntilNextAnchor, minutesFromMidnight } from './anchors.js';
import { todayISO } from './storage.js';
import { nextTask, prioritizedQueue } from './queue.js';
import { shouldOfferDegraded, shouldAutoDegrade, isDegradedDismissed } from './degraded.js';
import { getStreak, getRecentHistory } from './streak.js';
import { getQuote } from './quotes.js';

const ROLE_COLORS = {
  faith: 'var(--accentFaith)',
  deep: 'var(--accentDeep)',
  growth: 'var(--accentGrowth)',
  job: 'var(--accentJob)',
  rest: 'var(--accentRest)'
};

export function renderAll(state) {
  renderStreakBadge(state);
  renderDayStrip();
  renderNowCard(state);
  renderQueue(state);
  renderQuote();
  renderDegradedBanner(state);
  renderHeroTime();
}

export function renderHeroTime() {
  const el = document.getElementById('heroTime');
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  el.textContent = `${h}:${m}`;
}

export function renderStreakBadge(state) {
  const streak = getStreak();
  document.getElementById('streakCount').textContent = streak.current;
}

export function renderDayStrip() {
  const strip = document.getElementById('dayStrip');
  const today = new Date();
  const todayISOStr = todayISO();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    const iso = d.toISOString().slice(0, 10);
    const isToday = iso === todayISOStr;
    html += `
      <div class="day-strip-cell ${isToday ? 'today' : ''}">
        <span class="day-strip-label">${dayNames[i]}</span>
        <span class="day-strip-num">${d.getDate()}</span>
      </div>
    `;
  }
  strip.innerHTML = html;
}

export function renderNowCard(state) {
  const roleEl = document.getElementById('nowRole');
  const titleEl = document.getElementById('nowTitle');
  const durationEl = document.getElementById('nowDuration');
  const untilEl = document.getElementById('nowUntil');
  const markDone = document.getElementById('markDone');
  const markEntry = document.getElementById('markEntry');
  const markEntryLabel = document.getElementById('markEntryLabel');
  const imBack = document.getElementById('imBack');
  const holdTask = document.getElementById('holdTask');
  const slipTask = document.getElementById('slipTask');
  const nowActions = document.getElementById('nowActions');
  const nowIdentity = document.getElementById('nowIdentity');
  const nowStacked = document.getElementById('nowStacked');
  const nowEntry = document.getElementById('nowEntry');
  const nowCompleted = document.getElementById('nowCompleted');

  markDone.classList.remove('hidden');
  markEntry.classList.add('hidden');
  holdTask.classList.add('hidden');
  slipTask.classList.add('hidden');
  nowIdentity.classList.add('hidden');
  nowStacked.classList.add('hidden');
  nowEntry.classList.add('hidden');
  nowCompleted.classList.add('hidden');
  imBack.classList.remove('hidden');
  titleEl.classList.remove('strikethrough');

  const anchors = getAnchorsForToday();
  const currentAnchor = getCurrentAnchor(anchors);

  if (currentAnchor) {
    roleEl.textContent = currentAnchor.role;
    titleEl.textContent = currentAnchor.title;
    durationEl.textContent = `${currentAnchor.startTime} – ${currentAnchor.endTime}`;
    untilEl.textContent = '';
    markDone.textContent = 'Mark Done';
    return;
  }

  const result = nextTask(state);

  if (!result) {
    roleEl.textContent = '';
    titleEl.textContent = 'Nothing queued';
    durationEl.textContent = 'Paste in your next batch';
    untilEl.textContent = '';
    markDone.classList.add('hidden');
    imBack.classList.add('hidden');
    return;
  }

  const { task, degraded, duration: overrideDuration } = result;
  roleEl.textContent = task.role;

  if (task.status === 'done' || task.status === 'held') {
    titleEl.textContent = task.title;
    titleEl.classList.add('strikethrough');
    nowCompleted.classList.remove('hidden');
    durationEl.textContent = task.status === 'held' ? 'Held today' : 'Done';
    untilEl.textContent = '';
    markDone.classList.add('hidden');
    imBack.classList.add('hidden');
    return;
  }

  titleEl.textContent = task.title;

  if (task.identityTag) {
    nowIdentity.textContent = task.identityTag;
    nowIdentity.classList.remove('hidden');
  }

  if (task.stackedAfter) {
    const refTask = (state.tasks || []).find(t => t.id === task.stackedAfter);
    const refAnchor = anchors.find(a => a.id === task.stackedAfter);
    const refName = refTask ? refTask.title : refAnchor ? refAnchor.title : null;
    if (refName) {
      nowStacked.textContent = `After ${refName}`;
      nowStacked.classList.remove('hidden');
    }
  }

  if (task.entryVersion && task.type === 'build') {
    nowEntry.textContent = task.entryVersion;
    nowEntry.classList.remove('hidden');
    markEntryLabel.textContent = task.entryVersion;
    markEntry.classList.remove('hidden');
  }

  if (task.type === 'curb') {
    markDone.classList.add('hidden');
    holdTask.classList.remove('hidden');
    slipTask.classList.remove('hidden');
    durationEl.textContent = task.frictionAdded || 'Risk window';
    untilEl.textContent = '';
    return;
  }

  const duration = overrideDuration || task.durationMinutes;
  durationEl.textContent = `${duration} min`;

  const nextAnchor = getNextAnchor(anchors);
  if (nextAnchor) {
    const runway = runwayUntilNextAnchor(anchors);
    if (runway !== null && runway > 0) {
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + Math.min(duration || 15, runway));
      const eh = endTime.getHours().toString().padStart(2, '0');
      const em = endTime.getMinutes().toString().padStart(2, '0');
      untilEl.textContent = `until ${eh}:${em}`;
    } else {
      untilEl.textContent = '';
    }
  } else {
    untilEl.textContent = '';
  }

  markDone.textContent = 'Mark Done';
}

export function renderQueue(state) {
  const list = document.getElementById('queueList');
  const empty = document.getElementById('emptyState');
  const anchors = getAnchorsForToday();
  const queue = prioritizedQueue(state);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const currentAnchor = getCurrentAnchor(anchors);
  let items = [];

  for (const a of anchors) {
    const start = minutesFromMidnight(a.startTime);
    if (start > nowMin || (currentAnchor && currentAnchor.id === a.id)) {
      items.push({ type: 'anchor', data: a, active: currentAnchor && currentAnchor.id === a.id });
    }
  }

  for (const t of queue) {
    items.push({ type: 'task', data: t });
  }

  if (items.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = items.map(item => {
    if (item.type === 'anchor') {
      const a = item.data;
      const color = ROLE_COLORS[a.role] || 'var(--accentJob)';
      return `
        <div class="queue-item">
          <div class="queue-item-bar" style="background:${color}"></div>
          <div class="queue-item-content">
            <span class="queue-item-title">&#x1F512; ${a.title}</span>
            <span class="anchor-time caption">${a.startTime} – ${a.endTime}</span>
          </div>
        </div>
      `;
    }
    const t = item.data;
    const color = ROLE_COLORS[t.role] || 'var(--accentDeep)';
    const isCurb = t.type === 'curb';
    const doneClass = t.status === 'done' ? 'done' : '';
    const heldClass = t.status === 'held' ? 'held' : '';
    const slippedClass = t.status === 'slipped' ? 'slipped' : '';
    const curbClass = isCurb ? 'curb' : '';

    let stackedHtml = '';
    if (t.stackedAfter) {
      const refTask = (state.tasks || []).find(r => r.id === t.stackedAfter);
      const refAnchor = anchors.find(a => a.id === t.stackedAfter);
      const refName = refTask ? refTask.title : refAnchor ? refAnchor.title : null;
      if (refName) stackedHtml = `<div class="queue-item-stacked">After ${refName}</div>`;
    }

    let statusHtml = '';
    if (isCurb) {
      if (t.status === 'held') statusHtml = '<span class="queue-item-status held">Held</span>';
      else if (t.status === 'slipped') statusHtml = '<span class="queue-item-status slipped">Slipped</span>';
    }

    return `
      <div class="queue-item ${curbClass}">
        <div class="queue-item-bar" style="background:${color}"></div>
        <div class="queue-item-content">
          <div class="queue-item-text">
            <span class="queue-item-title ${doneClass} ${heldClass} ${slippedClass}">${t.title}</span>
            ${stackedHtml}
          </div>
          <div class="queue-item-extra">
            ${statusHtml}
            <span class="queue-item-role">${t.role}</span>
            <span class="queue-item-duration">${t.type === 'curb' ? '' : (t.durationMinutes || 0) + 'm'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderQuote() {
  const container = document.getElementById('quoteContainer');
  const quote = getQuote();
  if (!quote) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  document.getElementById('quoteText').textContent = `"${quote.text}"`;
  document.getElementById('quoteAuthor').textContent = `— ${quote.author}`;
}

export function renderDegradedBanner(state) {
  const banner = document.getElementById('degradedBanner');
  const auto = shouldAutoDegrade(state);
  const offer = shouldOfferDegraded(state);
  const dismissed = isDegradedDismissed(state);

  if (offer && !dismissed) {
    banner.classList.remove('hidden');
    document.getElementById('degradedMessage').textContent = auto
      ? 'Day\'s been disrupted. Running a shorter version.'
      : 'The day\'s been disrupted. Try a shorter version?';
    document.getElementById('degradedAccept').classList.toggle('hidden', auto);
    document.getElementById('degradedDismiss').classList.toggle('hidden', auto);
  } else {
    banner.classList.add('hidden');
  }
}

export function renderStreakPanel() {
  const streak = getStreak();
  const history = getRecentHistory();
  document.getElementById('scoreDisplay').textContent = streak.score;
  const panel = document.getElementById('streakHistory');
  panel.innerHTML = history.map(d => {
    const today = todayISO();
    const isToday = d.date === today;
    const label = isToday ? 'Today' : new Date(d.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' });
    const done = d.completed > 0;
    return `
      <div class="streak-day ${done ? 'completed' : ''}">
        <span>${label}</span>
        <span>${done ? '&#x2713;' : '—'}</span>
      </div>
    `;
  }).join('');
}

export function openImportSheet() {
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('importSheet').classList.add('open');
  document.getElementById('importSheet').classList.remove('hidden');
  document.getElementById('importInput').value = '';
  document.getElementById('importError').classList.add('hidden');
  document.getElementById('importInput').focus();
}

export function closeImportSheet() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('importSheet').classList.remove('open');
  setTimeout(() => {
    document.getElementById('importSheet').classList.add('hidden');
  }, 250);
}

export function openStreakPanel() {
  renderStreakPanel();
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('streakPanel').classList.remove('hidden');
}

export function closeStreakPanel() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('streakPanel').classList.add('hidden');
}

export function showImportError(msg) {
  const el = document.getElementById('importError');
  el.textContent = msg;
  el.classList.remove('hidden');
}
