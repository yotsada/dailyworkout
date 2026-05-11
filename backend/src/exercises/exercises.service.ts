import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  findByFilter(bodyPart: string, equipmentNames: string[]) {
    return this.prisma.exercise.findMany({
      where: {
        bodyPart,
        equipment: { name: { in: equipmentNames } },
      },
      include: { equipment: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
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
