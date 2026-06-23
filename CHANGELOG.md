# Changelog

ไฟล์นี้บันทึกทุกการเปลี่ยนแปลงโค้ดเพื่อใช้อ้างอิงเมื่อต้องการย้อนกลับ
รูปแบบ: `## DD/MM/YYYY HH:MM — <สรุปสั้น>`

---

## 23/06/2026 — ลบระบบ drag-and-drop อุปกรณ์ออกจาก AddProfileModal

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`

**เหตุผล:** บนมือถือ ผู้ใช้เลื่อนดูรายการอุปกรณ์ด้านล่างไม่ได้ เพราะ pointer events ถูก intercept ไปเป็น drag แทน

**สิ่งที่ลบออก:**
- `EquipmentCardProps`: ลบ `draggable`, `onDragStart`, `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`
- `EquipmentCard`: ลบ `touchAction: none`, drag/pointer handlers
- Helper functions: ลบ `makeGhost`, `moveGhost`, `isOverZone`
- State: ลบ `equipDropActive`
- Refs: ลบ `equipDropRef`, `equipGhostRef`, `equipDragRef`
- Handlers: ลบ `handleEquipDragStart/Over/Drop`, `onEquipPD/PM/PU/PC`
- Drop zone: ลบ `ref`, `onDragOver`, `onDragLeave`, `onDrop`, เปลี่ยน static styling
- เปลี่ยน placeholder text จาก "DRAG OR TAP TO ADD" → "TAP TO ADD"

---

## 21/05/2026 — ปรับ UI AddProfileModal + today page

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`
- `frontend/app/today/page.tsx`

