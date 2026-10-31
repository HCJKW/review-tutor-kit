import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkpoint } from '../lib/learning.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  console.log(JSON.stringify(checkpoint(root), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
