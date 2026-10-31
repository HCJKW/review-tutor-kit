import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkpoint, recordEvent, LearningError } from '../lib/learning.mjs';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function workspace() {
  const root = mkdtempSync(path.join(tmpdir(), 'tutor-kit-'));
  for (const item of ['templates', 'scripts', 'lib', 'tutor.config.json', 'package.json']) cpSync(path.join(kit, item), path.join(root, item), { recursive: true });
  execFileSync(process.execPath, ['scripts/new-subject.mjs', 'BIO', 'General Biology'], { cwd: root });
  return root;
}

const graded = (eventId, createdAt, extra = {}) => ({
  eventId, subject: 'BIO', topicId: 'transport', conceptTag: 'osmosis', gradingStatus: 'graded', correct: true,
  assistance: 'independent', exposure: 'first-recorded', createdAt, questionId: eventId,
  provenance: { source: 'Handout 2', grader: 'test', historicalExposure: 'new-authored' }, ...extra,
});

test('new-subject fills in the template', () => {
  const root = workspace();
  assert.match(readFileSync(path.join(root, 'subjects/BIO/memorize.md'), 'utf8'), /^# General Biology \(BIO\)/);
  assert.ok(existsSync(path.join(root, 'subjects/BIO/private')));
});

test('a correct fresh answer 24 hours after teaching counts as a delayed check and moves the interval', () => {
  const root = workspace();
  const first = recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00'));
  assert.equal(first.delayedCheck, false);
  assert.equal(first.reviewDueAt, '2026-01-02T02:00:00.000Z');
  const second = recordEvent(root, graded('q2', '2026-01-02T11:00:00+08:00'));
  assert.equal(second.delayedCheck, true);
  assert.equal(second.reviewDueAt, '2026-01-05T03:00:00.000Z');
});

test('less than 24 hours, help, a miss or a repeated item never counts as a delayed check', () => {
  const root = workspace();
  recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00'));
  assert.equal(recordEvent(root, graded('q2', '2026-01-01T20:00:00+08:00')).delayedCheck, false);
  assert.equal(recordEvent(root, graded('q3', '2026-01-03T10:00:00+08:00', { assistance: 'guided' })).delayedCheck, false);
  assert.equal(recordEvent(root, graded('q4', '2026-01-05T10:00:00+08:00', { correct: false })).delayedCheck, false);
  const repeat = recordEvent(root, graded('q5', '2026-01-07T10:00:00+08:00', { questionId: 'q1' }));
  assert.equal(repeat.delayedCheck, false);
  assert.equal(repeat.reviewDueAt, '2026-01-08T02:00:00.000Z');
});

test('a shown solution resets the 24-hour clock', () => {
  const root = workspace();
  recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00'));
  recordEvent(root, { eventId: 'w1', subject: 'BIO', topicId: 'transport', conceptTag: 'osmosis', assistance: 'worked', createdAt: '2026-01-02T09:00:00+08:00', provenance: { source: 'Example 1' } });
  assert.equal(recordEvent(root, graded('q2', '2026-01-02T11:00:00+08:00')).delayedCheck, false);
});

test('duplicates, voided items and test records do not change anything', () => {
  const root = workspace();
  recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00'));
  assert.equal(recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00')).duplicate, true);
  assert.equal(recordEvent(root, graded('v1', '2026-01-03T10:00:00+08:00', { gradingStatus: 'voided', correct: undefined })).reviewDueAt, null);
  assert.equal(recordEvent(root, graded('s1', '2026-01-03T10:00:00+08:00', { synthetic: true })).reviewDueAt, null);
  assert.equal(readFileSync(path.join(root, 'data/events.jsonl'), 'utf8').trim().split('\n').length, 3);
});

test('bad input is rejected with a clear message', () => {
  const root = workspace();
  assert.throws(() => recordEvent(root, graded('x', '2026-01-01T10:00:00+08:00', { subject: 'CHEM' })), /new-subject/);
  assert.throws(() => recordEvent(root, graded('x', '2026-01-01T10:00:00')), /timezone/);
  assert.throws(() => recordEvent(root, graded('x', '2026-01-01T10:00:00+08:00', { provenance: { source: 'a' } })), LearningError);
});

test('checkpoint writes managed blocks and keeps notes outside them', () => {
  const root = workspace();
  const notes = path.join(root, 'subjects/BIO/progress.md');
  recordEvent(root, graded('q1', '2026-01-01T10:00:00+08:00', { title: 'Osmosis direction' }));
  checkpoint(root, { now: '2026-01-03T00:00:00.000Z' });
  writeFileSync(notes, readFileSync(notes, 'utf8').replace('## Session notes', '## Session notes\n\nMy own note.'));
  const summary = checkpoint(root, { now: '2026-01-03T00:00:00.000Z' });
  assert.deepEqual(summary, { events: 1, concepts: 1, dueNow: 1 });
  const subject = readFileSync(notes, 'utf8');
  assert.match(subject, /My own note\./);
  assert.equal(subject.match(/tutor:managed:start/g).length, 1);
  assert.match(readFileSync(path.join(root, 'REVIEW_QUEUE.md'), 'utf8'), /\| 2026-01-02 \*\*due\*\* \| BIO \| Osmosis direction \|/);
});
