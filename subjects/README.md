# Subjects

Create a subject with:

```sh
npm run new-subject -- <CODE> "<Subject name>"
```

`<CODE>` is a short label such as `BIO`, `LAW` or `CALC` (letters, digits, `-`, `_`). Each subject folder has:

| File | Purpose |
|---|---|
| `sources.md` and `sources/` | Your materials and what is missing from them |
| `memorize.md` | Question-type map and source-backed rules |
| `cheatsheet.md` | Short concept notes |
| `missed_items.md` | Every miss, kept for review |
| `progress.md` | Session notes plus a generated evidence block |
| `private/` | Answer keys for your own question sets; ignored by git |
