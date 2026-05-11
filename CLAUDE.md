# dailyworkout — Project Map

## Structure

```
dailyworkout/
├── backend/   NestJS API  (port 3000)
└── frontend/  Next.js UI  (port 3001)
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
User          id, email, username, password?, googleId?, role
Profile       id, name, userId — has days (ProfileDay[])
ProfileDay    id, profileId, day (MON/TUE/…), bodyParts[], exercises (DayExercise[])
DayExercise   id, dayId, exerciseId, order — has sets (ExerciseSet[])
ExerciseSet   id, dayExerciseId, setNumber, repType(count|time), reps?, duration?, restSeconds
Exercise      id, name, bodyPart, repType, equipmentId?
Equipment     id, name
WorkoutLog    id, userId, profileId?, date(YYYY-MM-DD), isRestDay, exercisesCompleted, totalExercises, exercises(JSON)
ProfileEquipment  (profileId, equipmentId) composite PK
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
