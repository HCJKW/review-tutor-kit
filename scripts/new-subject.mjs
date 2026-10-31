// Copies templates/subject into subjects/<CODE>, filling in the code and name.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [code, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim() || code;
if (!code || !/^[A-Za-z0-9_-]{1,32}$/.test(code)) {
  console.error('Usage: npm run new-subject -- <CODE> "<Subject name>"\nCODE: letters, digits, - or _ (for example BIO).');
  process.exit(1);
}
const target = path.join(root, 'subjects', code);
if (existsSync(target)) {
  console.error(`subjects/${code} already exists; nothing changed.`);
  process.exit(1);
}
cpSync(path.join(root, 'templates', 'subject'), target, { recursive: true });
for (const file of readdirSync(target).filter((f) => f.endsWith('.md'))) {
  const full = path.join(target, file);
  writeFileSync(full, readFileSync(full, 'utf8').replaceAll('{{CODE}}', code).replaceAll('{{NAME}}', name));
}
mkdirSync(path.join(target, 'private'), { recursive: true });
console.log(`Created subjects/${code}. Add your materials to subjects/${code}/sources/ and list them in sources.md.`);
