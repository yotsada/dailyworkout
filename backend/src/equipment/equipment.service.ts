import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.equipment.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const existing = await this.prisma.equipment.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Equipment already exists');
    return this.prisma.equipment.create({ data: { name } });
  }
}
