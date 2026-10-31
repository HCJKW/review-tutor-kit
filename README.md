# Review Tutor Kit

A ready-made set of rules that turns an AI assistant (Claude Code, Codex or similar) into a strict, honest exam-review tutor for **any subject**. It also includes a tiny record keeper that schedules spaced reviews.

It started as a board-exam review setup for accounting, auditing, law and tax. Everything subject-specific has been removed.

## What the tutor does

- Asks **one question at a time** and accepts a **letter alone**. Explaining your reasoning is optional.
- After you answer, explains the deciding rule, why the tempting wrong choice fails, and why unused figures don't matter. Then goes straight to the next step and question; you never have to type "next".
- Explains simply first ("explain like I'm five"), with a boxes-and-arrows picture and a worked example using the same problem's numbers.
- Uses complete, realistic exam-style problems and stays inside **your** supplied materials, citing the page or question number.
- Keeps answer keys hidden until you commit.
- Records honestly: a first try, a try after a hint, a retry and a worked example are kept apart. Only a correct, unaided answer on a fresh question a day or more later counts as remembering.
- Schedules reviews after 1, 3, 7, 14 and 30 days, and brings a concept back the next day after a miss.

The full rules are in [`rules/`](rules/).

## Start

Requires [Node.js](https://nodejs.org) 22 or later. There is nothing to install.

1. Click **Use this template** on GitHub, or clone the repository. Keep your copy **private** if you will store your own study history in it.
2. Fill in [`profile/learner-profile.md`](profile/learner-profile.md): your exam, date, timezone and any preference changes.
3. Add a subject:

   ```sh
   npm run new-subject -- BIO "General Biology"
   ```

   This creates `subjects/BIO/`. Put your slides, handouts and question sets in `subjects/BIO/sources/` and list them in `subjects/BIO/sources.md`.
4. Open the folder in Claude Code (or another assistant) and say what you want, for example "Review BIO cell transport, questions from handout 2". The assistant reads [`CLAUDE.md`](CLAUDE.md) and follows the rules.

## Record answers and see due reviews

The tutor records each real answer as a small JSON file:

```sh
npm run record-event -- path/to/answer.json
```

This appends to `data/events.jsonl`, then updates `REVIEW_QUEUE.md`, `progress.md` and each subject's `progress.md`. To refresh them without recording:

```sh
npm run checkpoint
```

The field list is in [`docs/event-format.md`](docs/event-format.md), with a sample in [`docs/event.example.json`](docs/event.example.json).

## Settings

[`tutor.config.json`](tutor.config.json):

| Setting | Default | Meaning |
|---|---|---|
| `timezone` | `Asia/Manila` | Time zone used to show review dates |
| `intervalsDays` | `[1, 3, 7, 14, 30]` | Spacing between reviews; a starting point, not a proven optimum |
| `delayedCheckHours` | `24` | Minimum gap before a correct answer counts as remembering |
| `blockLimit` | `10` | Most questions per block; a ceiling, not a quota |

## Folder map

| Path | Contents |
|---|---|
| `CLAUDE.md`, `AGENTS.md` | What the assistant reads first |
| `rules/` | Teaching style, learning policy, question-type training, printable reviewer format, research notes |
| `profile/` | Your learner profile |
| `templates/subject/` | Files copied for each new subject |
| `subjects/` | Your subjects |
| `scripts/`, `lib/` | Record keeper and subject creator |
| `data/events.jsonl` | Your answer log (created on first use) |

## Check

```sh
npm test
```

## License

[MIT](LICENSE)
