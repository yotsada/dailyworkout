/**
 * Reset exercise library — clears all Exercise + DayExercise + ExerciseSet rows,
 * then re-seeds from free-exercise-db. Profile/ProfileDay/Equipment rows are kept.
 * Run: npm run reset:exercises
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const EXERCISES_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const CATEGORY_REP_TYPE: Record<string, 'count' | 'time'> = {
  strength:              'count',
  powerlifting:          'count',
  olympic_weightlifting: 'count',
  strongman:             'count',
  plyometrics:           'count',
  stretching:            'time',
  cardio:                'time',
};

const NAME_TIME_OVERRIDES = new Set([
  'plank',
  'side bridge',
  'flutter kicks',
  'spider crawl',
  'bottoms up',
  'push up to side plank',
  'isometric neck exercise - front and back',
  'isometric neck exercise - sides',
  'isometric wipers',
  'leverage iso row',
  'mountain climbers',
  'isometric chest squeezes',
  "farmer's walk",
  'yoke walk',
  'rickshaw carry',
  'bear crawl sled drags',
]);

const EQUIP_MAP: Record<string, string | null> = {
  'body only':    null,
  'kettlebells':  'kettlebell',
  'bands':        'resistance band',
  'foam roll':    'foam roller',
  'e-z curl bar': 'ez bar',
};

function normEquip(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'body only') return null;
  return EQUIP_MAP[lower] ?? lower;
}

interface RawExercise {
  id:             string;
  name:           string;
  equipment:      string | null;
  primaryMuscles: string[];
  category:       string;
}

async function main() {
  const t0 = Date.now();

  // ── 1. Clear exercise-related rows ────────────────────────────────────────
  console.log('Clearing ExerciseSet...');
  const { count: setCount } = await prisma.exerciseSet.deleteMany();
  console.log(`  deleted ${setCount} sets`);

  console.log('Clearing DayExercise...');
  const { count: deCount } = await prisma.dayExercise.deleteMany();
  console.log(`  deleted ${deCount} day-exercises`);

  console.log('Clearing Exercise...');
  const { count: exCount } = await prisma.exercise.deleteMany();
  console.log(`  deleted ${exCount} exercises`);

  // ── 2. Fetch source data ──────────────────────────────────────────────────
  console.log('\nFetching exercises from free-exercise-db...');
  const res = await fetch(EXERCISES_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raws: RawExercise[] = await res.json();
  console.log(`Downloaded ${raws.length} records`);

  // ── 3. Ensure all equipment exists ────────────────────────────────────────
  const equipSet = new Set<string>();
  for (const r of raws) {
    const n = normEquip(r.equipment);
    if (n) equipSet.add(n);
  }

  const equipMap = new Map<string, string>();
  for (const name of equipSet) {
    const eq = await prisma.equipment.upsert({
      where: { name }, update: {}, create: { name },
    });
    equipMap.set(name, eq.id);
  }
  console.log(`✓ Equipment: ${equipSet.size} upserted`);

  // ── 4. Insert exercises ───────────────────────────────────────────────────
  let created = 0, skipped = 0;

  for (const r of raws) {
    if (!r.primaryMuscles || r.primaryMuscles.length === 0) {
      skipped++;
      continue;
    }
    const bodyPart    = r.primaryMuscles[0].toLowerCase();
    const repType     = NAME_TIME_OVERRIDES.has(r.name.toLowerCase())
      ? 'time'
      : (CATEGORY_REP_TYPE[r.category] ?? 'count');
    const equipName   = normEquip(r.equipment);
    const equipmentId = equipName ? (equipMap.get(equipName) ?? null) : null;

    await prisma.exercise.create({
      data: { externalId: r.id, name: r.name, bodyPart, repType, equipmentId },
    });
    created++;
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✓ Exercises: ${created} created, ${skipped} skipped`);
  console.log(`Done in ${secs}s`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
