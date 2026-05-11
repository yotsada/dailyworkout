import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const EQUIPMENT = [
  'Body', 'Dumbbell', 'Barbell', 'Resistance Band', 'Kettlebell',
  'Pull-up Bar', 'Jump Rope', 'Bench', 'Yoga Mat', 'Cable Machine', 'Treadmill',
];

const EXERCISES: { name: string; bodyPart: string; equipment: string; repType?: 'count' | 'time' }[] = [
  // Chest
  { name: 'Push-ups',              bodyPart: 'Chest', equipment: 'Body' },
  { name: 'Wide Push-ups',         bodyPart: 'Chest', equipment: 'Body' },
  { name: 'Diamond Push-ups',      bodyPart: 'Chest', equipment: 'Body' },
  { name: 'Decline Push-ups',      bodyPart: 'Chest', equipment: 'Body' },
  { name: 'Dumbbell Bench Press',  bodyPart: 'Chest', equipment: 'Dumbbell' },
  { name: 'Dumbbell Fly',          bodyPart: 'Chest', equipment: 'Dumbbell' },
  { name: 'Incline DB Press',      bodyPart: 'Chest', equipment: 'Dumbbell' },
  { name: 'Bench Press',           bodyPart: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Bench Press',   bodyPart: 'Chest', equipment: 'Barbell' },
  { name: 'Chest Dips',            bodyPart: 'Chest', equipment: 'Bench' },

  // Back
  { name: 'Superman',              bodyPart: 'Back', equipment: 'Body' },
  { name: 'Prone Y-Raise',         bodyPart: 'Back', equipment: 'Body' },
  { name: 'Pull-ups',              bodyPart: 'Back', equipment: 'Pull-up Bar' },
  { name: 'Chin-ups',              bodyPart: 'Back', equipment: 'Pull-up Bar' },
  { name: 'One-arm DB Row',        bodyPart: 'Back', equipment: 'Dumbbell' },
  { name: 'Bent-over DB Row',      bodyPart: 'Back', equipment: 'Dumbbell' },
  { name: 'Barbell Row',           bodyPart: 'Back', equipment: 'Barbell' },
  { name: 'Deadlift',              bodyPart: 'Back', equipment: 'Barbell' },

  // Legs
  { name: 'Bodyweight Squat',      bodyPart: 'Legs', equipment: 'Body' },
  { name: 'Lunges',                bodyPart: 'Legs', equipment: 'Body' },
  { name: 'Jump Squat',            bodyPart: 'Legs', equipment: 'Body' },
  { name: 'Glute Bridge',          bodyPart: 'Legs', equipment: 'Body' },
  { name: 'Calf Raises',           bodyPart: 'Legs', equipment: 'Body' },
  { name: 'Wall Sit',              bodyPart: 'Legs', equipment: 'Body',           repType: 'time' },
  { name: 'Goblet Squat',          bodyPart: 'Legs', equipment: 'Dumbbell' },
  { name: 'Romanian Deadlift',     bodyPart: 'Legs', equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', bodyPart: 'Legs', equipment: 'Dumbbell' },
  { name: 'Back Squat',            bodyPart: 'Legs', equipment: 'Barbell' },
  { name: 'Front Squat',           bodyPart: 'Legs', equipment: 'Barbell' },
  { name: 'Kettlebell Swing',      bodyPart: 'Legs', equipment: 'Kettlebell' },
  { name: 'KB Goblet Squat',       bodyPart: 'Legs', equipment: 'Kettlebell' },

  // Shoulders
  { name: 'Pike Push-ups',         bodyPart: 'Shoulders', equipment: 'Body' },
  { name: 'Scapular Push-ups',     bodyPart: 'Shoulders', equipment: 'Body' },
  { name: 'DB Shoulder Press',     bodyPart: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise',         bodyPart: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Front Raise',           bodyPart: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Rear Delt Fly',         bodyPart: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Overhead Press',        bodyPart: 'Shoulders', equipment: 'Barbell' },
  { name: 'Band Pull-apart',       bodyPart: 'Shoulders', equipment: 'Resistance Band' },
  { name: 'Band Lateral Raise',    bodyPart: 'Shoulders', equipment: 'Resistance Band' },

  // Arms
  { name: 'Tricep Dips',           bodyPart: 'Arms', equipment: 'Body' },
  { name: 'Close Push-ups',        bodyPart: 'Arms', equipment: 'Body' },
  { name: 'Bicep Curl',            bodyPart: 'Arms', equipment: 'Dumbbell' },
  { name: 'Hammer Curl',           bodyPart: 'Arms', equipment: 'Dumbbell' },
  { name: 'Tricep Extension',      bodyPart: 'Arms', equipment: 'Dumbbell' },
  { name: 'Skull Crusher',         bodyPart: 'Arms', equipment: 'Dumbbell' },
  { name: 'Barbell Curl',          bodyPart: 'Arms', equipment: 'Barbell' },
  { name: 'Close-grip Bench',      bodyPart: 'Arms', equipment: 'Barbell' },
  { name: 'Negative Chin-ups',     bodyPart: 'Arms', equipment: 'Pull-up Bar' },

  // Core
  { name: 'Plank',                 bodyPart: 'Core', equipment: 'Body',           repType: 'time' },
  { name: 'Crunches',              bodyPart: 'Core', equipment: 'Body' },
  { name: 'Bicycle Crunches',      bodyPart: 'Core', equipment: 'Body' },
  { name: 'Leg Raises',            bodyPart: 'Core', equipment: 'Body' },
  { name: 'Mountain Climbers',     bodyPart: 'Core', equipment: 'Body',           repType: 'time' },
  { name: 'Dead Bug',              bodyPart: 'Core', equipment: 'Body' },
  { name: 'Hollow Hold',           bodyPart: 'Core', equipment: 'Body',           repType: 'time' },
  { name: 'Russian Twist',         bodyPart: 'Core', equipment: 'Body' },
  { name: 'V-ups',                 bodyPart: 'Core', equipment: 'Yoga Mat' },
  { name: 'Flutter Kicks',         bodyPart: 'Core', equipment: 'Yoga Mat',       repType: 'time' },
  { name: 'Scissor Kicks',         bodyPart: 'Core', equipment: 'Yoga Mat',       repType: 'time' },
  { name: 'Cable Crunch',          bodyPart: 'Core', equipment: 'Cable Machine' },
  { name: 'Cable Twist',           bodyPart: 'Core', equipment: 'Cable Machine' },

  // Cardio
  { name: 'Jumping Jacks',         bodyPart: 'Cardio', equipment: 'Body',         repType: 'time' },
  { name: 'High Knees',            bodyPart: 'Cardio', equipment: 'Body',         repType: 'time' },
  { name: 'Burpees',               bodyPart: 'Cardio', equipment: 'Body' },
  { name: 'Box Jumps',             bodyPart: 'Cardio', equipment: 'Body' },
  { name: 'Jump Rope',             bodyPart: 'Cardio', equipment: 'Jump Rope',    repType: 'time' },
  { name: 'Double Unders',         bodyPart: 'Cardio', equipment: 'Jump Rope' },
  { name: 'Treadmill Run',         bodyPart: 'Cardio', equipment: 'Treadmill',    repType: 'time' },
  { name: 'Interval Run',          bodyPart: 'Cardio', equipment: 'Treadmill',    repType: 'time' },
];

async function main() {
  for (const name of EQUIPMENT) {
    await (prisma as any).equipment.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${EQUIPMENT.length} equipment items.`);

  const equipMap = new Map<string, string>();
  const allEquip = await (prisma as any).equipment.findMany();
  for (const e of allEquip) equipMap.set(e.name, e.id);

  let seeded = 0;
  for (const ex of EXERCISES) {
    const equipmentId = equipMap.get(ex.equipment);
    if (!equipmentId) { console.warn(`Equipment not found: ${ex.equipment}`); continue; }
    const repType = ex.repType ?? 'count';
    await (prisma as any).exercise.upsert({
      where:  { name: ex.name } as never,
      update: { repType },
      create: { name: ex.name, bodyPart: ex.bodyPart, repType, equipmentId },
    });
    seeded++;
  }
  console.log(`Seeded ${seeded} exercises.`);

  const existing = await (prisma as any).user.findFirst({ where: { role: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin1234', 10);
    await (prisma as any).user.create({
      data: { username: 'admin', password: hashed, role: 'admin' },
    });
    console.log('Created default admin — username: admin  password: admin1234');
  } else {
    console.log('Admin already exists, skipping.');
  }
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
