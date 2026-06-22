# Seed exercises from free-exercise-db

> **For Claude / future devs:** This document specifies the one-off task of seeding the `Exercise` and `Equipment` tables from the open-source `free-exercise-db` dataset. Read this fully before writing any code.

---

## Goal

Populate `Exercise` and `Equipment` tables in our Postgres DB with ~800 exercises from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).

**We keep DB small.** Only metadata goes into the DB. Images stay on GitHub (`raw.githubusercontent.com`) — frontend builds the URL at runtime from `externalId`.

---

## What I want

1. A **migration** that adds an `externalId` field to `Exercise`.
2. A **seed script** (`backend/prisma/seed-exercises.ts`) that:
   - Downloads `exercises.json` from the free-exercise-db repo.
   - Upserts all unique `equipment` values into `Equipment`.
   - Upserts each exercise into `Exercise`, mapping fields per the rules below.
   - Is idempotent (safe to re-run).
   - Logs progress + a summary at the end (count inserted/updated/skipped).
3. An **npm script** in `backend/package.json` to run it: `npm run seed:exercises`.
4. A **frontend helper** in `frontend/app/lib/exerciseImages.ts` to build image URLs from `externalId`.
5. **Update `CLAUDE.md`** at project root (section: Database schema + Common tasks) and **append to `CHANGELOG.md`** per the project rules.

---

## Data source

- **JSON URL:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
- **Image base URL:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/`
- **License:** Public Domain — no attribution required, but include a note in `CHANGELOG.md` for transparency.

### Sample record from source

```json
{
  "id": "Alternate_Incline_Dumbbell_Curl",
  "name": "Alternate Incline Dumbbell Curl",
  "force": "pull",
  "level": "beginner",
  "mechanic": "isolation",
  "equipment": "dumbbell",
  "primaryMuscles": ["biceps"],
  "secondaryMuscles": ["forearms"],
  "instructions": ["Sit down on an incline bench...", "..."],
  "category": "strength",
  "images": ["Alternate_Incline_Dumbbell_Curl/0.jpg", "Alternate_Incline_Dumbbell_Curl/1.jpg"]
}
```

---

## Migration

```prisma
model Exercise {
  id          String  @id @default(cuid())
  externalId  String? @unique   // NEW — id from free-exercise-db, e.g. "Alternate_Incline_Dumbbell_Curl"
  name        String  @unique
  bodyPart    String
  repType     String  @default("count")
  equipmentId String?

  equipment    Equipment? @relation(fields: [equipmentId], references: [id])
  dayExercises DayExercise[]
}
```

Run:
```bash
cd backend && npx prisma migrate dev --name add_external_id_to_exercise
```

> ⚠️ Use the **session-mode pooler** URL for migrations (per project memory).

---

## Field mapping rules

| Source field | → Target field | Transform |
|---|---|---|
| `id` | `Exercise.externalId` | as-is |
| `name` | `Exercise.name` | as-is |
| `primaryMuscles[0]` | `Exercise.bodyPart` | lowercase; if empty array, **skip the exercise** and log a warning |
| `equipment` | `Equipment.name` (and link via `equipmentId`) | lowercase; if `null` or `"body only"` → set `equipmentId = null` |
| `category` | `Exercise.repType` | see table below |

### `category` → `repType` mapping

```ts
const CATEGORY_TO_REP_TYPE: Record<string, "count" | "time"> = {
  strength:     "count",
  powerlifting: "count",
  olympic_weightlifting: "count",
  strongman:    "count",
  plyometrics:  "count",
  stretching:   "time",
  cardio:       "time",
};
// fallback: "count"
```

### `equipment` normalization

Source uses inconsistent casing/wording. Normalize to lowercase, then group:

| Source value(s) | Normalized `Equipment.name` |
|---|---|
| `"body only"`, `null` | (none — `equipmentId = null`) |
| `"dumbbell"` | `dumbbell` |
| `"barbell"` | `barbell` |
| `"kettlebells"` | `kettlebell` |
| `"cable"` | `cable` |
| `"machine"` | `machine` |
| `"bands"` | `resistance band` |
| `"medicine ball"` | `medicine ball` |
| `"exercise ball"` | `exercise ball` |
| `"foam roll"` | `foam roller` |
| `"e-z curl bar"` | `ez bar` |
| `"other"` | `other` |

For anything else, use the lowercased source value as-is and `upsert` into `Equipment`.

---

## Seed script behavior

**File:** `backend/prisma/seed-exercises.ts`

**Steps:**
1. `fetch()` the JSON from the URL above. If fetch fails, exit with error.
2. Build a unique set of normalized equipment names. `upsert` each into `Equipment` (by `name`). Build a `Map<string, equipmentId>`.
3. For each exercise in the JSON:
   - Skip if `primaryMuscles` is empty (log: `[SKIP] <name> — no primary muscle`).
   - `upsert` by `externalId`:
     - **create:** all fields per mapping
     - **update:** only `name`, `bodyPart`, `repType`, `equipmentId` (don't touch the row's `id` or anything dependent)
   - Track counts: `created`, `updated`, `skipped`.
4. Print summary:
   ```
   ✓ Equipment: X created, Y existing
   ✓ Exercises: A created, B updated, C skipped
   Done in Ns
   ```

**Idempotency:** running the script twice in a row must produce `0 created, ~800 updated, 0 skipped` on the second run.

**No image downloading.** We never store images. Period.

---

## Frontend helper

**File:** `frontend/app/lib/exerciseImages.ts`

```ts
const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/**
 * Build image URL for an exercise from free-exercise-db.
 * Each exercise has 2 frames: 0 (start position) and 1 (end position).
 * Returns null if externalId is missing (for custom user-added exercises).
 */
