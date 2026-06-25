import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Maps frontend broad category → actual bodyPart values stored in DB (from free-exercise-db primaryMuscles)
const BODY_PART_MAP: Record<string, string[] | null> = {
  chest:     ['chest'],
  back:      ['middle back', 'lats', 'lower back', 'traps', 'neck'],
  legs:      ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  shoulders: ['shoulders'],
  arms:      ['biceps', 'triceps', 'forearms'],
  core:      ['abdominals', 'hip flexors'],
  cardio:    null, // null → filter by repType = 'time' instead
};

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  findByFilter(bodyPart: string, equipmentNames: string[]) {
    // ── Body part filter ───────────────────────────────────────────────────
    const key     = bodyPart.toLowerCase().trim();
    const muscles = Object.prototype.hasOwnProperty.call(BODY_PART_MAP, key)
      ? BODY_PART_MAP[key]
      : undefined;

    let bodyWhere: object;
    if (muscles === null) {
      // Cardio: exercises with repType = 'time'
      bodyWhere = { repType: 'time' };
    } else if (Array.isArray(muscles)) {
      bodyWhere = { bodyPart: { in: muscles }, repType: { not: 'time' } };
    } else {
      // Unknown category — case-insensitive exact match as fallback
      bodyWhere = { bodyPart: { equals: bodyPart, mode: 'insensitive' } };
    }

    // ── Equipment filter ───────────────────────────────────────────────────
    // "Body" (or "body") → body-weight exercises have equipmentId = null
    const includeBodyOnly = equipmentNames.some(n => n.toLowerCase() === 'body');
    const otherNames      = equipmentNames.filter(n => n.toLowerCase() !== 'body');

    const equipOr: object[] = [];
    if (includeBodyOnly)      equipOr.push({ equipmentId: null });
    if (otherNames.length > 0) {
      equipOr.push({ equipment: { name: { in: otherNames, mode: 'insensitive' } } });
    }

    return this.prisma.exercise.findMany({
      where: {
        ...bodyWhere,
        ...(equipOr.length > 0 ? { OR: equipOr } : {}),
      },
      include: { equipment: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  resolveByNames(names: string[]) {
    if (names.length === 0) return Promise.resolve([]);
    return this.prisma.exercise.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true, externalId: true },
    });
  }

  async create(name: string, bodyPart: string, equipmentName: string, repType: 'count' | 'time' = 'count') {
    const existing = await this.prisma.exercise.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Exercise already exists');
    const equipment = await this.prisma.equipment.findUnique({ where: { name: equipmentName } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return this.prisma.exercise.create({
      data: { name, bodyPart, repType, equipmentId: equipment.id },
      include: { equipment: { select: { id: true, name: true } } },
    });
  }
}
