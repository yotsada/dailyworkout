import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ExercisesModule } from './exercises/exercises.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AdminModule } from './admin/admin.module';
import { WorkoutLogsModule } from './workout-logs/workout-logs.module';

@Module({
  imports: [PrismaModule, AuthModule, EquipmentModule, ExercisesModule, ProfilesModule, AdminModule, WorkoutLogsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
