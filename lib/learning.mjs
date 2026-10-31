// Learning record: an append-only event log, replayed to produce review dates and progress.
// The log (data/events.jsonl) is the single source of truth; Markdown views are regenerated from it.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const START = '<!-- tutor:managed:start -->';
const END = '<!-- tutor:managed:end -->';

export const ASSISTANCE = ['independent', 'guided', 'worked', 'retry', 'unknown'];
export const GRADING = ['graded', 'ungraded', 'voided', 'key-unavailable'];
export const EXPOSURE = ['first-recorded', 'repeated', 'unknown'];
const FRESH = ['known-unseen', 'new-authored'];
const DEFAULTS = { timezone: 'UTC', intervalsDays: [1, 3, 7, 14, 30], delayedCheckHours: 24, blockLimit: 10 };

export class LearningError extends Error {}

export function loadConfig(root) {
  const file = path.join(root, 'tutor.config.json');
  const config = { ...DEFAULTS, ...(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}) };
  if (!Array.isArray(config.intervalsDays) || !config.intervalsDays.length || !config.intervalsDays.every((d) => d > 0)) {
    throw new LearningError('tutor.config.json: intervalsDays must be a list of positive numbers.');
  }
  return config;
}

const eventsFile = (root) => path.join(root, 'data', 'events.jsonl');

export function readEvents(root) {
  const file = eventsFile(root);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line, i) => {
    try { return JSON.parse(line); } catch { throw new LearningError(`data/events.jsonl line ${i + 1} is not valid JSON.`); }
  });
}

export function listSubjects(root) {
  const dir = path.join(root, 'subjects');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

function timestamp(value, field) {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new LearningError(`${field} must be an ISO timestamp with a timezone, e.g. 2026-01-15T19:30:00+08:00.`);
  }
  return new Date(value).toISOString();
}

const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/** Checks one tutor-reported outcome and returns the stored form. Unknown facts stay unknown. */
export function validateEvent(input, { subjects, now }) {
  if (!input || typeof input !== 'object') throw new LearningError('The event must be a JSON object.');
  const eventId = input.eventId;
  if (typeof eventId !== 'string' || !/^[\w.:-]{1,160}$/.test(eventId)) throw new LearningError('A stable eventId is required (letters, digits, . : _ -).');
  if (!subjects.includes(input.subject)) {
    throw new LearningError(`Unknown subject "${input.subject}". Create it with: npm run new-subject -- ${input.subject || '<CODE>'} "<Name>"`);
  }
  const topicId = text(input.topicId, 160);
  if (!topicId) throw new LearningError('topicId is required.');
  const assistance = input.assistance ?? 'unknown';
  if (!ASSISTANCE.includes(assistance)) throw new LearningError(`assistance must be one of: ${ASSISTANCE.join(', ')}.`);
  const gradingStatus = input.gradingStatus ?? 'ungraded';
  if (!GRADING.includes(gradingStatus)) throw new LearningError(`gradingStatus must be one of: ${GRADING.join(', ')}.`);
  const exposure = input.exposure ?? 'unknown';
  if (!EXPOSURE.includes(exposure)) throw new LearningError(`exposure must be one of: ${EXPOSURE.join(', ')}.`);
  const provenance = { historicalExposure: 'unknown', ...(input.provenance || {}) };
  if (gradingStatus === 'graded' && (typeof input.correct !== 'boolean' || !provenance.source || !provenance.grader)) {
    throw new LearningError('A graded event needs "correct" (true/false), provenance.source and provenance.grader.');
  }
  return {
    eventId,
    subject: input.subject,
    topicId,
    conceptTag: text(input.conceptTag, 160) || topicId,
    title: text(input.title, 200),
    questionId: text(input.questionId, 160),
    answer: text(input.answer, 10),
    correct: gradingStatus === 'graded' ? input.correct : null,
    gradingStatus,
    assistance,
    exposure,
    // null keeps an unknown historical date unknown; omission means "now".
    createdAt: input.createdAt === null ? null : input.createdAt === undefined ? now : timestamp(input.createdAt, 'createdAt'),
    recordedAt: now,
    assessmentFormat: text(input.assessmentFormat, 200) || 'unknown',
    reasoning: text(input.reasoning, 8000),
    provenance,
    synthetic: input.synthetic === true,
  };
}

