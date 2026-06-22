const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/**
 * Build image URL for an exercise from free-exercise-db.
 * Each exercise has 2 frames: 0 (start position) and 1 (end position).
 * Returns null if externalId is missing (custom user-added exercises).
 */
export function getExerciseImageUrl(
  externalId: string | null | undefined,
  frame: 0 | 1 = 0,
): string | null {
  if (!externalId) return null;
  return `${BASE}/${externalId}/${frame}.jpg`;
}
