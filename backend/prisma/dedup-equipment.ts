/**
 * Equipment dedup script — merges case-insensitive duplicate equipment names.
 * Keeps the lowercase version (from seed). Reassigns Exercise + ProfileEquipment FKs.
 * Run: npm run dedup:equipment
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.equipment.findMany({ orderBy: { name: 'asc' } });
  console.log(`Found ${all.length} equipment records`);

  // Group by lowercase name
  const groups = new Map<string, typeof all>();
  for (const eq of all) {
    const key = eq.name.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(eq);
  }

  let merged = 0;
  for (const [key, items] of groups) {
    if (items.length <= 1) continue;

    // Prefer the exact-lowercase match; fallback to whichever has most exercises
    const canonical = items.find(i => i.name === key) ?? items[0];
    const duplicates = items.filter(i => i.id !== canonical.id);

    console.log(`\nMerging "${key}":`);
    console.log(`  keep:    "${canonical.name}" (${canonical.id})`);
    duplicates.forEach(d => console.log(`  discard: "${d.name}" (${d.id})`));

    for (const dup of duplicates) {
      // Re-point Exercise rows
      const exCount = await prisma.exercise.updateMany({
        where: { equipmentId: dup.id },
        data:  { equipmentId: canonical.id },
      });
      // Re-point ProfileEquipment rows (upsert-safe: only add if not already there)
      const peRows = await prisma.profileEquipment.findMany({
        where: { equipmentId: dup.id },
      });
      for (const pe of peRows) {
        const exists = await prisma.profileEquipment.findUnique({
          where: { profileId_equipmentId: { profileId: pe.profileId, equipmentId: canonical.id } },
        });
        if (!exists) {
          await prisma.profileEquipment.create({
            data: { profileId: pe.profileId, equipmentId: canonical.id },
          });
        }
        await prisma.profileEquipment.delete({
          where: { profileId_equipmentId: { profileId: pe.profileId, equipmentId: dup.id } },
        });
      }
      await prisma.equipment.delete({ where: { id: dup.id } });
      console.log(`  → moved ${exCount.count} exercises`);
      merged++;
    }
  }

  const remaining = await prisma.equipment.count();
  console.log(`\nDone. Merged ${merged} duplicates. ${remaining} equipment records remain.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
