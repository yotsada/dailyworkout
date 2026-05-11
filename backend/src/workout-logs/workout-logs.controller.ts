import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkoutLogsService, ExerciseEntry } from './workout-logs.service';

interface LogBody {
  date: string;
  profileId?: string;
  isRestDay?: boolean;
  exercisesCompleted?: number;
  totalExercises?: number;
  exercises?: ExerciseEntry[];
}

@UseGuards(JwtAuthGuard)
@Controller('workout-logs')
export class WorkoutLogsController {
  constructor(private service: WorkoutLogsService) {}

  @Post()
  log(@Body() body: LogBody, @Request() req: { user: { id: string } }) {
    const { date, ...dto } = body;
    return this.service.upsert(req.user.id, date, dto);
  }

  @Get()
  find(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('profileId') profileId: string | undefined,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.findByMonth(req.user.id, Number(year), Number(month), profileId ?? null);
  }
}
