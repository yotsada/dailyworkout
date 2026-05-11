export class WorkoutSetDto {
  setNumber: number;
  repType: string;   // 'count' | 'time'
  reps?: number;     // used when repType = 'count'
  duration?: number; // seconds, used when repType = 'time'
  restSeconds: number;
}

export class WorkoutExerciseDto {
  exerciseId: string;
  sets: WorkoutSetDto[];
}

export class WorkoutDayDto {
  day: string;
  exercises: WorkoutExerciseDto[];
}

export class ScheduleDayDto {
  day: string;
  bodyParts: string[];
}

export class CreateProfileDto {
  name: string;
  equipment: string[];
  schedule: ScheduleDayDto[];
  workout: WorkoutDayDto[];
}
