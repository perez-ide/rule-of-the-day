import { getAnchorsForToday, getCurrentAnchor, getNextAnchor, runwayUntilNextAnchor, minutesFromMidnight } from './anchors.js';
import { todayISO } from './storage.js';
import { nextTask, prioritizedQueue } from './queue.js';
import { shouldOfferDegraded, shouldAutoDegrade, isDegradedDismissed } from './degraded.js';
import { getStreak, getRecentHistory } from './streak.js';
import { getQuote } from './quotes.js';
import { icon } from '../icons/icons.js';

const ROLE_COLORS = {
  faith: 'var(--accentFaith)',
  deep: 'var(--accentDeep)',
  growth: 'var(--accentGrowth)',
  job: 'var(--accentJob)',
  rest: 'var(--accentRest)'
};

const ROLE_LABELS = {
  faith: 'Faith',
  deep: 'Deep',
  growth: 'Growth',
  job: 'Job',
  rest: 'Rest'
};

let activeFilter = 'all';

export function setActiveFilter(role) {
  activeFilter = role;
}

export function getActiveFilter() {
  return activeFilter;
}

export function renderAll(state) {
  renderStreakBadge(state);
  renderDayStrip();
  renderAnchorCards(state);
  renderNowCard(state);
  renderFilterTabs(state);
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
  const count = streak.current;
  document.getElementById('streakCount').textContent = count;
  document.getElementById('streakBadge').setAttribute('aria-label', `Streak: ${count} days. View history.`);
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
      <div class="day-strip-cell ${isToday ? 'today' : ''}" role="listitem" ${isToday ? 'aria-current="date"' : ''}>
        <span class="day-strip-label">${dayNames[i]}</span>
        <span class="day-strip-num">${d.getDate()}</span>
      </div>
    `;
  }
  strip.innerHTML = html;
}

export function renderAnchorCards(state) {
  const container = document.getElementById('anchorCards');
  const anchors = getAnchorsForToday();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  container.innerHTML = anchors.map(a => {
    const start = minutesFromMidnight(a.startTime);
    const end = minutesFromMidnight(a.endTime);
    const isActive = nowMin >= start && nowMin < end;
    const roleClass = `role-${a.role}`;

    return `
      <div class="anchor-card ${roleClass} ${isActive ? 'active' : ''}" role="listitem">
        <div class="anchor-card-top">
          <span class="anchor-card-icon">${icon('lock')}</span>
        </div>
        <div>
          <div class="anchor-card-title">${a.title}</div>
          <div class="anchor-card-time">${formatTime(a.startTime)} – ${formatTime(a.endTime)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
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
    roleEl.textContent = ROLE_LABELS[currentAnchor.role] || currentAnchor.role;
    titleEl.textContent = currentAnchor.title;
    durationEl.textContent = `${formatTime(currentAnchor.startTime)} – ${formatTime(currentAnchor.endTime)}`;
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
  roleEl.textContent = ROLE_LABELS[task.role] || task.role;

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
      untilEl.textContent = `until ${formatTime(endTime.getHours().toString().padStart(2, '0') + ':' + endTime.getMinutes().toString().padStart(2, '0'))}`;
    } else {
      untilEl.textContent = '';
    }
  } else {
    untilEl.textContent = '';
  }

  markDone.textContent = 'Mark Done';
}

export function renderFilterTabs(state) {
  const container = document.getElementById('filterTabs');
  const queue = (state.tasks || []).filter(t => t.day === todayISO() && (t.status === 'pending' || t.status === 'carried_over'));

  const counts = { all: 0, faith: 0, deep: 0, growth: 0, job: 0, rest: 0 };
  for (const t of queue) {
    counts.all++;
    if (counts[t.role] !== undefined) counts[t.role]++;
  }

  const tabs = [
    { role: 'all', label: 'All' },
    { role: 'faith', label: 'Faith' },
    { role: 'deep', label: 'Deep' },
    { role: 'growth', label: 'Growth' },
    { role: 'job', label: 'Job' },
    { role: 'rest', label: 'Rest' }
  ];

  container.innerHTML = tabs
    .filter(t => t.role === 'all' || counts[t.role] > 0)
    .map(t => `
      <button class="filter-tab ${activeFilter === t.role ? 'active' : ''}"
              data-role="${t.role}"
              role="tab"
              aria-selected="${activeFilter === t.role}"
              aria-label="${t.label}: ${counts[t.role]} tasks">
        ${t.label}
        <span class="filter-tab-count">${counts[t.role]}</span>
      </button>
    `).join('');
}

export function renderQueue(state) {
  const list = document.getElementById('queueList');
  const empty = document.getElementById('emptyState');
  const anchors = getAnchorsForToday();
  const queue = prioritizedQueue(state);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const filtered = activeFilter === 'all'
    ? queue
    : queue.filter(t => t.role === activeFilter);

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = filtered.map(t => {
    const color = ROLE_COLORS[t.role] || 'var(--accentDeep)';
    const isCurb = t.type === 'curb';
    const curbClass = isCurb ? 'curb' : '';

    let statusHtml = '';
    if (t.status === 'done') statusHtml = '<span class="queue-item-status completed">Completed</span>';
    else if (t.status === 'held') statusHtml = '<span class="queue-item-status held">Held</span>';
    else if (t.status === 'slipped') statusHtml = '<span class="queue-item-status slipped">Slipped</span>';
    else statusHtml = '<span class="queue-item-status pending">Up Next</span>';

    let stackedHtml = '';
    if (t.stackedAfter) {
      const refTask = (state.tasks || []).find(r => r.id === t.stackedAfter);
      const refAnchor = anchors.find(a => a.id === t.stackedAfter);
      const refName = refTask ? refTask.title : refAnchor ? refAnchor.title : null;
      if (refName) stackedHtml = `<span class="queue-item-stacked">After ${refName}</span>`;
    }

    const titleClass = t.status === 'done' ? 'done' : t.status === 'held' ? 'held' : t.status === 'slipped' ? 'slipped' : '';
    const duration = isCurb ? '' : `${t.durationMinutes || 0}m`;
    const meta = [stackedHtml, `<span>${ROLE_LABELS[t.role] || t.role}</span>`, duration ? `<span>${duration}</span>` : ''].filter(Boolean).join(' · ');

    return `
      <li class="queue-item ${curbClass}" role="listitem">
        <div class="queue-item-bar" style="background:${color}"></div>
        <div class="queue-item-content">
          <div class="queue-item-text">
            <span class="queue-item-title ${titleClass}">${t.title}</span>
            ${meta ? `<div class="queue-item-meta">${meta}</div>` : ''}
          </div>
          <div class="queue-item-extra">
            ${statusHtml}
          </div>
        </div>
      </li>
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
        <span>${done ? icon('checkSmall') : '—'}</span>
      </div>
    `;
  }).join('');
}

export function openImportSheet() {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('importSheet');
  overlay.classList.remove('hidden');
  sheet.classList.add('open');
  sheet.classList.remove('hidden');
  document.getElementById('importInput').value = '';
  document.getElementById('importError').classList.add('hidden');
  document.getElementById('importInput').focus();
}

export function closeImportSheet() {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('importSheet');
  overlay.classList.add('hidden');
  sheet.classList.remove('open');
  setTimeout(() => {
    sheet.classList.add('hidden');
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
