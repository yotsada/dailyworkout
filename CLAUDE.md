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

Exercise         id(cuid), externalId?(unique), name(unique), bodyPart, repType(default:"count"), equipmentId?
                 → equipment?, dayExercises[]
                 externalId = free-exercise-db id (e.g. "Alternate_Incline_Dumbbell_Curl"); null for custom exercises

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
  - `WorkoutExercise` fields: `exerciseId`, `exerciseName`, `bodyPart` (broad category), `muscle` (DB muscle name), `externalId`, `sets`

### AddProfileModal — steps & UX
| Step | UI |
|---|---|
| equipment | 4-col grid ของ `EquipmentCard` (square, icon+label), drag/tap เพิ่มอุปกรณ์เข้า drop zone |
| schedule | 7 แถวเต็มจอ (`flex:1` ต่อวัน) กดทั้งแถวเพื่อเปิด body-part picker |
| workout | Horizontal day wheel + body-part filter cards + exercise picker popup (2-col grid) |
| summary | รายการท่าทุกวัน แก้ sets/reps/rest ได้ |

**Exercise picker popup:**
- แสดงท่า 2 คอลัมน์ พร้อมแท็กกล้ามเนื้อ (สีแดง มุมบนซ้าย)
- ท่าที่เลือกแล้วแสดงเป็น chip ด้านบน กด × เพื่อลบ
- `bodyPart` ที่เก็บ = broad category (`activeBP`) เพื่อ match กับ schedule
- `muscle` ที่เก็บ = ชื่อกล้ามเนื้อละเอียดจาก DB (เช่น `"biceps"`)
- `normalizeBP()` + `MUSCLE_TO_CATEGORY` map ใช้ normalize ตอน load จาก initialProfile

**bodyPart normalization:**
```ts
MUSCLE_TO_CATEGORY = {
  chest→Chest, lats/middle back/lower back/traps/neck→Back,
  quadriceps/hamstrings/glutes/calves/adductors/abductors→Legs,
  shoulders→Shoulders, biceps/triceps/forearms→Arms,
  abdominals/hip flexors→Core
}
```

### Auth / state pattern
- Token stored in `localStorage` as `token`
- User stored in `localStorage` as `user` (JSON: `{ id, username, role }`)
- Active profile stored as `localStorage.getItem('activeProfileId_<userId>')`
- All API calls use `Authorization: Bearer <token>` header
- On load: check `localStorage.token` → redirect to `/` if missing

### Today page FSM
State machine via `useReducer` with phases:
- Screen: `list` → `working` → `all_done`
- Phase: `set` → `timing` (time-based) or direct done → `rest`/`rest_pending` → next set
- Progress auto-saved to `localStorage` key: `today_done_<profileId>_<dateString>`
- Workout log POSTed to `/workout-logs` on exercise completion

**Today page layout (working screen):**
- Header: BackBtn (ซ้าย)
- รูป 2 เฟรม (`ExerciseFlipImage`) เต็มความกว้าง
- ชื่อท่า (ใต้รูป, สีดำ)
- การ์ดตัวเลข reps/timer (padding กระชับ)
- ปุ่ม DONE: `position: fixed` กึ่งกลางด้านล่าง

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

### Seed exercise library (873 exercises from free-exercise-db)
```bash
cd backend && npm run seed:exercises    # upsert by externalId (idempotent)
cd backend && npm run reset:exercises   # ลบทั้งหมด + seed ใหม่สะอาด
cd backend && npm run dedup:equipment   # merge equipment ซ้ำ (case-insensitive)
```
- ปัจจุบัน: 873 ท่า (736 count + 137 time), 18 equipment
- Cardio filter (`repType=time`) แยกจาก muscle-based filter ด้วย `repType: { not: 'time' }`
- Images: GitHub raw CDN `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{externalId}/{0|1}.jpg`
- Helper: `frontend/app/lib/exerciseImages.ts` → `getExerciseImageUrl(externalId, frame)`

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
