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
    return { task: queue[0], degraded: true, duration: getDegradedDuration() };
  }

  const runway = runwayUntilNextAnchor(anchors) ?? 480;
  const fullFit = queue.find(t => (t.durationMinutes || 15) <= runway);
  if (fullFit) return { task: fullFit, degraded: false };

  return { task: queue[0], degraded: true, duration: getDegradedDuration() };
}

export { prioritizedQueue, nextTask };
