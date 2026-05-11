import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ExerciseEntry { name: string; done: boolean }

export interface UpsertDto {
  profileId?: string | null;
  isRestDay?: boolean;
  exercisesCompleted?: number;
  totalExercises?: number;
  exercises?: ExerciseEntry[];
}

@Injectable()
export class WorkoutLogsService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, date: string, dto: UpsertDto) {
    const profileId = dto.profileId ?? null;
    const data = {
      isRestDay:          dto.isRestDay          ?? false,
      exercisesCompleted: dto.exercisesCompleted ?? 0,
      totalExercises:     dto.totalExercises     ?? 0,
      exercises:          (dto.exercises ?? []) as unknown as Prisma.InputJsonValue,
    };
    const existing = await this.prisma.workoutLog.findFirst({
      where: { userId, profileId, date },
      select: { id: true },
    });
    if (existing) {
      return this.prisma.workoutLog.update({ where: { id: existing.id }, data });
    }
    return this.prisma.workoutLog.create({ data: { userId, profileId, date, ...data } });
  }

  findByMonth(userId: string, year: number, month: number, profileId?: string | null) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const start = `${year}-${pad(month)}-01`;
    const end   = `${year}-${pad(month)}-${pad(lastDay)}`;
    return this.prisma.workoutLog.findMany({
      where: { userId, profileId: profileId ?? null, date: { gte: start, lte: end } },
      select: { date: true, isRestDay: true, exercisesCompleted: true, totalExercises: true, exercises: true },
    });
  }
}
