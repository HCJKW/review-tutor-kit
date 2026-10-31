# Event format

Record one real teaching or answer event per JSON file:

```sh
npm run record-event -- path/to/answer.json
```

The command checks the fields, appends the event to `data/events.jsonl`, and refreshes `REVIEW_QUEUE.md` and the progress files. Recording the same `eventId` again does nothing, so repeats are safe.

## Fields

| Field | Required | Values and meaning |
|---|---|---|
| `eventId` | Yes | Stable unique ID, such as `BIO-2026-01-15-handout2-q4` |
| `subject` | Yes | A folder name under `subjects/` |
| `topicId` | Yes | The topic, such as `cell-transport` |
| `conceptTag` | No | The specific idea tested. Use the same tag for every question on the same distinction. Defaults to `topicId` |
| `title` | No | Readable concept name shown in the review queue |
| `questionId` | No | The item's ID. A `questionId` already in the log is treated as repeated |
| `answer` | No | The chosen letter |
| `correct` | For graded | `true` or `false`. Omit for teaching, a missing key or a voided item |
| `gradingStatus` | No | `graded`, `ungraded` (default), `voided` or `key-unavailable` |
| `assistance` | No | `independent`, `guided`, `worked`, `retry` or `unknown` (default) |
| `exposure` | No | `first-recorded`, `repeated` or `unknown` (default) |
| `createdAt` | No | When it happened, with a timezone, such as `2026-01-15T19:30:00+08:00`. Omit for "now". `null` keeps an unknown past date unknown |
| `assessmentFormat` | No | For example `multiple-choice; optional reasoning` |
| `reasoning` | No | The learner's optional explanation. Stored, never graded |
| `provenance.source` | For graded | Where the item came from |
| `provenance.grader` | For graded | Who checked the answer, and against what |
| `provenance.historicalExposure` | No | `known-unseen` or `new-authored` only when certain; otherwise `unknown` (default) |
| `synthetic` | No | `true` for tests and demonstrations; ignored in progress and reviews |

## How it is scheduled

- A miss, a hint (`guided`), a shown solution (`worked`), a retry or a repeated item: review the next day.
- A correct, `independent`, `first-recorded` answer on an item that is `known-unseen` or `new-authored`: keeps the current interval.
- The same, at least 24 hours after the latest teaching or answer on that concept: a **delayed check**. The concept moves to the next interval (1 → 3 → 7 → 14 → 30 days).
- Voided items, missing keys and `synthetic` events do not affect reviews.

## Examples

A shown solution (teaching, not a learner answer):

```json
{ "eventId": "BIO-2026-01-15-worked-osmosis", "subject": "BIO", "topicId": "cell-transport", "conceptTag": "osmosis-direction",
  "gradingStatus": "ungraded", "assistance": "worked", "provenance": { "source": "Handout 2, example 1" } }
```

A graded answer: see [`event.example.json`](event.example.json). It is marked `synthetic: true`; set it to `false` and replace every value only for a real answer.
