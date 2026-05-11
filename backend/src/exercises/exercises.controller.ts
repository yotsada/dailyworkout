import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Get()
  findAll(
    @Query('bodyPart') bodyPart: string,
    @Query('equipmentNames') equipmentNames: string,
  ) {
    const names = equipmentNames ? equipmentNames.split(',').map(s => s.trim()) : [];
    return this.exercisesService.findByFilter(bodyPart ?? '', names);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() dto: { name: string; bodyPart: string; equipmentName: string; repType?: 'count' | 'time' }) {
    return this.exercisesService.create(dto.name, dto.bodyPart, dto.equipmentName, dto.repType);
  }
}
