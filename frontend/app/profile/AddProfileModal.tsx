'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 100 100" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="10" width="80" height="80" rx="14" />
      <circle cx="34" cy="34" r="9" />
      <polyline points="10,70 32,48 52,62 68,44 90,70" />
    </svg>
  );
}

interface EquipmentItem {
  id: string;
  name: string;
}

interface ExerciseItem {
  id: string;
  name: string;
  bodyPart: string;
  repType?: 'count' | 'time';
  equipment?: { id: string; name: string } | null;
}

const CARD_SIZE = 74;

interface EquipmentCardProps {
  label: string;
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

function EquipmentCard({
  label, active = false, dimmed = false,
  onClick, onRemove,
}: EquipmentCardProps) {
  return (
    <div style={{ position: 'relative', width: '100%', opacity: dimmed ? 0.35 : 1, userSelect: 'none', minWidth: 0 }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          padding: 8, borderRadius: 12,
          border: `2px solid ${active ? '#dc2626' : '#e5e7eb'}`,
          background: active ? '#fef2f2' : '#f9fafb',
          color: '#111827',
          cursor: onClick ? 'pointer' : 'default',
          minHeight: CARD_SIZE, width: '100%', aspectRatio: '1 / 1',
          boxSizing: 'border-box', gap: 4,
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ImagePlaceholderIcon />
        </div>
        <span className="pixel-font-small text-center leading-tight" style={{ fontSize: '0.4rem' }}>{label}</span>
      </div>
      {onRemove && (
        <button
          type="button" onClick={onRemove}
          style={{
            position: 'absolute', top: -6, right: -6, width: 20, height: 20,
            borderRadius: '50%', background: '#dc2626', border: 'none', color: 'white',
            fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >×</button>
      )}
    </div>
  );
}

export interface WorkoutSet {
  repType: 'count' | 'time';
  reps: number;
  restSeconds: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  bodyPart?: string;
  muscle?: string | null;
  externalId?: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutDay {
  day: string;
  exercises: WorkoutExercise[];
}

export interface ProfileData {
  name: string;
  equipment: string[];
  schedule?: WorkoutScheduleDay[];
  workout?: WorkoutDay[];
}

export interface WorkoutScheduleDay {
  day: string;
  bodyParts: string[];
}

export interface ProfileDraft extends ProfileData { step: string; draftId: string; }

interface AddProfileModalProps {
  onClose: () => void;
  onSave: (profile: ProfileData) => void;
  onDraft?: (draft: ProfileDraft) => void;
  profileCount: number;
  initialProfile?: ProfileData;
  initialStep?: 'equipment' | 'schedule' | 'workout' | 'summary';
}

// ── Schedule step constants ────────────────────────────────────────────────

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const FULL_DAY: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};
const BODY_PARTS      = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
const BODY_PARTS_GRID = ['Rest', ...BODY_PARTS];

const MUSCLE_TO_CATEGORY: Record<string, string> = {
  'chest': 'Chest',
  'middle back': 'Back', 'lats': 'Back', 'lower back': 'Back', 'traps': 'Back', 'neck': 'Back',
  'quadriceps': 'Legs', 'hamstrings': 'Legs', 'glutes': 'Legs', 'calves': 'Legs', 'adductors': 'Legs', 'abductors': 'Legs',
  'shoulders': 'Shoulders',
  'biceps': 'Arms', 'triceps': 'Arms', 'forearms': 'Arms',
  'abdominals': 'Core', 'hip flexors': 'Core',
};

function normalizeBP(bp: string): string {
  return MUSCLE_TO_CATEGORY[bp.toLowerCase()] ?? bp;
}

const WHEEL_H = 208;
const ROW_H   = 52;
const CTR_TOP = WHEEL_H / 2 - ROW_H / 2;

const SLOT_W  = 96;

export const DAY_COLORS = [
  { surface: '#eab308', side: '#854d0e', light: '#fef9c3', text: '#854d0e' }, // MON yellow
  { surface: '#f472b6', side: '#9d174d', light: '#fce7f3', text: '#9d174d' }, // TUE pink
  { surface: '#22c55e', side: '#15803d', light: '#dcfce7', text: '#15803d' }, // WED green
  { surface: '#f97316', side: '#c2410c', light: '#ffedd5', text: '#c2410c' }, // THU orange
  { surface: '#3b82f6', side: '#1e40af', light: '#dbeafe', text: '#1e40af' }, // FRI blue
  { surface: '#a855f7', side: '#6b21a8', light: '#f3e8ff', text: '#6b21a8' }, // SAT purple
  { surface: '#ef4444', side: '#b91c1c', light: '#fee2e2', text: '#b91c1c' }, // SUN red
];

// ── DayWheel (vertical) ────────────────────────────────────────────────────

interface DayWheelProps {
  value: number;
  onChange: (idx: number) => void;
}

function DayWheel({ value, onChange }: DayWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vPosRef      = useRef<number>(value);
  const [vPos, setVPos] = useState<number>(value);
  const dragRef = useRef<{ startY: number; startVPos: number; moved: boolean } | null>(null);
  const rafRef  = useRef<number | null>(null);

  const push = (p: number) => { vPosRef.current = p; setVPos(p); };

  const snapTo = useCallback((from: number, notify = true) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const target = Math.round(from);
    const t0     = performance.now();
    const animate = (now: number) => {
      const t    = Math.min((now - t0) / 180, 1);
      const ease = 1 - (1 - t) ** 3;
      push(from + (target - from) * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (notify) {
        onChange(((target % 7) + 7) % 7);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [onChange]);

  useEffect(() => {
    if (dragRef.current) return;
    const cur    = Math.round(vPosRef.current);
    const curDay = ((cur % 7) + 7) % 7;
    if (curDay !== value) {
      const diff = value - curDay;
      const adj  = diff > 3 ? diff - 7 : diff < -3 ? diff + 7 : diff;
      snapTo(vPosRef.current + adj, false);
    }
  }, [value, snapTo]);

  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startVPos: vPosRef.current, moved: false };
  };

  const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dy) > 4) dragRef.current.moved = true;
    push(dragRef.current.startVPos - dy / ROW_H);
  };

  const onPU = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { moved } = dragRef.current;
    dragRef.current = null;
    if (!moved) {
      const rect    = containerRef.current!.getBoundingClientRect();
      const slotOff = Math.round((e.clientY - rect.top - CTR_TOP - ROW_H / 2) / ROW_H);
      snapTo(vPosRef.current + slotOff);
    } else {
      snapTo(vPosRef.current);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const p = vPosRef.current + e.deltaY / ROW_H;
    push(p);
    snapTo(p);
  };

  const base = Math.floor(vPos);
  const slots: React.ReactNode[] = [];
  for (let i = base - 5; i <= base + 5; i++) {
    const dayIdx = ((i % 7) + 7) % 7;
    const dist   = Math.abs(i - vPos);
    const top    = CTR_TOP + (i - vPos) * ROW_H;
    if (top + ROW_H < 0 || top > WHEEL_H) continue;
    const c = DAY_COLORS[dayIdx];
    if (dist < 0.5) {
      const shadow = Math.round(3 * (1 - dist * 2));
      slots.push(
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW_H, userSelect: 'none', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', left: 6, right: 6, top: 6, bottom: 6,
            background: c.surface, color: 'white', borderRadius: 10,
            boxShadow: `0 ${shadow}px 0 0 ${c.side}`,
            display: 'flex', alignItems: 'center', paddingLeft: 12,
            fontWeight: 700, fontSize: 13, letterSpacing: '0.08em',
          }}>
            {DAYS[dayIdx]}
          </div>
        </div>
      );
    } else if (dist < 1.5) {
      const op = Math.max(0, 0.85 - (dist - 0.5) * 0.35);
      slots.push(
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW_H, userSelect: 'none', pointerEvents: 'none', opacity: op }}>
          <div style={{
            position: 'absolute', left: 8, right: 8, top: 9, bottom: 9,
            background: c.surface + '48', color: c.side, borderRadius: 8,
            display: 'flex', alignItems: 'center', paddingLeft: 11,
            fontWeight: 600, fontSize: 11, letterSpacing: '0.04em',
          }}>
            {DAYS[dayIdx]}
          </div>
        </div>
      );
    } else if (dist < 2.5) {
      const op = Math.max(0, 0.38 - (dist - 1.5) * 0.38);
      slots.push(
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW_H, userSelect: 'none', pointerEvents: 'none', opacity: op }}>
          <div style={{
            position: 'absolute', left: 11, right: 11, top: 12, bottom: 12,
            background: c.light, color: c.text, borderRadius: 6,
            display: 'flex', alignItems: 'center', paddingLeft: 9,
            fontWeight: 400, fontSize: 10, letterSpacing: '0.02em',
          }}>
            {DAYS[dayIdx]}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onWheel={onWheel}
      style={{
        width: 96, height: WHEEL_H, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        cursor: 'ns-resize', touchAction: 'none',
        background: 'white',
        borderRight: '0.5px solid #e5e7eb',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
        maskImage:        'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
      }}
    >
      {slots}
    </div>
  );
}