**AddProfileModal:**
- Schedule step: เปลี่ยนเป็น full-screen flex layout (7 วัน แบ่ง `flex:1` เท่ากัน, กดทั้งแถว, body-part chips สีตามวัน, ไอคอนดินสอ)
- Exercise picker: การ์ดแนวนอน 2 คอลัมน์ พร้อมแท็กกล้ามเนื้อ (สีแดง มุมบนซ้าย)
- Exercise detail cards: เพิ่มแท็กกล้ามเนื้อ + badge ชื่อท่า (สีแดง pixel-font) ทั้งใน workout step และ summary step
- `WorkoutExercise` interface: เพิ่ม `muscle?: string | null` เก็บ DB bodyPart ละเอียด
- `addExercise`: เก็บ `muscle: ex.bodyPart` (ชื่อกล้ามเนื้อจาก DB) แยกจาก `bodyPart` (broad category)
- เพิ่ม `MUSCLE_TO_CATEGORY` reverse map + `normalizeBP()` — normalize bodyPart ตอน load จาก initialProfile แก้ปัญหาจุดแดงค้าง
- จุดบน body-part card: เปลี่ยนสีส้ม → แดง (#dc2626), ขนาด 8→11px
- EquipmentCard text: เปลี่ยนเป็น #111827 (ดำ)

**Today page:**
- รูป: `width: 100%` เต็มความกว้าง ไม่มี maxWidth
- ชื่อท่า: ย้ายใต้รูป สีดำ
- เอา SetDots ออกจากการ์ด
- BackBtn: คืนไปที่ header บนซ้าย
- ปุ่ม DONE: `position: fixed` กึ่งกลางด้านล่าง (`bottom: max(64px, env(safe-area-inset-bottom))`)
- Content: `justifyContent: flex-start` + `paddingTop: 8` (ชิดบน)
- การ์ดตัวเลข: padding ลด (`16px 24px 20px`), font `5rem`, shadow `4px`

---

## 21/05/2026 — แยก Legs/ท่ากล้ามเนื้อออกจาก Cardio ใน exercise filter

**ไฟล์ที่แก้:**
- `backend/src/exercises/exercises.service.ts`

**สิ่งที่เปลี่ยน:**
- เพิ่ม `repType: { not: 'time' }` ใน bodyPart-based filter — ป้องกันท่า cardio (running, cycling ฯลฯ) ที่มี leg muscle ปนมาใน Legs/Chest/Back/ฯลฯ
- Cardio query ยังใช้ `repType = 'time'` เหมือนเดิม → ทั้งสองหมวดไม่ซ้อนกันแล้ว

---

## 20/05/2026 — exercise picker: 2 คอลัมน์แนวนอน + คืน EquipmentCard เดิม

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`

**สิ่งที่เปลี่ยน:**
- คืน `EquipmentCard` (อุปกรณ์ + body part) ให้เป็น square เดิมพร้อม `ImagePlaceholderIcon`
- Exercise picker grid เปลี่ยนเป็น 2 คอลัมน์ (จาก 4) ใช้การ์ดแนวนอน `minHeight: 60px` text-only ไม่มี icon
- Skeleton exercise picker ปรับเป็น 2 คอลัมน์ height 60px

---

## 20/05/2026 — ปรับ EquipmentCard เป็น portrait text-only + เปลี่ยน exercise picker ใช้ chip แทน drop zone

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`

**สิ่งที่เปลี่ยน:**
- ลบ `ImagePlaceholderIcon` SVG ออกจาก `EquipmentCard`
- การ์ดเปลี่ยนเป็น portrait (`aspectRatio: '1 / 2'`) แสดงแค่ข้อความตรงกลาง font 0.6rem พร้อม word-wrap
- Exercise picker popup: ลบ drop zone + drag-and-drop ออก เปลี่ยนเป็น chip/badge ของท่าที่เลือกแล้ว (กด × เพื่อลบ)
- ลบ `exerciseDropActive`, `exerciseDropRef`, `exPickerDragRef`, `exPickerGhostRef`, และ handler ทั้งหมดที่ไม่ใช้แล้ว
- Skeleton loader อัปเดตเป็น `CARD_SIZE * 2` ให้ตรงกับความสูงใหม่

---

## 20/05/2026 — แก้ exercise filter + dedup equipment + reset exercise library

**ไฟล์ที่แก้/สร้าง:**
- `backend/src/exercises/exercises.service.ts` — เพิ่ม `BODY_PART_MAP` แปลง broad category (Chest/Back/Legs/Arms/Core/Cardio) → specific bodyPart values ใน DB; แก้ body-weight filter (`equipmentId = null` แทนชื่อ "Body"); case-insensitive matching
- `backend/prisma/dedup-equipment.ts` — merge equipment ที่ซ้ำ case (Dumbbell→dumbbell ฯลฯ) 4 คู่
- `backend/prisma/reset-exercises.ts` — ลบ Exercise/DayExercise/ExerciseSet ทั้งหมดแล้ว seed ใหม่สะอาด
- `backend/package.json` — เพิ่ม `dedup:equipment` + `reset:exercises` scripts
- `frontend/app/today/page.tsx` — แก้ bug `ExerciseFlipImage`: track frame0/frame1 แยกกัน ป้องกัน hasError เมื่อแค่ frame เดียว fail

**เหตุผล:** ท่าทางไม่แสดงใน picker เพราะ bodyPart case mismatch และ equipment filter ไม่รองรับ body-weight

---

## 20/05/2026 — Seed exercises (~860 ท่า) + รูป 2 เฟรมวนใน today page

**ไฟล์ที่แก้/สร้าง:**
- `backend/prisma/schema.prisma` — เพิ่ม `externalId String? @unique` ใน `Exercise`
- `backend/prisma/seed-exercises.ts` — seed script ดึง JSON จาก yuhonas/free-exercise-db, upsert Equipment + Exercise, idempotent
- `backend/tsconfig.seed.json` — tsconfig override สำหรับรัน seed ด้วย ts-node (CommonJS mode)
- `backend/package.json` — เพิ่ม script `seed:exercises`
- `frontend/app/lib/exerciseImages.ts` — helper `getExerciseImageUrl(externalId, frame)`
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม `externalId?` ใน `WorkoutExercise` interface
- `frontend/app/today/page.tsx` — map `externalId` จาก API, เพิ่ม `ExerciseFlipImage` component วนรูป 0.jpg/1.jpg ทุก 700ms

**เหตุผล:** เพิ่มรูปภาพท่าออกกำลังกายจาก free-exercise-db (public domain) แสดงในหน้า today เป็น animation 2 เฟรม
**ผลลัพธ์:** 860 created, 13 updated (match ชื่อที่มีอยู่แล้ว), 0 skipped
**ข้อมูล:** yuhonas/free-exercise-db — Public Domain

---

## 20/05/2026 — เพิ่ม Settings ครบชุด: account, workout, data

**ไฟล์ที่แก้:**
- `backend/src/auth/auth.service.ts` — เพิ่ม `changePassword()` และ `changeUsername()`; import `BadRequestException`
- `backend/src/auth/auth.controller.ts` — เพิ่ม `PATCH /auth/change-password` และ `PATCH /auth/change-username` (ต้องใช้ JWT)
- `frontend/app/setting/page.tsx` — เพิ่ม modal เปลี่ยน username/password, toggle sound/auto-start, stepper default rest, ปุ่ม export CSV, ปุ่ม clear today's progress; export `SETTING_KEYS` และ `loadWorkoutSettings()`
- `frontend/app/today/page.tsx` — เพิ่ม phase `rest_pending`, อ่าน `autoStartRest`/`sound` จาก localStorage, เล่น beep ด้วย Web Audio API, ปุ่ม START REST เมื่อปิด auto-start
- `frontend/app/profile/AddProfileModal.tsx` — `addExercise` อ่าน `setting_defaultRest` จาก localStorage แทน hardcode 60

**เหตุผล:** เพิ่ม settings ที่มีประโยชน์จริง — เปลี่ยน account info, ปรับพฤติกรรมออกกำลังกาย, export/clear ข้อมูล

---

## 20/05/2026 — เปลี่ยน AddProfileModal เป็น full-screen overlay

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — ลบ outer wrapper (`fixed inset-0 flex items-end sm:items-center`) และ backdrop ออก, เปลี่ยนเป็น `fixed inset-0 z-50 bg-white` เต็มหน้าจอตรงๆ

---

## 20/05/2026 — Summary step: group ท่าตาม body part + ลบ day header ใน workout step

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — Summary: เปลี่ยนจาก flat list เป็น group ตาม `ex.bodyPart` พร้อม label สี `c.side` ของวัน; Workout: ลบ day header + "Rest day — no exercises" ออก; Backdrop: เปลี่ยน `onClick={onClose}` → `onClick={handleClose}` เพื่อให้ถาม save draft ก่อนปิด

---

## 20/05/2026 — รองรับ draft หลายรายการ (multi-draft) พร้อม close confirmation popup

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม `draftId` ใน `ProfileDraft` type; เพิ่ม state `draftId` (ใช้ crypto.randomUUID) และ `showCloseConfirm`; แก้ `handleClose` ให้แสดง popup ยืนยันก่อนแทนที่จะ auto-save; เพิ่ม `saveDraftAndClose`; เพิ่ม close confirmation popup (CANCEL / DISCARD / SAVE) ที่ zIndex 30
- `frontend/app/profile/page.tsx` — เปลี่ยน `DRAFT_KEY` เป็น `'profile_drafts'`; แทน state `draft/showDraftEdit/showDraftDiscard` ด้วย `drafts[]`, `editingDraft`, `discardingDraft`; อัปเดต useEffect ให้ migrate จาก format เก่า (single object → array); แก้ `saveDraft` ให้ upsert ตาม draftId; แก้ `discardDraft` ให้รับ draftId; แก้ `handleSave`, draft card, discard popup, และ modal render ทั้งหมดให้ใช้ structure ใหม่

---

## 20/05/2026 — เปลี่ยน body part picker popup เป็น grid การ์ดเหมือนอุปกรณ์

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — แทน list checkbox ด้วย grid 4 คอลัมน์ของ EquipmentCard; active=true เมื่อเลือกแล้ว

---

## 20/05/2026 — ปรับ layout แถววันใน Schedule step ให้สมมาตร

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — แต่ละแถววันเป็น card (padding + border + borderRadius), โครงสร้าง 3 คอลัมน์ชัดเจน: badge ซ้าย | chip กลาง (flex:1) | ปุ่ม + ขวา (fixed); ปุ่ม + ไม่ wrap ตามเนื้อหาอีกต่อไป

---

## 20/05/2026 — เปลี่ยน Step 2 (Schedule) เป็น layout แนวตั้ง + popup เลือก body part

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — ลบ DayWheelH + drag-and-drop body part ออก, เปลี่ยนเป็นแสดง 7 วันแนวตั้ง (เหมือนหน้าสรุป), ท้ายแต่ละวันมีปุ่ม "+" เปิด popup ติ๊กเลือก body part ด้วย colored checkbox; ลบ state: `wheelDayIdx`, `bodyDropActive`; ลบ refs และ handlers ที่เกี่ยวกับ body drag; เพิ่ม state `editingDay`

---

## 19/05/2026 — เปลี่ยนปุ่มลบ draft เป็นถังขยะ + confirm popup

**ไฟล์ที่แก้:**
- `frontend/app/profile/page.tsx` — ปุ่ม × บน draft card เปลี่ยนเป็น trash icon, เพิ่ม `showDraftDiscard` state, popup ยืนยันก่อน discard

---

## 19/05/2026 — บันทึก draft อัตโนมัติเมื่อปิด AddProfileModal กลางคัน

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม `ProfileDraft` type, `onDraft` prop, `handleClose` ที่ save state ลง localStorage เมื่อกด X (เฉพาะเมื่อมีการแก้ไข); อัพเดท `initialStep` type ให้รวม `'schedule'`
- `frontend/app/profile/page.tsx` — เพิ่ม `draft` state, โหลดจาก `localStorage` key `profile_draft`, แสดง draft card พร้อม `(draft)` สีแดง, เปิด modal ต่อจาก step ที่ค้างไว้, ล้าง draft เมื่อ save สำเร็จ

---

## 19/05/2026 — ใส่สีวันให้ปุ่ม −/+ และ label ใน summary step

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม `adjBtnColored` helper; ปุ่ม −/+, label SETS/REPS/REST และตัวเลขใน summary card ใช้สีจาก `DAY_COLORS[di]`

---

## 19/05/2026 — ใส่สีวันให้กรอบท่าใน summary step

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — กรอบ card และ header ของแต่ละท่าใน summary step ใช้สีจาก `DAY_COLORS[di]` (border, light bg, text color)

---

## 19/05/2026 — ลบ progress bar และ doneCount/total ออกจากหน้า today

**ไฟล์ที่แก้:**
- `frontend/app/today/page.tsx` — ลบ `doneCount`, `pct` variables และ UI ส่วน progress bar + `0/N` counter

---

## 19/05/2026 — ยกเลิก tutorial overlay หน้า home (revert)

**ไฟล์ที่แก้:**
- `frontend/app/home/page.tsx` — ลบ `HomeTutorial`, `TUTORIAL_STEPS`, refs, `showTutorial` state ออกทั้งหมด คืนสถานะเดิม

---

## 19/05/2026 — เปลี่ยน background สีแดงโทนปุ่มทุกหน้า

**ไฟล์ที่แก้:**
- `frontend/app/globals.css` — `--background` จาก `#7f1d1d` → `#dc2626`
- `frontend/app/layout.tsx` — `theme-color` จาก `#7f1d1d` → `#dc2626`
- `frontend/app/page.tsx`, `home/page.tsx`, `setting/page.tsx`, `profile/page.tsx` — outer wrapper จาก `bg-white` → `bg-red-600`
- `frontend/app/today/page.tsx` — inline background จาก `#f9fafb`/`#f0fdf4` → `#dc2626`

**สาเหตุ:** ผู้ใช้ต้องการพื้นหลังซ้าย-ขวา (นอก card) เป็นสีแดงโทนเดียวกับปุ่ม

---

## 19/05/2026 — ปรับ UI การจัดการท่าใน workout/summary step

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — แทนที่ per-set rows ด้วย 3-column control (SETS / REPS หรือ SEC / REST) ต่อท่า; ลบ `addSet`, `removeSet`, `toggleRepType`, `adjustReps`, `adjustRest`; เพิ่ม `changeSetCount`, `adjustAllReps`, `adjustAllRest`

**สาเหตุ:** ผู้ใช้ต้องการ UI ที่เรียบง่ายขึ้น — กำหนดจำนวน set ด้วย stepper, แสดง label REPS/SEC ตาม type ของท่า, ไม่ต้องกด "+ Set" ทีละ set

---

## 19/05/2026 — แสดงชื่อวันเต็มใน DayWheelH

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เปลี่ยน `SLOT_W` จาก 72 → 96 และเปลี่ยน `DAYS[dayIdx]` เป็น `FULL_DAY[DAYS[dayIdx]]` ใน DayWheelH พร้อมปรับ font size ให้พอดีชื่อยาว

**สาเหตุ:** ผู้ใช้ต้องการให้ wheel แสดงชื่อวันเต็ม (Monday, Tuesday, ...) แทนตัวย่อ

---

## 19/05/2026 — ลบ body part ค่าเริ่มต้นใน schedule drop zone

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เปลี่ยน default state ของ `schedule` จาก `{ MON: ['Chest', 'Arms'], WED: ['Back'], FRI: ['Legs'] }` เป็น `{}` เพื่อให้ drop zone เริ่มต้นเปล่า

**สาเหตุ:** ผู้ใช้ต้องการให้หน้า schedule เริ่มโดยไม่มี body part ถูกเลือกไว้ล่วงหน้า

---

## 12/05/2026 — Init changelog + update CLAUDE.md

**ไฟล์ที่แก้:**
- `CLAUDE.md` — เพิ่ม rule บังคับอัปเดต CLAUDE.md และ CHANGELOG.md ทุกครั้งที่แก้โค้ด; อัปเดต schema ให้ครบ (createdAt/updatedAt, unique constraints, relations)
- `CHANGELOG.md` — สร้างใหม่

**สาเหตุ:** ตั้ง convention การบันทึก history เพื่อให้ย้อนโค้ดได้

---

## 12/05/2026 — Prepare project for deployment

**ไฟล์ที่แก้:**
- `backend/package.json` — แก้ `start:prod` จาก `node dist/main` → `node dist/src/main` (tsconfig outDir=./dist + source ใน src/ → compiled ไปที่ dist/src/)
- `backend/.env.example` — สร้างใหม่ (ถูกลบไปก่อนหน้า) บันทึก env vars ทั้งหมดที่ต้องตั้งค่าบน Render
- `frontend/.env.example` — สร้างใหม่ (ถูกลบไปก่อนหน้า)
- `frontend/app/profile/page.tsx:452` — แก้ TypeScript error: cast `repType` เป็น `'time' | 'count'` ใน toggleType function
- `render.yaml` — สร้างใหม่ สำหรับ Render auto-deploy (rootDir: backend, build/start commands)

**สาเหตุ:** เตรียม deploy Backend → Render, Frontend → Vercel; แก้ bug path ที่จะทำให้ start:prod crash ตอน production

**ย้อนกลับได้โดย:**
- `start:prod`: กลับเป็น `node dist/main` ถ้าเปลี่ยน tsconfig outDir เป็น `./dist` โดยไม่มี rootDir
- TypeScript fix: ลบ `as 'time' | 'count'` แล้วใช้ `satisfies` แทนหรือ ignore ด้วย `// @ts-ignore`

---

## 18/05/2026 — Exercise picker เปลี่ยนเป็น popup พร้อมช่องค้นหาและการ์ด

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม state `exerciseSearch`, useMemo `filteredBpExercises`; เปลี่ยน exercise picker จาก inline pill buttons เป็น popup overlay แบบ full-panel ที่มี: header + back button, ช่องค้นหา, exercise cards grid (4 col), ปุ่มตกลง; exercise cards toggle add/remove ได้; workout step div ได้รับ `position:relative` สำหรับ popup

**สาเหตุ:** UX ดีขึ้น — เลือกท่าทางได้หลายท่าพร้อมกันก่อนกด ตกลง แทนที่จะเพิ่มทีละตัว

**ย้อนกลับได้โดย:** คืน inline `{activeBP && (<div>...pills...</div>)}` ใน workout step และลบ popup overlay

---

## 18/05/2026 — เปลี่ยน body part ใน schedule/workout step เป็นการ์ดสี่เหลี่ยม

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — 2 จุด:
  1. Schedule step drop zone: เปลี่ยน selected body parts จาก pill button → `EquipmentCard` grid (4 คอลัมน์) พร้อม × remove button
  2. Workout step: เปลี่ยน body part filter จาก pill button → `EquipmentCard` grid คงไว้ orange dot indicator สำหรับ missing parts

**สาเหตุ:** UI ไม่ consistent — ตัวเลือกใน picker แสดงเป็นการ์ด แต่พอเลือกแล้วแสดงเป็น pill text

**ย้อนกลับได้โดย:** คืน pill button style ที่ lines 1050-1076 และ 1150-1178 (ดู git diff)

---

## 18/05/2026 — เพิ่ม drag-out จาก drop zone และแยก exercise picker เป็น drop zone + picker grid

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม 5 ส่วน:
  1. **State** `exerciseDropActive` — ควบคุม highlight ของ exercise drop zone
  2. **Refs** 5 ตัว — `dropZoneDragRef/Ghost` (body part drag-out), `exerciseDropRef` (exercise drop zone container), `exPickerDragRef/Ghost` (picker drag), `exDropZoneDragRef/Ghost` (drop zone drag-out)
  3. **Handlers** 3 กลุ่ม — `onDropZonePD/PM/PU/PC` (ลาก body part ออกจาก drop zone เพื่อลบ), `handleExerciseDragOver/Drop + onExPickerPD/PM/PU/PC` (ลากจาก picker → drop zone), `onExDropZonePD/PM/PU/PC` (ลากจาก drop zone ออกเพื่อลบ)
  4. **Schedule step** — body part cards ใน drop zone เปลี่ยนเป็น draggable พร้อม `onDropZone*` pointer handlers แทน `onRemove`
  5. **Exercise popup** — แทนที่ exercise cards grid เดิมด้วย 2 zone แยกกัน: (a) selected exercises drop zone ด้านบนที่มี `ref={exerciseDropRef}` รองรับ drag & touch เพื่อ add/remove, (b) picker grid ด้านล่างที่ unselected cards draggable + touch drag, selected cards `dimmed`

**สาเหตุ:** UX สมมาตร — ผู้ใช้ลากเพิ่ม/ลบได้ทั้ง mouse drag และ touch บนทุก zone ไม่ต้องกดปุ่ม ×

**ย้อนกลับได้โดย:** `git revert` หรือคืน `onRemove` prop ใน body part cards และคืน exercise cards grid เดิม (ดู git diff)

---

## 18/05/2026 — Equipment drop zone: tap to remove + drag-out support

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — equipment step drop zone:
  1. เพิ่ม refs `equipDZDragRef/Ghost` สำหรับ drag-out
  2. เพิ่ม handlers `onEquipDZPD/PM/PU/PC` — ลากการ์ดออกจาก drop zone → `removeEquip(id)`
  3. Drop zone cards เปลี่ยนจาก `onRemove` → `onClick` + draggable + pointer event handlers

**สาเหตุ:** ทำให้ consistent กับ body part drop zone และ exercise popup

**ย้อนกลับได้โดย:** คืน `onRemove={() => removeEquip(id)}` และลบ handlers/refs ที่เพิ่ม

---

## 18/05/2026 — แก้ขอบแดงโผล่ข้างซ้ายขวาบนมือถือบางรุ่น

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — เพิ่ม `overflow-hidden` ใน modal container class + ลบ `borderRadius: 'inherit'` ออกจาก exercise picker popup

**สาเหตุ:** `overflow: hidden` บน parent ที่มี border-radius ทำให้ child elements ถูก clip อยู่ภายในมุมโค้ง บน device บางรุ่นที่ไม่รองรับ `borderRadius: inherit` ทำให้ขอบแดงของ EquipmentCard ใน popup โผล่ออกมาจากมุมโค้งของ modal

**ย้อนกลับได้โดย:** ลบ `overflow-hidden` และคืน `borderRadius: 'inherit'` ใน popup div

---

## 18/05/2026 — แก้ขอบแดงทุกหน้าบนมือถือ (ยกเว้น today)

**ไฟล์ที่แก้:**
- `frontend/app/home/page.tsx` — เพิ่ม `bg-white` ใน outer div (แก้ไปแล้วรอบก่อน)
- `frontend/app/page.tsx:150` — เพิ่ม `bg-white` ใน outer `min-h-screen flex justify-center`
- `frontend/app/setting/page.tsx:242` — เพิ่ม `bg-white` ใน outer div
- `frontend/app/profile/page.tsx:687,766` — เพิ่ม `bg-white` ใน outer div (ทั้งสอง return branch)

**สาเหตุ:** `globals.css` ตั้ง `--background: #7f1d1d` → body สีแดงเข้ม บนมือถือที่กว้างกว่า `max-w-sm` (384px) จะเห็นสีแดงโผล่ข้างซ้ายขวา ต้องใส่ `bg-white` บน outer container ทุกหน้าเพื่อทับสี body (`today/page.tsx` ไม่ต้องแก้เพราะใช้ `style={{ background: '#f9fafb' }}` อยู่แล้ว)

**ย้อนกลับได้โดย:** ลบ `bg-white` ออกจาก outer div ทั้ง 4 ไฟล์

---

## 18/05/2026 — แสดงชื่อ user ใน setting page เหนือปุ่ม logout

**ไฟล์ที่แก้:**
- `frontend/app/setting/page.tsx` — เพิ่ม state `username`, อ่านจาก `localStorage.user.username`; เพิ่ม user card (avatar + ชื่อ) เหนือปุ่ม LOGOUT พร้อม `flex-1` เพื่อดัน section ลงด้านล่าง

**สาเหตุ:** ต้องการให้ user เห็นชื่อตัวเองในหน้า setting ก่อน logout

**ย้อนกลับได้โดย:** ลบ state `username`, setUsername call, `<div className="flex-1" />` และ user card div ออก

---

## 18/05/2026 — Responsive layout: content เต็มหน้าจอมือถือ

**ไฟล์ที่แก้:**
- `frontend/app/page.tsx:151` — `max-w-sm` → `sm:max-w-sm`
- `frontend/app/home/page.tsx:394` — `max-w-sm` → `sm:max-w-sm`
- `frontend/app/setting/page.tsx:243` — `max-w-sm` → `sm:max-w-sm`
- `frontend/app/profile/page.tsx:688,767` — `max-w-sm` → `sm:max-w-sm` (ทั้งสอง return branch)
- `frontend/app/today/page.tsx:223,252,270,409` — `max-w-sm` → `sm:max-w-sm` (ทุก return)

**สาเหตุ:** บนมือถือที่กว้างกว่า 384px (max-w-sm) เช่น iPhone 14 Pro (390px) จะเห็นช่องว่างข้างซ้ายขวา; เปลี่ยนเป็น `sm:max-w-sm` ทำให้ mobile เต็ม 100% viewport width ส่วน desktop (≥640px) ยังคง cap ที่ 384px และ center ไว้

**ย้อนกลับได้โดย:** เปลี่ยน `sm:max-w-sm` → `max-w-sm` ทุกที่ (ยกเว้น modal div ใน profile/page.tsx ที่ไม่ได้แก้)

---

## 18/05/2026 — Exercise drop zone: fixed 1 แถว + scroll แนวตั้ง

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx` — exercise popup selected drop zone: เปลี่ยนจาก `minHeight: 88` → `height: CARD_SIZE + 16` (= 90px, 1 แถวพอดี) + เพิ่ม `overflowY: 'auto'` เพื่อให้ scroll ดูการ์ดที่เลือกได้โดยไม่ดัน picker grid ด้านล่าง

**สาเหตุ:** เลือกท่าทางเยอะๆ drop zone โตขึ้นดัน picker grid ลงล่าง; fix height ทำให้ layout คงที่

**ย้อนกลับได้โดย:** เปลี่ยน `height: CARD_SIZE + 16` กลับเป็น `minHeight: 88` และลบ `overflowY: 'auto'`

---

## 18/05/2026 — Drop zones fixed height + แปลภาษาไทยเป็นอังกฤษ

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`:
  1. Equipment drop zone: `minHeight: 96` → `height: CARD_SIZE + 20` (94px, 1 แถวพอดีกับ border-box) + `overflowY: 'auto'` + `alignContent: 'start'`
  2. Body part schedule drop zone: ลบ `minHeight: 96` จาก outer div + ห่อ grid ด้วย inner div `height: CARD_SIZE + 8` + `overflowY: 'auto'` (header ยังอยู่นอก scroll zone)
  3. Exercise popup drop zone: แก้ `height: CARD_SIZE + 16` → `CARD_SIZE + 20` (คำนวณ border-box ถูกต้อง)
  4. Thai → English: `ค้นหาท่าทาง...` → `Search...`, `ลากหรือกดท่าทางมาวางที่นี่` → `Tap or drag to add`, `ไม่พบท่าทาง` → `No exercises found`, `ตกลง` → `DONE`

**สาเหตุ:** drop zone โตตามจำนวนการ์ดดันตัวเลือกด้านล่าง; height คงที่ + scroll แก้ปัญหา

**ย้อนกลับได้โดย:** คืน `minHeight: 96` ทุก zone และลบ `overflowY: 'auto'`

---

## 18/05/2026 — ขยาย drop zone height ให้เห็นการ์ดครบ

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`:
  - Equipment drop zone: `CARD_SIZE + 20` → `CARD_SIZE + 40` (114px)
  - Body part inner wrapper: `CARD_SIZE + 8` → `CARD_SIZE + 28` (102px)
  - Exercise popup drop zone: `CARD_SIZE + 20` → `CARD_SIZE + 40` (114px)

**สาเหตุ:** `EquipmentCard` มี `aspectRatio: 1/1` ดังนั้น card สูงตามความกว้าง column — บนมือถือ full-width จอกว้าง card จะสูงมากกว่า CARD_SIZE (74px) ทำให้ drop zone ตัดครึ่งการ์ด; เพิ่ม content area จาก 74px → 94px รองรับโทรศัพท์กว้างถึง ~455px

**ย้อนกลับได้โดย:** เปลี่ยน +40 กลับเป็น +20 และ +28 กลับเป็น +8

---

## 18/05/2026 — Schedule step: ลบ "My week" + header ใน drop zone, เปลี่ยน Clear เป็นไอคอนไม้กวาด

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`:
  - ลบ `<span>My week</span>` ออก
  - ลบ header div (ชื่อวัน + จำนวน part) ออกจากภายใน body part drop zone
  - เปลี่ยนปุ่ม Clear (text) → SVG broom icon, เหลือแค่ icon ชิดขวา

**สาเหตุ:** ลด visual clutter ใน schedule step

**ย้อนกลับได้โดย:** คืน `<span>My week</span>` และ header div ภายใน drop zone

---

## 18/05/2026 — ลบ drag-out จาก drop zones ทั้งหมด + แก้ scroll บนมือถือ

**ไฟล์ที่แก้:**
- `frontend/app/profile/AddProfileModal.tsx`:
  - ลบ refs: `equipDZDragRef/GhostRef`, `dropZoneDragRef/GhostRef`, `exDropZoneDragRef/GhostRef`
  - ลบ handler functions: `onEquipDZPD/PM/PU/PC`, `onDropZonePD/PM/PU/PC`, `onExDropZonePD/PM/PU/PC`
  - ลบ `draggable`, `onDragStart`, `onPointerDown/Move/Up/Cancel` จาก cards ใน drop zones ทั้ง 3 จุด (equipment, body parts, exercises)
  - เหลือแค่ `onClick` สำหรับลบการ์ดออกจาก drop zone

**สาเหตุ:** `setPointerCapture` ที่ถูกเรียกใน `onPointerDown` ของ drop zone cards ดัก touch event ทันที ทำให้ scroll gesture ทำงานไม่ได้บนมือถือ; ผู้ใช้ต้องการให้กดเพื่อลบอย่างเดียว

**ย้อนกลับได้โดย:** คืน refs, handlers, และ props ที่ลบออก (ดู git diff)

---

<!-- Template สำหรับ entry ใหม่:

## DD/MM/YYYY HH:MM — <สรุปสั้น>

**ไฟล์ที่แก้:**
- `path/to/file.ts` — อธิบายการเปลี่ยนแปลง

**สาเหตุ:** ทำไมถึงแก้

**ย้อนกลับได้โดย:** วิธี revert ถ้าจำเป็น (เช่น git revert <hash>, หรืออธิบาย logic เดิม)

-->
