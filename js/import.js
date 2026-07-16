import { load, save, addTasks, todayISO } from './storage.js';

const REQUIRED_FIELDS = ['title', 'role', 'durationMinutes'];
const VALID_ROLES = ['faith', 'job', 'deep', 'growth', 'rest'];

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
    const missing = REQUIRED_FIELDS.filter(f => t[f] === undefined || t[f] === null);
    if (missing.length > 0) {
      errors.push(`Task ${i + 1}: missing required field(s): ${missing.join(', ')}`);
      continue;
    }
    if (!VALID_ROLES.includes(t.role)) {
      errors.push(`Task ${i + 1}: "${t.role}" is not a valid role (use: ${VALID_ROLES.join(', ')})`);
      continue;
    }
    if (existingTitles.has(t.title.toLowerCase().trim())) {
      errors.push(`Task "${t.title}" already exists — skipping duplicate.`);
      continue;
    }
    valid.push({
      title: t.title,
      role: t.role,
      durationMinutes: t.durationMinutes,
      priority: t.priority !== undefined ? t.priority : 99
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
