# dailyworkout — Project Map

> **Rule:** Every time you modify code in this project, you MUST:
> 1. Update the relevant section(s) of this file to reflect the change.
> 2. Append an entry to `CHANGELOG.md` at the project root describing what changed, why, and which files were affected.

---

## Structure

```
dailyworkout/
├── backend/   NestJS API  (port 3000)
├── frontend/  Next.js UI  (port 3001)
└── CHANGELOG.md  code-change history (for rollback reference)
```

## Backend — NestJS + Prisma + PostgreSQL

**Run:** `cd backend && npm run start:dev`

### Modules (`backend/src/`)
| Module | Controller prefix | Notes |
|---|---|---|
| auth | `/auth` | signup, login, Google OAuth |
| profiles | `/profiles` | CRUD workout profiles |
| exercises | `/exercises` | exercise library |
| equipment | `/equipment` | equipment catalog |
| workout-logs | `/workout-logs` | daily session logs |
| admin | `/admin` | admin-only ops |
| prisma | — | singleton PrismaService |

### Auth flow
- Username/password → bcrypt + JWT
- Google OAuth → `idToken` → `google-auth-library` verify → JWT
- JWT guard: `backend/src/auth/guards/jwt-auth.guard.ts`
- JWT strategy: `backend/src/auth/strategies/jwt.strategy.ts`
- Token payload: `{ sub: userId, username }`

### Database schema (Prisma)
```
User             id(cuid), email?(unique), username?(unique), password?, googleId?(unique),
                 role(default:"user"), createdAt, updatedAt
                 → profiles[], workoutLogs[]

Profile          id(cuid), name, userId?
                 → user?, equipment(ProfileEquipment[]), days(ProfileDay[]), workoutLogs[]
                 createdAt

ProfileDay       id(cuid), profileId, day(MON/TUE/WED/THU/FRI/SAT/SUN), bodyParts(String[])
                 → profile, exercises(DayExercise[])

DayExercise      id(cuid), dayId, exerciseId, order(default:0)
                 → day, exercise, sets(ExerciseSet[])

ExerciseSet      id(cuid), dayExerciseId, setNumber, repType(count|time),
                 reps?(count only), duration?(seconds, time only), restSeconds(default:60)
                 → dayExercise

Exercise         id(cuid), name(unique), bodyPart, repType(default:"count"), equipmentId?
                 → equipment?, dayExercises[]

Equipment        id(cuid), name(unique)
                 → exercises[], profileEquipment[]

WorkoutLog       id(cuid), userId, profileId?, date(YYYY-MM-DD string),
                 isRestDay(default:false), exercisesCompleted(default:0),
                 totalExercises(default:0), exercises(Json, default:[]), createdAt
                 → user, profile?
                 @@unique([userId, profileId, date])

ProfileEquipment (profileId, equipmentId) — composite PK
                 → profile(cascade delete), equipment
```

### Env vars needed
```
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
FRONTEND_URL=http://localhost:3001
PORT=3000
```

---

## Frontend — Next.js (App Router) + Tailwind

**Run:** `cd frontend && npm run dev`

> **Warning:** Read `frontend/node_modules/next/dist/docs/` before writing Next.js code — this version may differ from training data (see `frontend/CLAUDE.md`).

### Pages (`frontend/app/`)
| Route | File | Purpose |
|---|---|---|
| `/` | `page.tsx` | Login / Signup (+ Google Sign-In) |
| `/home` | `home/page.tsx` | Dashboard / home |
| `/today` | `today/page.tsx` | Active workout session (reducer-based FSM) |
| `/profile` | `profile/page.tsx` | Manage profiles, import/export |
| `/setting` | `setting/page.tsx` | Settings |

### Key components
- `TiltButton` — custom button with 3D press effect (`app/components/TiltButton.tsx`)
- `AddProfileModal` — full modal for creating/editing workout profiles (`app/profile/AddProfileModal.tsx`)
  - Exports types: `ProfileData`, `WorkoutScheduleDay`, `WorkoutDay`, `WorkoutExercise`, `WorkoutSet`, `DAYS`, `DAY_COLORS`

### Auth / state pattern
- Token stored in `localStorage` as `token`
- User stored in `localStorage` as `user` (JSON: `{ id, username, role }`)
- Active profile stored as `localStorage.getItem('activeProfileId_<userId>')`
- All API calls use `Authorization: Bearer <token>` header
- On load: check `localStorage.token` → redirect to `/` if missing

### Today page FSM
State machine via `useReducer` with phases:
- Screen: `list` → `working` → `all_done`
- Phase: `set` → `timing` (time-based) or direct done → `rest` → next set
- Progress auto-saved to `localStorage` key: `today_done_<profileId>_<dateString>`
- Workout log POSTed to `/workout-logs` on exercise completion

### Env vars needed
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

### Styling conventions
- Tailwind utility classes + inline styles for dynamic values
- Custom fonts: `pixel-font` (large headings), `pixel-font-small` (labels)
- Color palette: red-600/700 (primary), green-600 (success), orange-500 (rest)
- Max width: `max-w-sm` (375px), centered, white card on gray background

---

## Common tasks

### Add a new API endpoint
1. Create/update service in `backend/src/<module>/<module>.service.ts`
2. Add route to `backend/src/<module>/<module>.controller.ts`
3. If new module, register in `backend/src/app.module.ts`

### Add a new frontend page
1. Create `frontend/app/<route>/page.tsx` with `'use client'` if interactive
2. Use `localStorage.getItem('token')` for auth check → redirect if null

### Run migrations
```bash
cd backend && npx prisma migrate dev --name <name>
```
> Use **session-mode pooler** URL for migrations (not transaction-mode) — see project memory.

### Regenerate Prisma client
```bash
cd backend && npx prisma generate
```

---

## Deployment

### Backend → Render
- Config file: `render.yaml` (root of repo)
- Build: `npm install && npm run build` (runs `prisma generate` + `nest build`)
- Start: `npm run start:prod` (runs `prisma db push` + `node dist/src/main`)
- Compiled output: `dist/src/main.js` (tsconfig outDir=`./dist`, source in `src/`)
- Set env vars in Render dashboard (see `backend/.env.example`)

### Frontend → Vercel
- Root directory: `frontend`
- Build: auto-detected as `next build`
- Set env vars in Vercel dashboard (see `frontend/.env.example`)
- Key: `NEXT_PUBLIC_BACKEND_URL` must point to Render service URL
