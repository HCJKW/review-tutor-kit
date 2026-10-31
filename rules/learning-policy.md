# Learning policy

How to grade, record and schedule. The goal is an honest picture of what the learner actually knows. See `learning-science.md` for the research behind it.

## Kinds of evidence

Keep these apart. Each is recorded separately and none overwrites another:

| Kind | Meaning |
|---|---|
| First attempt | The learner's first answer to an item, without help |
| Guided answer | Answered after a hint or explanation for that item |
| Correction | Answer given right after feedback on a miss |
| Same-item retry | Answering the same item again |
| Worked example | The tutor showed the solution; not a learner answer |
| Voided item | Defective source, disputed key or unclear tutor wording |
| Test record | A check of the tools; never counted as learning |

- A retry never replaces the first attempt or its count.
- Seeing the solution makes that item no longer independent for later checks.
- Source defects and unclear tutor wording are not learner mistakes. A voided item counts as neither right nor wrong, creates no weakness and gets no automatic replacement.
- Unknown past details stay unknown. Never guess the learner's reasoning from the wrong choice they picked.
- "First seen here" means first seen in this record. Imported question banks may have been seen before; don't treat them as fresh unless that is known.

## What counts as remembering

A concept moves forward only on a **delayed check**: a correct, unaided answer on a fresh item (new or known unseen), at least **24 hours** after the latest teaching, hint or shown solution on that concept. Timestamps must be real.

- One delayed check is limited evidence for that concept and question format. It is not full-topic mastery or exam readiness.
- A later miss reopens the concept for teaching and another review.
- Scores, self-ratings, points and immediate corrections never establish mastery.
- The 24-hour gap is a practical safeguard, not a scientific constant.

Progress labels, from weakest to strongest:

1. Awaiting review
2. Supported practice; independent check pending
3. Practice evidence recorded
4. Delayed recall shown

## Teaching phases

1. **Worked:** a short source-backed example showing why each step applies. Recorded as a shown solution.
2. **Faded:** a similar example with one step removed, or choose the missing step. Recorded as guided.
3. **Fresh:** a new problem where the learner picks the method. Key and hints hidden until commitment. Changing the choice order alone does not make a question fresh.
4. **Delayed review:** on a later day, a fresh independent item on the same concept.

Start where prior knowledge allows. Learn new types in a small block, then mix confusable types. Rotating between subjects gives variety and spacing, but it is not the same as mixing confusable question types.

## Scheduling

- Start with reviews after **1, 3, 7, 14 and 30 days**, adjusted for difficulty, performance and the exam date. These are adjustable starting points.
- A miss, a hint, a retry or a shown solution brings the review back to the next day.
- A delayed check moves the concept to the next interval.
- The record (`data/events.jsonl`) is the single source of truth. `REVIEW_QUEUE.md` and the managed progress blocks are generated from it. Don't keep a competing schedule in notes.
- Don't invent past due dates from phrases like "next session". Show dates in the learner's timezone.

## Scores, points and forecasts

- No points, XP, streaks or ranks unless the learner turns them on. Points never measure competence. A letter-only answer never loses points.
- Keep accuracy, help received, delayed recall and optional reasoning separate.
- No exam forecast, weakest-subject ranking or mastery percentage until a representative full diagnostic exists. A diagnostic is optional and never a precondition for teaching.

## Sources

- Order of authority: current official laws, standards and exam guidance; then the learner's supplied references and class materials; then generated notes.
- Check laws, standards and exam scope that change over time when they matter to a lesson. Older checks are dated evidence, not current verification.
- Record missing pages, disputed keys and assumptions instead of inventing them.
- Tutor-made questions, variants and added assumptions are labelled as such.

## Keys

- Keys, solutions and deciding hints stay hidden during a drill until the learner commits.
- Never copy keys into the review queue, progress files, exports or public files. Keep keys for private question sets in `subjects/<CODE>/private/`, which is ignored by git.