export function getExerciseImageUrl(
  externalId: string | null | undefined,
  frame: 0 | 1 = 0
): string | null {
  if (!externalId) return null;
  return `${BASE}/${externalId}/${frame}.jpg`;
}
```

Use in components like:
```tsx
const startImg = getExerciseImageUrl(exercise.externalId, 0);
const endImg   = getExerciseImageUrl(exercise.externalId, 1);
{startImg && <img src={startImg} alt={exercise.name} />}
```

> Custom exercises added by users via the admin module will have `externalId = null` — components must handle that case gracefully (show a placeholder or hide the image).

---

## package.json addition

In `backend/package.json` under `"scripts"`:
```json
"seed:exercises": "ts-node prisma/seed-exercises.ts"
```

(If `ts-node` isn't installed, use `tsx` instead — check what's already there.)

---

## Acceptance checklist

Before considering this done, verify:

- [ ] `npx prisma migrate dev --name add_external_id_to_exercise` ran cleanly
- [ ] `npm run seed:exercises` completes without errors
- [ ] DB has ~800 rows in `Exercise`, ~10–15 rows in `Equipment`
- [ ] Re-running `npm run seed:exercises` shows `0 created, ~800 updated`
- [ ] A spot-check query works: `SELECT * FROM "Exercise" WHERE "bodyPart" = 'biceps' LIMIT 5`
- [ ] `getExerciseImageUrl("Alternate_Incline_Dumbbell_Curl", 0)` returns a URL that loads in a browser
- [ ] `CLAUDE.md` updated (mention `externalId` in schema; add `seed:exercises` under Common tasks)
- [ ] `CHANGELOG.md` appended with: what changed, why, files affected, data source + license

---

## Out of scope (don't do these now)

- ❌ Downloading or hosting images ourselves
- ❌ Importing `instructions`, `secondaryMuscles`, `force`, `level`, `mechanic` (we don't use them yet — can add later if needed)
- ❌ Auto-creating `ExerciseSet` defaults for each exercise (sets are per-user, per-profile)
- ❌ Translating names to Thai (do later as a separate task)

---

## Notes for future iterations

- If we later want to migrate images to our own CDN (Cloudflare R2 recommended), the only change is in `exerciseImages.ts` — DB stays the same.
- If we add user-created exercises, set `externalId = null` and add a separate `imageUrl` field at that point.
- The dataset hasn't been updated frequently. Pin to a commit SHA later if reliability matters.