/** Replays the log in time order and returns each concept's review state plus per-event results. */
export function replay(events, config) {
  const intervals = config.intervalsDays;
  const gate = config.delayedCheckHours * HOUR;
  const ordered = events.map((e, order) => ({ e, order, at: Date.parse(e.createdAt ?? e.recordedAt) }))
    .sort((a, b) => a.at - b.at || a.order - b.order);
  const concepts = new Map();
  const results = new Map();
  const seenQuestions = new Set();
  for (const { e, at } of ordered) {
    if (e.synthetic || e.gradingStatus === 'voided') { results.set(e.eventId, { reviewDueAt: null, delayedCheck: false }); continue; }
    const exposure = e.questionId && seenQuestions.has(e.questionId) ? 'repeated' : e.exposure;
    if (e.questionId) seenQuestions.add(e.questionId);
    const graded = e.gradingStatus === 'graded';
    const supported = e.gradingStatus === 'ungraded' && ['guided', 'worked'].includes(e.assistance);
    if (!graded && !supported) { results.set(e.eventId, { reviewDueAt: null, delayedCheck: false }); continue; }

    const key = `${e.subject}:${e.conceptTag}`;
    const prev = concepts.get(key);
    const known = e.createdAt !== null;
    const eligible = graded && e.correct === true && e.assistance === 'independent' && exposure === 'first-recorded' && FRESH.includes(e.provenance?.historicalExposure);
    const delayed = eligible && known && prev?.lastExposureAt != null && at - prev.lastExposureAt >= gate;
    const index = !eligible ? 0 : delayed ? Math.min((prev?.index ?? 0) + 1, intervals.length - 1) : prev?.index ?? 0;
    const dueAt = new Date(at + intervals[index] * DAY).toISOString();
    const reset = e.correct === false || e.assistance !== 'independent';
    const delayedAt = delayed ? at : reset ? null : prev?.delayedAt ?? null;
    const status = delayedAt != null ? 'delayed recall shown'
      : ['guided', 'worked', 'retry'].includes(e.assistance) || exposure === 'repeated' ? 'supported practice; independent check pending'
      : graded ? 'practice evidence recorded' : 'awaiting review';
    concepts.set(key, {
      subject: e.subject, topicId: e.topicId, conceptTag: e.conceptTag, title: e.title || prev?.title || e.conceptTag,
      index, intervalDays: intervals[index], dueAt, status, delayedAt,
      lastExposureAt: known ? at : prev?.lastExposureAt ?? null,
      basis: eligible ? (delayed ? 'Delayed recall; next interval.' : 'Unaided fresh answer; interval kept.') : 'Miss, help, retry or repeat: next-day review.',
    });
    results.set(e.eventId, { reviewDueAt: dueAt, delayedCheck: delayed });
  }
  return { concepts: [...concepts.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt)), results };
}

export function summarize(events) {
  const real = events.filter((e) => !e.synthetic);
  const graded = real.filter((e) => e.gradingStatus === 'graded');
  return {
    graded: graded.length,
    correct: graded.filter((e) => e.correct).length,
    incorrect: graded.filter((e) => e.correct === false).length,
    helped: graded.filter((e) => ['guided', 'worked'].includes(e.assistance)).length,
    retries: graded.filter((e) => e.assistance === 'retry' || e.exposure === 'repeated').length,
    shownSolutions: real.filter((e) => e.gradingStatus === 'ungraded' && e.assistance === 'worked').length,
    voided: real.filter((e) => e.gradingStatus === 'voided').length,
  };
}

