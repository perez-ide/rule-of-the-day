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

const OVERLAY_HIDDEN = 'hidden';
const PANEL_HIDDEN = 'hidden';

export function renderAll(state) {
  renderStreakBadge(state);
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

export function renderNowCard(state) {
  const card = document.getElementById('nowCard');
  const bar = document.getElementById('nowAccentBar');
  const roleEl = document.getElementById('nowRole');
  const titleEl = document.getElementById('nowTitle');
  const durationEl = document.getElementById('nowDuration');
  const untilEl = document.getElementById('nowUntil');
  const markDone = document.getElementById('markDone');
  const imBack = document.getElementById('imBack');

  const anchors = getAnchorsForToday();
  const currentAnchor = getCurrentAnchor(anchors);

  if (currentAnchor) {
    const color = ROLE_COLORS[currentAnchor.role] || 'var(--accentJob)';
    bar.style.background = color;
    roleEl.textContent = currentAnchor.role;
    titleEl.textContent = currentAnchor.title;
    const start = currentAnchor.startTime;
    const end = currentAnchor.endTime;
    durationEl.textContent = `${start} - ${end}`;
    untilEl.textContent = '';
    markDone.textContent = 'Mark Done';
    imBack.classList.remove('hidden');
    return;
  }

  const result = nextTask(state);

  if (!result) {
    bar.style.background = 'var(--separator)';
    roleEl.textContent = '';
    titleEl.textContent = 'Nothing queued';
    durationEl.textContent = 'Paste in your next batch';
    untilEl.textContent = '';
    markDone.classList.add('hidden');
    imBack.classList.add('hidden');
    return;
  }

  const { task, degraded, duration: overrideDuration } = result;
  const color = ROLE_COLORS[task.role] || 'var(--accentDeep)';
  bar.style.background = color;
  roleEl.textContent = task.role;
  titleEl.textContent = task.title;

  const duration = overrideDuration || task.durationMinutes;
  durationEl.textContent = `${duration} min`;

  const nextAnchor = getNextAnchor(anchors);
  if (nextAnchor) {
    const runway = runwayUntilNextAnchor(anchors);
    if (runway !== null && runway > 0) {
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + Math.min(duration, runway));
      const eh = endTime.getHours().toString().padStart(2, '0');
      const em = endTime.getMinutes().toString().padStart(2, '0');
      untilEl.textContent = `until ${eh}:${em}`;
    } else {
      untilEl.textContent = '';
    }
  } else {
    untilEl.textContent = '';
  }

  markDone.classList.remove('hidden');
  markDone.textContent = 'Mark Done';
  imBack.classList.remove('hidden');
  imBack.textContent = "I'm Back";
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
    document.getElementById('emptyImportBtn').onclick = () => openImportSheet();
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
            <span class="queue-item-title">🔒 ${a.title}</span>
            <span class="anchor-time caption">${a.startTime} - ${a.endTime}</span>
          </div>
        </div>
      `;
    }
    const t = item.data;
    const color = ROLE_COLORS[t.role] || 'var(--accentDeep)';
    const doneClass = t.status === 'done' ? 'done' : '';
    return `
      <div class="queue-item" data-task-id="${t.id}">
        <div class="queue-item-bar" style="background:${color}"></div>
        <div class="queue-item-content">
          <span class="queue-item-title ${doneClass}">${t.title}</span>
          <div class="queue-item-extra">
            <span class="queue-item-role">${t.role}</span>
            <span class="queue-item-duration">${t.durationMinutes}m</span>
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
        <span>${done ? '✓' : '—'}</span>
      </div>
    `;
  }).join('');
}

export function openImportSheet() {
  document.getElementById('overlay').classList.remove(OVERLAY_HIDDEN);
  document.getElementById('importSheet').classList.add('open');
  document.getElementById('importSheet').classList.remove('hidden');
  document.getElementById('importInput').value = '';
  document.getElementById('importError').classList.add('hidden');
  document.getElementById('importInput').focus();
}

export function closeImportSheet() {
  document.getElementById('overlay').classList.add(OVERLAY_HIDDEN);
  document.getElementById('importSheet').classList.remove('open');
  setTimeout(() => {
    document.getElementById('importSheet').classList.add('hidden');
  }, 250);
}

export function openStreakPanel() {
  renderStreakPanel();
  document.getElementById('overlay').classList.remove(OVERLAY_HIDDEN);
  document.getElementById('streakPanel').classList.remove('hidden');
}

export function closeStreakPanel() {
  document.getElementById('overlay').classList.add(OVERLAY_HIDDEN);
  document.getElementById('streakPanel').classList.add('hidden');
}

export function showImportError(msg) {
  const el = document.getElementById('importError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function hideImportError() {
  document.getElementById('importError').classList.add('hidden');
}
