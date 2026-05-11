import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProfileDto, userId: string) {
    const equipmentRecords = await this.prisma.equipment.findMany({
      where: { name: { in: dto.equipment } },
      select: { id: true },
    });

    const profile = await this.prisma.profile.create({
      data: {
        name: dto.name,
        userId,
        equipment: {
          create: equipmentRecords.map(e => ({ equipmentId: e.id })),
        },
        days: {
          create: dto.schedule.map(s => ({
            day: s.day,
            bodyParts: s.bodyParts,
            exercises: {
              create: (
                dto.workout.find(w => w.day === s.day)?.exercises ?? []
              ).map((ex, order) => ({
                exerciseId: ex.exerciseId,
                order,
                sets: {
                  create: ex.sets.map((set, si) => ({
                    setNumber:   si + 1,
                    repType:     set.repType,
                    reps:        set.repType === 'count' ? set.reps : null,
                    duration:    set.repType === 'time'  ? set.reps : null,
                    restSeconds: set.restSeconds,
                  })),
                },
              })),
            },
          })),
        },
      },
      select: { id: true, name: true, createdAt: true },
    });

    return profile;
  }

  async update(id: string, userId: string, dto: CreateProfileDto) {
    const exists = await this.prisma.profile.findFirst({ where: { id, userId } });
    if (!exists) return;

    const equipmentRecords = await this.prisma.equipment.findMany({
      where: { name: { in: dto.equipment } },
      select: { id: true },
    });

    await this.prisma.profileEquipment.deleteMany({ where: { profileId: id } });
    await this.prisma.profileDay.deleteMany({ where: { profileId: id } });

    return this.prisma.profile.update({
      where: { id },
      data: {
        name: dto.name,
        equipment: {
          create: equipmentRecords.map(e => ({ equipmentId: e.id })),
        },
        days: {
          create: dto.schedule.map(s => ({
            day: s.day,
            bodyParts: s.bodyParts,
            exercises: {
              create: (
                dto.workout.find(w => w.day === s.day)?.exercises ?? []
              ).map((ex, order) => ({
                exerciseId: ex.exerciseId,
                order,
                sets: {
                  create: ex.sets.map((set, si) => ({
                    setNumber:   si + 1,
                    repType:     set.repType,
                    reps:        set.repType === 'count' ? set.reps : null,
                    duration:    set.repType === 'time'  ? set.reps : null,
                    restSeconds: set.restSeconds,
                  })),
                },
              })),
            },
          })),
        },
      },
      select: { id: true, name: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.prisma.profile.deleteMany({ where: { id, userId } });
  }

  findAll(userId: string) {
    return this.prisma.profile.findMany({
      where: { userId },
      include: {
        equipment: { include: { equipment: true } },
        days: { include: { exercises: { include: { exercise: true, sets: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