// ── DayWheelH (horizontal) ─────────────────────────────────────────────────

interface DayWheelHProps {
  value: number;
  onChange: (idx: number) => void;
  warnings?: Set<number>;
}

function DayWheelH({ value, onChange, warnings }: DayWheelHProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hPosRef      = useRef<number>(value);
  const [hPos, setHPos] = useState<number>(value);
  const [width, setWidth] = useState(320);
  const dragRef = useRef<{ startX: number; startHPos: number; moved: boolean } | null>(null);
  const rafRef  = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width || 320);
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const push = (p: number) => { hPosRef.current = p; setHPos(p); };

  const snapTo = useCallback((from: number, notify = true) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const target = Math.round(from);
    const t0     = performance.now();
    const animate = (now: number) => {
      const t    = Math.min((now - t0) / 180, 1);
      const ease = 1 - (1 - t) ** 3;
      push(from + (target - from) * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (notify) {
        onChange(((target % 7) + 7) % 7);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [onChange]);

  useEffect(() => {
    if (dragRef.current) return;
    const cur    = Math.round(hPosRef.current);
    const curDay = ((cur % 7) + 7) % 7;
    if (curDay !== value) {
      const diff = value - curDay;
      const adj  = diff > 3 ? diff - 7 : diff < -3 ? diff + 7 : diff;
      snapTo(hPosRef.current + adj, false);
    }
  }, [value, snapTo]);

  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startHPos: hPosRef.current, moved: false };
  };

  const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    push(dragRef.current.startHPos - dx / SLOT_W);
  };

  const onPU = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { moved } = dragRef.current;
    dragRef.current = null;
    if (!moved) {
      const rect    = containerRef.current!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const slotOff = Math.round((e.clientX - centerX) / SLOT_W);
      snapTo(hPosRef.current + slotOff);
    } else {
      snapTo(hPosRef.current);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const p = hPosRef.current + (e.deltaX || e.deltaY) / SLOT_W;
    push(p);
    snapTo(p);
  };

  const centerX = width / 2 - SLOT_W / 2;
  const base = Math.floor(hPos);
  const slots: React.ReactNode[] = [];
  for (let i = base - 8; i <= base + 8; i++) {
    const dayIdx  = ((i % 7) + 7) % 7;
    const dist    = Math.abs(i - hPos);
    const left    = centerX + (i - hPos) * SLOT_W;
    if (left + SLOT_W < 0 || left > width) continue;
    const c       = DAY_COLORS[dayIdx];
    const hasWarn = warnings?.has(dayIdx) ?? false;
    if (dist < 0.5) {
      const shadow = Math.round(3 * (1 - dist * 2));
      slots.push(
        <div key={i} style={{ position: 'absolute', left, top: 0, width: SLOT_W, height: ROW_H, userSelect: 'none', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', left: 4, right: 4, top: 5, bottom: 5,
            background: c.surface, color: 'white', borderRadius: 10,
            boxShadow: `0 ${shadow}px 0 0 ${c.side}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 11, letterSpacing: '0.03em',
          }}>
            {FULL_DAY[DAYS[dayIdx]]}
            {hasWarn && <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.85 }} />}
          </div>
        </div>
      );
    } else if (dist < 1.5) {
      const op = Math.max(0, 0.85 - (dist - 0.5) * 0.35);
      slots.push(
        <div key={i} style={{ position: 'absolute', left, top: 0, width: SLOT_W, height: ROW_H, userSelect: 'none', pointerEvents: 'none', opacity: op }}>
          <div style={{
            position: 'absolute', left: 6, right: 6, top: 7, bottom: 7,
            background: c.light, color: c.text, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, fontSize: 9, letterSpacing: '0.02em',
          }}>
            {FULL_DAY[DAYS[dayIdx]]}
            {hasWarn && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />}
          </div>
        </div>
      );
    } else if (dist < 2.5) {
      const op = Math.max(0, 0.38 - (dist - 1.5) * 0.38);
      slots.push(
        <div key={i} style={{ position: 'absolute', left, top: 0, width: SLOT_W, height: ROW_H, userSelect: 'none', pointerEvents: 'none', opacity: op }}>
          <div style={{
            position: 'absolute', left: 7, right: 7, top: 9, bottom: 9,
            background: c.surface + '28', color: c.side, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, fontSize: 8, letterSpacing: '0.01em',
          }}>
            {FULL_DAY[DAYS[dayIdx]]}
            {hasWarn && <span style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: '#f97316' }} />}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onWheel={onWheel}
      style={{
        width: '100%', height: ROW_H, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        cursor: 'ew-resize', touchAction: 'none',
        background: 'white',
        borderBottom: '0.5px solid #e5e7eb',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        maskImage:        'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
      }}
    >
      {slots}
    </div>
  );
}

// ── Set editor helpers ─────────────────────────────────────────────────────

const adjBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, background: '#f3f4f6',
  border: '0.5px solid #e5e7eb', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, color: '#374151', lineHeight: 1,
};


const adjBtnColored = (c: typeof DAY_COLORS[0]): React.CSSProperties => ({
  ...adjBtnStyle,
  background: c.light,
  border: `1px solid ${c.surface}`,
  color: c.side,
});

// ── Main modal ─────────────────────────────────────────────────────────────

export function AddProfileModal({ onClose, onSave, onDraft, profileCount, initialProfile, initialStep }: AddProfileModalProps) {
  // Equipment step
  const [name, setName]             = useState(initialProfile?.name ?? `Profile ${profileCount + 1}`);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [allEquipment, setAllEquipment]       = useState<EquipmentItem[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [step, setStep]             = useState<'equipment' | 'schedule' | 'workout' | 'summary'>(initialStep ?? 'equipment');
  const [draftId] = useState(() => {
    if (initialProfile && 'draftId' in initialProfile) return (initialProfile as ProfileDraft).draftId;
    return crypto.randomUUID();
  });
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Schedule step
  const [schedule, setSchedule] = useState<Record<string, string[]>>(() => {
    if (initialProfile?.schedule) {
      return Object.fromEntries((initialProfile.schedule as WorkoutScheduleDay[]).map(d => [d.day, d.bodyParts]));
    }
    return {};
  });
  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Workout step
  const [workoutDayIdx, setWorkoutDayIdx] = useState(0);
  const [workout, setWorkout] = useState<Record<string, WorkoutExercise[]>>(() => {
    if (initialProfile?.workout) {
      return Object.fromEntries((initialProfile.workout as WorkoutDay[]).map(d => [
        d.day,
        d.exercises.map(ex => ({ ...ex, bodyPart: ex.bodyPart ? normalizeBP(ex.bodyPart) : ex.bodyPart })),
      ]));
    }
    return {};
  });
  const [activeBP, setActiveBP] = useState<string | null>(null);
  const [bpExercises, setBpExercises] = useState<ExerciseItem[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [workoutWarnVisible, setWorkoutWarnVisible] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copyConfirmDay, setCopyConfirmDay] = useState<string | null>(null);


  const workoutDay         = DAYS[workoutDayIdx];
  const workoutBodyParts   = schedule[workoutDay] ?? [];
  const workoutExercises   = workout[workoutDay] ?? [];

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/equipment`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        setAllEquipment(data as EquipmentItem[]);
        if (initialProfile?.equipment) {
          const nameSet = new Set(
            initialProfile.equipment
              .filter(n => n.toLowerCase() !== 'body')
              .map(n => n.toLowerCase())
          );
          const ids = (data as EquipmentItem[])
            .filter(e => e.name.toLowerCase() !== 'body' && nameSet.has(e.name.toLowerCase()))
            .map(e => e.id);
          setSelected(new Set(ids));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEquipment(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reset activeBP when changing workout day
  useEffect(() => { setActiveBP(null); setBpExercises([]); setExerciseSearch(''); }, [workoutDayIdx]);

  const bodyItem    = allEquipment.find(e => e.name.toLowerCase() === 'body');
  const nonBodyList = allEquipment.filter(e => e.name.toLowerCase() !== 'body');
  const filtered    = useMemo(
    () => nonBodyList.filter(e => !selected.has(e.id) && e.name.toUpperCase().includes(search.toUpperCase())),
    [nonBodyList, search, selected],
  );

  const removeEquip = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });


  // ── Profile helpers ──────────────────────────────────────────────────────

  const getProfileDraft = () => {
    if (!name.trim()) return null;
    const bodyName      = bodyItem?.name ?? 'Body';
    const selectedNames = Array.from(selected)
      .map(id => allEquipment.find(e => e.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return { name: name.trim(), equipment: [bodyName, ...selectedNames] };
  };

  const handleClose = () => {
    if (onDraft) {
      const hasContent = name !== `Profile ${profileCount + 1}`
        || selected.size > 0
        || Object.values(schedule).some(v => v.length > 0)
        || Object.values(workout).some(v => v.length > 0);
      if (hasContent) {
        setShowCloseConfirm(true);
        return;
      }
    }
    onClose();
  };

  const saveDraftAndClose = () => {
    const bodyName   = bodyItem?.name ?? 'Body';
    const equipNames = [bodyName, ...Array.from(selected).map(id => allEquipment.find(e => e.id === id)?.name).filter(Boolean) as string[]];
    onDraft!({ name, equipment: equipNames, schedule: DAYS.map(d => ({ day: d, bodyParts: schedule[d] ?? [] })), workout: DAYS.map(d => ({ day: d, exercises: workout[d] ?? [] })), step, draftId });
    setShowCloseConfirm(false);
    onClose();
  };

  const handleNextToSchedule = () => { if (getProfileDraft()) setStep('schedule'); };
  const handleNextToWorkout  = () => setStep('workout');
  const handleNextToSummary  = () => {
    if (allMissingAssignments.length > 0 && !workoutWarnVisible) {
      setWorkoutWarnVisible(true);
      return;
    }
    setWorkoutWarnVisible(false);
    setStep('summary');
  };

  const handleSave = () => {
    const profile = getProfileDraft();
    if (!profile) return;
    onSave({
      ...profile,
      schedule: DAYS.map(day => ({ day, bodyParts: schedule[day] ?? [] })),
      workout:  DAYS.map(day => ({ day, exercises: workout[day] ?? [] })),
    });
  };

  // ── Schedule mutations ───────────────────────────────────────────────────

  const togglePart = (day: string, part: string) => {
    if (part === 'Rest') {
      setSchedule(prev => ({ ...prev, [day]: [] }));
    } else {
      setSchedule(prev => {
        const cur  = prev[day] ?? [];
        const next = cur.includes(part) ? cur.filter(p => p !== part) : [...cur, part];
        return { ...prev, [day]: next };
      });
    }
  };


  // ── Workout mutations ────────────────────────────────────────────────────

  const equipmentNames = useMemo(() => {
    const bodyName = bodyItem?.name ?? 'Body';
    const names = Array.from(selected).map(id => allEquipment.find(e => e.id === id)?.name).filter(Boolean) as string[];
    return [bodyName, ...names];
  }, [bodyItem, selected, allEquipment]);

  const allMissingAssignments = useMemo(() => {
    const missing: { day: string; bodyPart: string }[] = [];
    for (const day of DAYS) {
      const parts = schedule[day] ?? [];
      const exs   = workout[day] ?? [];
      for (const bp of parts) {
        if (!exs.some(e => e.bodyPart === bp)) missing.push({ day, bodyPart: bp });
      }
    }
    return missing;
  }, [schedule, workout]);

  const missingBPsForCurrentDay = useMemo(
    () => workoutBodyParts.filter(bp => !(workout[workoutDay] ?? []).some(e => e.bodyPart === bp)),
    [workoutBodyParts, workout, workoutDay],
  );

  const missingDayIndices = useMemo(() => {
    const indices = new Set<number>();
    allMissingAssignments.forEach(({ day }) => {
      const idx = DAYS.indexOf(day);
      if (idx !== -1) indices.add(idx);
    });
    return indices;
  }, [allMissingAssignments]);

  useEffect(() => {
    if (allMissingAssignments.length === 0) setWorkoutWarnVisible(false);
  }, [allMissingAssignments]);

  const filteredBpExercises = useMemo(
    () => bpExercises.filter(ex => ex.name.toUpperCase().includes(exerciseSearch.toUpperCase())),
    [bpExercises, exerciseSearch],
  );

  const handleSelectBP = (bp: string) => {
    setActiveBP(bp);
    setExerciseSearch('');
    setBpExercises([]);
    setLoadingExercises(true);
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/exercises?bodyPart=${encodeURIComponent(bp)}&equipmentNames=${encodeURIComponent(equipmentNames.join(','))}`)
      .then(r => r.json())
      .then((data: unknown) => { if (Array.isArray(data)) setBpExercises(data as ExerciseItem[]); })
      .catch(() => {})
      .finally(() => setLoadingExercises(false));
  };

  const addExercise = (ex: ExerciseItem) => {
    const defaultRest = Math.max(0, parseInt(localStorage.getItem('setting_defaultRest') ?? '60', 10) || 60);
    setWorkout(prev => {
      const cur = prev[workoutDay] ?? [];
      if (cur.some(e => e.exerciseId === ex.id)) return prev;
      const repType = ex.repType ?? 'count';
      return {
        ...prev,
        [workoutDay]: [...cur, {
          exerciseId: ex.id,
          exerciseName: ex.name,
          bodyPart: activeBP ?? normalizeBP(ex.bodyPart ?? ''),
          muscle: ex.bodyPart ?? null,
          sets: [{ repType, reps: repType === 'time' ? 30 : 10, restSeconds: defaultRest }],
        }],
      };
    });
  };

  const removeExercise = (day: string, exIdx: number) =>
    setWorkout(prev => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== exIdx) }));

  const changeSetCount = (day: string, exIdx: number, delta: number) =>
    setWorkout(prev => {
      const exs = [...(prev[day] ?? [])];
      const ex  = { ...exs[exIdx] };
      if (delta > 0) {
        const last = ex.sets[ex.sets.length - 1] ?? { repType: 'count' as const, reps: 10, restSeconds: 60 };
        ex.sets = [...ex.sets, { ...last }];
      } else if (ex.sets.length > 1) {
        ex.sets = ex.sets.slice(0, -1);
      }
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const adjustAllReps = (day: string, exIdx: number, delta: number) =>
    setWorkout(prev => {
      const exs = [...(prev[day] ?? [])];
      const ex  = { ...exs[exIdx] };
      const newReps = Math.max(1, (ex.sets[0]?.reps ?? 10) + delta);
      ex.sets = ex.sets.map(s => ({ ...s, reps: newReps }));
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const adjustAllRest = (day: string, exIdx: number, delta: number) =>
    setWorkout(prev => {
      const exs = [...(prev[day] ?? [])];
      const ex  = { ...exs[exIdx] };
      const newRest = Math.max(0, (ex.sets[0]?.restSeconds ?? 60) + delta);
      ex.sets = ex.sets.map(s => ({ ...s, restSeconds: newRest }));
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  // ── Copy from day ────────────────────────────────────────────────────────

  const copyableDays = useMemo(
    () => DAYS.filter(d => d !== workoutDay && (workout[d]?.length ?? 0) > 0),
    [workout, workoutDay],
  );

  const executeCopyFromDay = (fromDay: string) => {
    setWorkout(prev => ({ ...prev, [workoutDay]: (workout[fromDay] ?? []).map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) })) }));
    setSchedule(prev => ({ ...prev, [workoutDay]: [...(schedule[fromDay] ?? [])] }));
    setCopyConfirmDay(null);
  };

  const handleCopyDaySelect = (fromDay: string) => {
    setShowCopyMenu(false);
    const hasExisting = (workout[workoutDay]?.length ?? 0) > 0 || (schedule[workoutDay]?.length ?? 0) > 0;
    if (hasExisting) {
      setCopyConfirmDay(fromDay);
    } else {
      executeCopyFromDay(fromDay);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
        {/* Drag handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            type="button" onClick={handleClose}
            className="ml-auto flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            style={{ width: 32, height: 32 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {step === 'equipment' ? (
          /* ── Step 1: Equipment ───────────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0 px-6 pb-6 pt-1 gap-4">

            <div className="flex flex-col gap-2">
              <label className="pixel-font-small tracking-widest text-gray-500">PROFILE NAME</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pixel-font-small text-gray-700 outline-none focus:border-red-400"
                style={{ transition: 'border-color 0.15s ease' }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="pixel-font-small tracking-widest text-gray-500">I HAVE</label>
              <div
                style={{
                  height: CARD_SIZE * 2 + 52, borderRadius: 12,
                  border: '2px dashed #d1d5db',
                  background: '#fafafa',
                  display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  alignContent: 'start',
                  gap: 8, padding: 8, overflowY: 'auto',
                }}
              >
                <EquipmentCard label="BODY" active />
                {Array.from(selected).map(id => {
                  const eq = allEquipment.find(e => e.id === id);
                  if (!eq) return null;
                  return (
                    <EquipmentCard
                      key={id}
                      label={eq.name.toUpperCase()}
                      active
                      onClick={() => removeEquip(id)}
                    />
                  );
                })}
                {selected.size === 0 && (
                  <span
                    className="pixel-font-small text-gray-300 m-auto pointer-events-none"
                    style={{ fontSize: '0.42rem', gridColumn: '1 / -1', alignSelf: 'center' }}
                  >
                    TAP TO ADD
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <label className="pixel-font-small tracking-widest text-gray-500">WORKOUT EQUIPMENT</label>
              <div className="relative">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 pixel-font-small text-gray-700 outline-none focus:border-red-400"
                  style={{ transition: 'border-color 0.15s ease' }}
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingEquipment ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, paddingBlock: 2 }}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: CARD_SIZE, borderRadius: 12 }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, paddingBlock: 2 }}>
                    {filtered.map(eq => (
                      <EquipmentCard
                        key={eq.id}
                        label={eq.name.toUpperCase()}
                        onClick={() => setSelected(prev => new Set([...prev, eq.id]))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end shrink-0">
              <button
                type="button" onClick={handleNextToSchedule} disabled={!name.trim()}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-white disabled:opacity-40"
                style={{ background: '#dc2626', boxShadow: '0 4px 0 0 #991b1b' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13,6 19,12 13,18" />
                </svg>
              </button>
            </div>
          </div>

        ) : step === 'schedule' ? (
          /* ── Step 2: Schedule ────────────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0 pt-1">
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 6 }}>
              {DAYS.map((day, di) => {
                const parts  = schedule[day] ?? [];
                const isRest = parts.length === 0;
                const c      = DAY_COLORS[di];
                return (
                  <div
                    key={day}
                    onClick={() => setEditingDay(day)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                      padding: '0 14px', borderRadius: 14, cursor: 'pointer',
                      background: isRest ? '#fafafa' : c.light,
                      border: `1.5px solid ${isRest ? '#f0f0f0' : c.surface + '55'}`,
                    }}
                  >
                    {/* Day badge */}
                    <div style={{
                      flexShrink: 0, width: 52, height: 34, borderRadius: 8,
                      background: isRest ? '#e5e7eb' : c.surface,
                      boxShadow: isRest ? 'none' : `0 3px 0 0 ${c.side}`,
                      color: isRest ? '#9ca3af' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                    }}>{day}</div>

                    {/* Body part chips */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {isRest
                        ? <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500, letterSpacing: '0.04em' }}>REST</span>
                        : parts.map(p => (
                            <span key={p} style={{
                              padding: '4px 12px', borderRadius: 20,
                              background: c.surface, color: 'white',
                              fontSize: 11, fontWeight: 600,
                              boxShadow: `0 2px 0 0 ${c.side}`,
                            }}>{p}</span>
                          ))
                      }
                    </div>

                    {/* Edit pencil */}
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                      stroke={isRest ? '#d1d5db' : c.side} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between shrink-0 px-6 pb-6 pt-3" style={{ borderTop: '0.5px solid #f3f4f6' }}>
              <button
                type="button" onClick={() => setStep('equipment')}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-gray-700 bg-gray-200"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="11,6 5,12 11,18" />
                </svg>
              </button>
              <button
                type="button" onClick={handleNextToWorkout}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-white"
                style={{ background: '#dc2626', boxShadow: '0 4px 0 0 #991b1b' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13,6 19,12 13,18" />
                </svg>
              </button>
            </div>
          </div>

        ) : step === 'workout' ? (
          /* ── Step 3: Workout ─────────────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0 pt-1 gap-0">

            {/* Horizontal day wheel */}
            <DayWheelH value={workoutDayIdx} onChange={setWorkoutDayIdx} warnings={missingDayIndices} />

            {/* Scrollable content */}
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-4 gap-4">

              {/* Copy from day button */}
              {copyableDays.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCopyMenu(true)}
                    className="pixel-font-small"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 8,
                      background: '#f3f4f6', border: '1px solid #e5e7eb',
                      color: '#6b7280', fontSize: '0.45rem', fontWeight: 600,
                      cursor: 'pointer', letterSpacing: '0.04em',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    COPY FROM DAY
                  </button>
                </div>
              )}

              {workoutBodyParts.length > 0 && (
                <>
                  {/* Body part filter cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                    {workoutBodyParts.map(bp => {
                      const isMissing = missingBPsForCurrentDay.includes(bp);
                      return (
                        <div key={bp} style={{ position: 'relative' }}>
                          <EquipmentCard
                            label={bp.toUpperCase()}
                            active={activeBP === bp}
                            onClick={() => handleSelectBP(bp)}
                          />
                          {isMissing && (
                            <span style={{
                              position: 'absolute', top: 4, right: 4,
                              width: 11, height: 11, borderRadius: '50%',
                              background: '#dc2626', border: '2px solid white',
                              pointerEvents: 'none',
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                </>
              )}

              {/* Exercise list */}
              {workoutExercises.length > 0 && (() => {
                const grouped = workoutExercises.reduce<{ bp: string; items: { ex: typeof workoutExercises[0]; exIdx: number }[] }[]>((acc, ex, exIdx) => {
                  const bp = ex.bodyPart ?? '';
                  const g = acc.find(x => x.bp === bp);
                  if (g) g.items.push({ ex, exIdx });
                  else acc.push({ bp, items: [{ ex, exIdx }] });
                  return acc;
                }, []);
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped.map(group => (
                    <div key={group.bp}>
                      {group.bp && (
                        <div style={{ paddingBottom: 8 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '3px 10px', borderRadius: 6,
                            background: '#fef2f2', color: '#dc2626',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                          }}>
                            {group.bp.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.items.map(({ ex, exIdx }) => (
                    <div key={ex.exerciseId} style={{ borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden', background: 'white' }}>
                      <div style={{
                        background: '#fafafa', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '0.5px solid #f3f4f6',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{
                            alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 6,
                            background: '#dc2626', color: 'white',
                            fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                          }} className="pixel-font-small">{ex.exerciseName.toUpperCase()}</span>
                          {ex.muscle && (
                            <span style={{
                              alignSelf: 'flex-start', padding: '1px 6px', borderRadius: 4,
                              background: '#dc2626', color: 'white',
                              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                            }} className="pixel-font-small">{ex.muscle.toUpperCase()}</span>
                          )}
                        </div>
                        <button
                          type="button" onClick={() => removeExercise(workoutDay, exIdx)}
                          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em' }}>SETS</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <button type="button" onClick={() => changeSetCount(workoutDay, exIdx, -1)} style={adjBtnStyle}>−</button>
                            <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center', fontWeight: 500 }}>{ex.sets.length}</span>
                            <button type="button" onClick={() => changeSetCount(workoutDay, exIdx, 1)} style={adjBtnStyle}>+</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em' }}>
                            {ex.sets[0]?.repType === 'time' ? 'SEC' : 'REPS'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <button type="button" onClick={() => adjustAllReps(workoutDay, exIdx, -1)} style={adjBtnStyle}>−</button>
                            <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center', fontWeight: 500 }}>{ex.sets[0]?.reps ?? 10}</span>
                            <button type="button" onClick={() => adjustAllReps(workoutDay, exIdx, 1)} style={adjBtnStyle}>+</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em' }}>REST</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <button type="button" onClick={() => adjustAllRest(workoutDay, exIdx, -15)} style={adjBtnStyle}>−</button>
                            <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center' }}>{ex.sets[0]?.restSeconds ?? 60}s</span>
                            <button type="button" onClick={() => adjustAllRest(workoutDay, exIdx, 15)} style={adjBtnStyle}>+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                      ))}
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()}

              {workoutBodyParts.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: '#d1d5db' }}>No workout scheduled for this day</span>
                </div>
              )}
            </div>

            {/* Missing exercises warning */}
            {workoutWarnVisible && (
              <div style={{ margin: '0 24px 8px', padding: '10px 14px', borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#c2410c', marginBottom: 4 }}>
                  Some body parts have no exercises:
                </div>
                {Object.entries(
                  allMissingAssignments.reduce<Record<string, string[]>>((acc, { day, bodyPart }) => {
                    (acc[day] ??= []).push(bodyPart);
                    return acc;
                  }, {})
                ).map(([day, parts]) => (
                  <div key={day} style={{ fontSize: 11, color: '#9a3412', lineHeight: 1.7 }}>
                    <strong>{day}</strong>: {parts.join(', ')}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 6 }}>
                  Tap → again to continue without exercises.
                </div>
              </div>
            )}

            {/* Back / Next */}
            <div className="flex justify-between shrink-0 px-6 pb-6 pt-3" style={{ borderTop: '0.5px solid #f3f4f6' }}>
              <button
                type="button" onClick={() => setStep('schedule')}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-gray-700 bg-gray-200"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="11,6 5,12 11,18" />
                </svg>
              </button>
              <button
                type="button" onClick={handleNextToSummary}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-white"
                style={{ background: '#dc2626', boxShadow: '0 4px 0 0 #991b1b' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13,6 19,12 13,18" />
                </svg>
              </button>
            </div>

          </div>

        ) : (
          /* ── Step 4: Summary (editable) ──────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0 pt-1 gap-0">

            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
              {DAYS.map((day, di) => {
                const exs   = workout[day] ?? [];
                const parts = schedule[day] ?? [];
                const isRest = parts.length === 0;
                const c     = DAY_COLORS[di];
                return (
                  <div key={day} style={{ marginBottom: 20 }}>
                    {/* Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: isRest || exs.length === 0 ? 0 : 8 }}>
                      <div style={{
                        flexShrink: 0, width: 44, height: 24, borderRadius: 6,
                        background: isRest ? '#f3f4f6' : c.surface, color: isRest ? '#9ca3af' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                      }}>{day}</div>
                      {isRest
                        ? <span style={{ fontSize: 11, color: '#9ca3af' }}>REST</span>
                        : parts.map(p => (
                            <span key={p} style={{ padding: '3px 8px', borderRadius: 4, background: '#f3f4f6', color: '#374151', fontSize: 11, fontWeight: 600 }}>
                              {p.toUpperCase()}
                            </span>
                          ))
                      }
                    </div>

                    {/* Exercise cards grouped by body part */}
                    {exs.length > 0 && (() => {
                      const grouped = exs.reduce<{ bp: string; items: { ex: typeof exs[0]; exIdx: number }[] }[]>((acc, ex, exIdx) => {
                        const bp = ex.bodyPart ?? '';
                        const g = acc.find(x => x.bp === bp);
                        if (g) g.items.push({ ex, exIdx });
                        else acc.push({ bp, items: [{ ex, exIdx }] });
                        return acc;
                      }, []);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {grouped.map(group => (
                            <div key={group.bp}>
                              {group.bp && (
                                <div style={{ paddingBottom: 8 }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '3px 10px', borderRadius: 6,
                                    background: '#fef2f2', color: '#dc2626',
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                                  }}>
                                    {group.bp.toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {group.items.map(({ ex, exIdx }) => (
                                  <div key={ex.exerciseId} style={{ borderRadius: 10, border: `1.5px solid ${c.surface}`, overflow: 'hidden', background: 'white' }}>
                                    <div style={{ background: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${c.surface}40` }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <span style={{
                                          alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 6,
                                          background: '#dc2626', color: 'white',
                                          fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                                        }} className="pixel-font-small">{ex.exerciseName.toUpperCase()}</span>
                                        {ex.muscle && (
                                          <span style={{
                                            alignSelf: 'flex-start', padding: '1px 6px', borderRadius: 4,
                                            background: '#dc2626', color: 'white',
                                            fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                                          }} className="pixel-font-small">{ex.muscle.toUpperCase()}</span>
                                        )}
                                      </div>
                                      <button type="button" onClick={() => removeExercise(day, exIdx)}
                                        style={{ color: c.side, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
                                    </div>
                                    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: 9, color: c.side, fontWeight: 600, letterSpacing: '0.06em' }}>SETS</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => changeSetCount(day, exIdx, -1)}>−</button>
                                          <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center', fontWeight: 500, color: c.text }}>{ex.sets.length}</span>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => changeSetCount(day, exIdx, 1)}>+</button>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: 9, color: c.side, fontWeight: 600, letterSpacing: '0.06em' }}>
                                          {ex.sets[0]?.repType === 'time' ? 'SEC' : 'REPS'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => adjustAllReps(day, exIdx, -1)}>−</button>
                                          <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center', fontWeight: 500, color: c.text }}>{ex.sets[0]?.reps ?? 10}</span>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => adjustAllReps(day, exIdx, 1)}>+</button>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: 9, color: c.side, fontWeight: 600, letterSpacing: '0.06em' }}>REST</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => adjustAllRest(day, exIdx, -15)}>−</button>
                                          <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center', color: c.text }}>{ex.sets[0]?.restSeconds ?? 60}s</span>
                                          <button type="button" style={adjBtnColored(c)} onClick={() => adjustAllRest(day, exIdx, 15)}>+</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between shrink-0 px-6 pb-6 pt-3" style={{ borderTop: '0.5px solid #f3f4f6' }}>
              <button
                type="button" onClick={() => setStep('workout')}
                className="flex items-center justify-center rounded-xl px-5 py-2 text-gray-700 bg-gray-200"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="11,6 5,12 11,18" />
                </svg>
              </button>
              <button
                type="button" onClick={handleSave}
                className="flex items-center justify-center rounded-xl px-8 py-2 text-white"
                style={{ background: '#dc2626', boxShadow: '0 4px 0 0 #991b1b' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Close confirmation ─────────────────────────────────────────── */}
        {showCloseConfirm && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setShowCloseConfirm(false)}
          >
            <div
              style={{
                background: 'white', borderRadius: 20, margin: '0 24px',
                padding: '28px 28px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              }}
              onClick={e => e.stopPropagation()}
            >
              <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.5rem' }}>
                SAVE DRAFT?
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', textAlign: 'center' }}>
                {name || 'Untitled'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: '#f3f4f6', color: '#374151', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >CANCEL</button>
                <button
                  type="button"
                  onClick={() => { setShowCloseConfirm(false); onClose(); }}
                  style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >DISCARD</button>
                <button
                  type="button"
                  onClick={saveDraftAndClose}
                  style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: '#dc2626', color: 'white', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    boxShadow: '0 3px 0 0 #991b1b',
                  }}
                >SAVE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Copy from day menu ────────────────────────────────────────── */}
        {showCopyMenu && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowCopyMenu(false)}
          >
            <div
              style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}
              onClick={e => e.stopPropagation()}
            >
              <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.45rem', textAlign: 'center' }}>COPY FROM</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {copyableDays.map(d => {
                  const di = DAYS.indexOf(d);
                  const c  = DAY_COLORS[di];
                  const exCount = workout[d]?.length ?? 0;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleCopyDaySelect(d)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 12, border: 'none',
                        background: c.light, cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 44, height: 28, borderRadius: 7,
                          background: c.surface, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                          boxShadow: `0 2px 0 0 ${c.side}`, flexShrink: 0,
                        }}>{d}</span>
                        <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>
                          {workout[d]?.map(e => e.exerciseName).slice(0, 2).join(', ')}{exCount > 2 ? ` +${exCount - 2}` : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: c.side, fontWeight: 600 }}>{exCount} exercises</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Copy confirm dialog ────────────────────────────────────────── */}
        {copyConfirmDay && (() => {
          const di = DAYS.indexOf(copyConfirmDay);
          const c  = DAY_COLORS[di];
          const wdi = DAYS.indexOf(workoutDay);
          const wc  = DAY_COLORS[wdi];
          return (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setCopyConfirmDay(null)}
            >
              <div
                style={{ background: 'white', borderRadius: 20, margin: '0 24px', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
                onClick={e => e.stopPropagation()}
              >
                <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.45rem' }}>REPLACE DAY?</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '5px 14px', borderRadius: 8, background: c.surface, color: 'white', fontSize: 12, fontWeight: 700, boxShadow: `0 2px 0 0 ${c.side}` }}>{copyConfirmDay}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13,6 19,12 13,18" />
                  </svg>
                  <span style={{ padding: '5px 14px', borderRadius: 8, background: wc.surface, color: 'white', fontSize: 12, fontWeight: 700, boxShadow: `0 2px 0 0 ${wc.side}` }}>{workoutDay}</span>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                  ท่าและ Body Part ทั้งหมดของวัน <strong style={{ color: '#111827' }}>{workoutDay}</strong> จะถูกแทนที่<br />ของเดิมจะหายไป
                </p>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setCopyConfirmDay(null)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >CANCEL</button>
                  <button
                    type="button"
                    onClick={() => executeCopyFromDay(copyConfirmDay)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 3px 0 0 #991b1b' }}
                  >REPLACE</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Body part picker popup (schedule step) ────────────────────── */}
        {step === 'schedule' && editingDay && (() => {
          const di    = DAYS.indexOf(editingDay);
          const c     = DAY_COLORS[di];
          const parts = schedule[editingDay] ?? [];
          return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'white', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '7px 22px', borderRadius: 10,
                  background: c.surface, color: 'white',
                  boxShadow: `0 4px 0 0 ${c.side}`,
                  fontSize: 14, fontWeight: 700, letterSpacing: '0.06em',
                }}>
                  {FULL_DAY[editingDay]}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {BODY_PARTS.map(part => (
                    <EquipmentCard
                      key={part}
                      label={part.toUpperCase()}
                      active={parts.includes(part)}
                      onClick={() => togglePart(editingDay, part)}
                    />
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 20px 24px', borderTop: '0.5px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  style={{
                    width: '100%', padding: 11, borderRadius: 14, border: 'none',
                    background: c.surface, color: 'white', cursor: 'pointer',
                    boxShadow: `0 4px 0 0 ${c.side}`, fontSize: 14, fontWeight: 600,
                  }}
                >
                  DONE
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Exercise picker popup (modal-level) ───────────────────────── */}
        {step === 'workout' && activeBP && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'white', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px 14px', borderBottom: '0.5px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '7px 22px', borderRadius: 10,
                background: '#dc2626', color: 'white',
                boxShadow: '0 4px 0 0 #991b1b',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.06em',
              }}>
                {activeBP?.toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => { setActiveBP(null); setBpExercises([]); setExerciseSearch(''); }}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: '#f3f4f6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280', fontSize: 18, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 16px 8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={exerciseSearch}
                  onChange={e => setExerciseSearch(e.target.value)}
                  placeholder="Search..."
                  className="pixel-font-small"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '8px 32px 8px 12px', fontSize: '0.6rem',
                    outline: 'none', color: '#374151',
                  }}
                />
                <svg
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
                  viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
              </div>
            </div>

                {/* Selected exercises chips */}
                {(() => {
                  const selEx = workoutExercises.filter(w => w.bodyPart === activeBP);
                  if (selEx.length === 0) return null;
                  return (
                    <div style={{ padding: '4px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selEx.map(w => (
                        <span
                          key={w.exerciseId}
                          onClick={() => {
                            const idx = workoutExercises.findIndex(e => e.exerciseId === w.exerciseId);
                            if (idx !== -1) removeExercise(workoutDay, idx);
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 20,
                            background: '#fef2f2', color: '#dc2626',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            border: '1px solid #fecaca',
                          }}
                        >
                          {w.exerciseName}
                          <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Exercise picker grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 8px' }}>
                  {loadingExercises ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
                      ))}
                    </div>
                  ) : filteredBpExercises.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
                      <span style={{ fontSize: 12, color: '#d1d5db' }}>No exercises found</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {filteredBpExercises.map(ex => {
                        const already = workoutExercises.some(w => w.exerciseId === ex.id);
                        return (
                          <div
                            key={ex.id}
                            onClick={() => {
                              if (already) {
                                const idx = workoutExercises.findIndex(w => w.exerciseId === ex.id);
                                if (idx !== -1) removeExercise(workoutDay, idx);
                              } else {
                                addExercise(ex);
                              }
                            }}
                            style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '22px 10px 8px', borderRadius: 12, minHeight: 60,
                              border: `2px solid ${already ? '#dc2626' : '#e5e7eb'}`,
                              background: already ? '#fef2f2' : '#f9fafb',
                              color: '#111827',
                              opacity: already ? 0.5 : 1,
                              cursor: 'pointer', boxSizing: 'border-box',
                            }}
                          >
                            {ex.bodyPart && (
                              <span
                                className="pixel-font-small"
                                style={{
                                  position: 'absolute', top: 5, left: 7,
                                  fontSize: '0.4rem', lineHeight: 1.4,
                                  color: '#111827',
                                  display: 'flex', flexWrap: 'wrap', gap: 3,
                                }}
                              >
                                {ex.bodyPart.split(',').map(m => m.trim()).filter(Boolean).map((m, i) => (
                                  <span key={i} style={{
                                    padding: '1px 5px', borderRadius: 3,
                                    background: '#dc2626', color: 'white',
                                  }}>{m.toUpperCase()}</span>
                                ))}
                              </span>
                            )}
                            <span
                              className="pixel-font-small text-center leading-tight"
                              style={{ fontSize: '0.55rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                            >
                              {ex.name.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

            {/* OK button */}
            <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => { setActiveBP(null); setBpExercises([]); setExerciseSearch(''); }}
                style={{
                  width: '100%', padding: '11px', borderRadius: 14, border: 'none',
                  background: '#dc2626', color: 'white', cursor: 'pointer',
                  boxShadow: '0 4px 0 0 #991b1b', fontSize: 14, fontWeight: 600,
                }}
              >
                DONE
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
