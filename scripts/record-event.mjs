import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkpoint, recordEvent } from '../lib/learning.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file || file === '--help') {
  console.log('Usage: npm run record-event -- answer.json\nFields: see docs/event-format.md. Records one real outcome, then refreshes REVIEW_QUEUE.md and progress files.');
  process.exit(file ? 0 : 1);
}
try {
  const result = recordEvent(root, JSON.parse(readFileSync(file, 'utf8')));
  console.log(JSON.stringify({ result, checkpoint: checkpoint(root) }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
