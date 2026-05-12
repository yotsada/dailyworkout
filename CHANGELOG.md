# Changelog

ไฟล์นี้บันทึกทุกการเปลี่ยนแปลงโค้ดเพื่อใช้อ้างอิงเมื่อต้องการย้อนกลับ
รูปแบบ: `## DD/MM/YYYY HH:MM — <สรุปสั้น>`

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

<!-- Template สำหรับ entry ใหม่:

## DD/MM/YYYY HH:MM — <สรุปสั้น>

**ไฟล์ที่แก้:**
- `path/to/file.ts` — อธิบายการเปลี่ยนแปลง

**สาเหตุ:** ทำไมถึงแก้

**ย้อนกลับได้โดย:** วิธี revert ถ้าจำเป็น (เช่น git revert <hash>, หรืออธิบาย logic เดิม)

-->