export function recordEvent(root, input, { now = new Date().toISOString() } = {}) {
  const event = validateEvent(input, { subjects: listSubjects(root), now });
  const events = readEvents(root);
  const prior = events.find((e) => e.eventId === event.eventId);
  if (prior) return { eventId: event.eventId, duplicate: true };
  mkdirSync(path.dirname(eventsFile(root)), { recursive: true });
  appendFileSync(eventsFile(root), `${JSON.stringify(event)}\n`);
  const { results } = replay([...events, event], loadConfig(root));
  return { eventId: event.eventId, duplicate: false, ...results.get(event.eventId) };
}

function writeManaged(file, content) {
  const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const block = `${START}\n${content.trim()}\n${END}`;
  const a = old.indexOf(START);
  const b = old.indexOf(END);
  const updated = a >= 0 && b > a ? old.slice(0, a) + block + old.slice(b + END.length) : `${old.trimEnd()}${old.trim() ? '\n\n' : ''}${block}\n`;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, updated);
}

const cell = (value) => String(value).replaceAll('|', '/');

export function checkpoint(root, { now = new Date().toISOString() } = {}) {
  const config = loadConfig(root);
  const events = readEvents(root);
  const { concepts } = replay(events, config);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const local = (iso) => day.format(new Date(iso));
  const due = concepts.filter((c) => c.dueAt <= now);
  const subjects = [...new Set([...listSubjects(root), ...events.map((e) => e.subject)])].sort();
  const stamp = `Generated ${local(now)} (${config.timezone}) from data/events.jsonl. Do not edit inside this block.`;

  writeManaged(path.join(root, 'REVIEW_QUEUE.md'), [
    '# Review queue', '', stamp, '',
    `Due now: ${due.length}. Spacing: ${config.intervalsDays.join(', ')} days (adjustable).`, '',
    '| Due | Subject | Concept | Status | Basis |', '|---|---|---|---|---|',
    ...concepts.map((c) => `| ${local(c.dueAt)}${c.dueAt <= now ? ' **due**' : ''} | ${c.subject} | ${cell(c.title)} | ${c.status} | ${c.basis} |`),
  ].join('\n'));

  const row = (label, s) => `| ${label} | ${s.graded} | ${s.correct} | ${s.incorrect} | ${s.helped} | ${s.retries} | ${s.shownSolutions} | ${s.voided} |`;
  const delayedBySubject = (s) => concepts.filter((c) => c.subject === s && c.status === 'delayed recall shown').length;
  writeManaged(path.join(root, 'progress.md'), [
    '# Progress', '', stamp, '',
    '| Subject | Graded | Correct | Wrong | With help | Retries | Shown solutions | Voided |', '|---|---|---|---|---|---|---|---|',
    ...subjects.map((s) => row(s, summarize(events.filter((e) => e.subject === s)))),
    row('**All**', summarize(events)), '',
    `Concepts with delayed recall shown: ${concepts.filter((c) => c.status === 'delayed recall shown').length} of ${concepts.length}.`,
    'Reasoning is optional and not graded. No exam forecast until a full diagnostic exists.',
  ].join('\n'));

  for (const s of listSubjects(root)) {
    const mine = concepts.filter((c) => c.subject === s);
    const stats = summarize(events.filter((e) => e.subject === s));
    writeManaged(path.join(root, 'subjects', s, 'progress.md'), [
      '## Recorded evidence', '', stamp, '',
      `Graded ${stats.graded}: correct ${stats.correct}, wrong ${stats.incorrect}, with help ${stats.helped}, retries ${stats.retries}. Delayed recall shown on ${delayedBySubject(s)} of ${mine.length} concepts.`, '',
      ...(mine.length ? mine.map((c) => `- ${c.title}: ${c.status}; next review ${local(c.dueAt)}.`) : ['No answers recorded yet.']),
    ].join('\n'));
  }
  return { events: events.length, concepts: concepts.length, dueNow: due.length };
}
