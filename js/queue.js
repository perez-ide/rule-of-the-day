import { getPendingTasks } from './storage.js';
import { runwayUntilNextAnchor, getAnchorsForToday, getCurrentAnchor } from './anchors.js';
import { isDegradedActive, getDegradedDuration } from './degraded.js';

function prioritizedQueue(state) {
  return getPendingTasks(state).sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

function nextTask(state) {
  const anchors = getAnchorsForToday();
  const current = getCurrentAnchor(anchors);
  if (current) return null;

  const queue = prioritizedQueue(state);
  if (queue.length === 0) return null;

  const degraded = isDegradedActive(state);
  if (degraded) {
    const nonCurb = queue.find(t => t.type !== 'curb');
    if (nonCurb) return { task: nonCurb, degraded: true, duration: getDegradedDuration() };
    return null;
  }

  const runway = runwayUntilNextAnchor(anchors) ?? 480;
  const fullFit = queue.find(t => {
    if (t.type === 'curb') return true;
    return (t.durationMinutes || 15) <= runway;
  });
  if (fullFit) return { task: fullFit, degraded: false };

  const nonCurbFallback = queue.find(t => t.type !== 'curb');
  if (nonCurbFallback) return { task: nonCurbFallback, degraded: true, duration: getDegradedDuration() };
  return null;
}

export { prioritizedQueue, nextTask };
