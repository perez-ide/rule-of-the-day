import { load, save, addTasks, todayISO } from './storage.js';

const VALID_ROLES = ['faith', 'job', 'deep', 'growth', 'rest'];
const VALID_TYPES = ['build', 'curb'];

function parseAndMerge(rawJson) {
  const errors = [];
  let parsed;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, errors: ['That didn\'t look like a task list — check the JSON format and try again.'] };
  }

  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return { success: false, errors: ['No tasks found in that data. Make sure it includes a "tasks" array.'] };
  }

  const valid = [];
  const today = todayISO();
  const state = load();
  const existingTitles = new Set(
    (state.tasks || [])
      .filter(t => t.day === today && (t.status === 'pending' || t.status === 'carried_over'))
      .map(t => t.title.toLowerCase().trim())
  );

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (!t.title) {
      errors.push(`Task ${i + 1}: missing required field "title"`);
      continue;
    }
    if (!t.role || !VALID_ROLES.includes(t.role)) {
      errors.push(`Task ${i + 1}: "${t.role || '(none)'}" is not a valid role (use: ${VALID_ROLES.join(', ')})`);
      continue;
    }
    const type = t.type || 'build';
    if (!VALID_TYPES.includes(type)) {
      errors.push(`Task ${i + 1}: "${type}" is not a valid type (use: build, curb)`);
      continue;
    }
    if (type === 'build' && (t.durationMinutes === undefined || t.durationMinutes === null)) {
      errors.push(`Task ${i + 1}: missing required field "durationMinutes" for build task`);
      continue;
    }
    if (existingTitles.has(t.title.toLowerCase().trim())) {
      errors.push(`"${t.title}" already exists — skipping duplicate.`);
      continue;
    }
    valid.push({
      title: t.title,
      role: t.role,
      type,
      durationMinutes: t.durationMinutes,
      priority: t.priority !== undefined ? t.priority : 99,
      identityTag: t.identityTag,
      entryVersion: t.entryVersion,
      stackedAfter: t.stackedAfter,
      frictionAdded: t.frictionAdded,
      replacementAction: t.replacementAction
    });
    existingTitles.add(t.title.toLowerCase().trim());
  }

  if (valid.length > 0) {
    addTasks(state, valid);
    save(state);
  }

  return { success: valid.length > 0, count: valid.length, errors };
}

export { parseAndMerge, VALID_ROLES };
