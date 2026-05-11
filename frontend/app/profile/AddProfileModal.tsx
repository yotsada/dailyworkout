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
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onRemove?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}

function EquipmentCard({
  label, active = false, dimmed = false, draggable = false,
  onClick, onDragStart, onRemove,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
}: EquipmentCardProps) {
  return (
    <div style={{ position: 'relative', width: '100%', opacity: dimmed ? 0.35 : 1, userSelect: 'none', minWidth: 0 }}>
      <div
        draggable={draggable}
        onClick={onClick}
        onDragStart={onDragStart}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          padding: 8, borderRadius: 12,
          border: `2px solid ${active ? '#dc2626' : '#e5e7eb'}`,
          background: active ? '#fef2f2' : '#f9fafb',
          color: active ? '#dc2626' : '#6b7280',
          cursor: draggable ? 'grab' : (onClick || onPointerDown) ? 'pointer' : 'default',
          minHeight: CARD_SIZE, width: '100%', aspectRatio: '1 / 1',
          boxSizing: 'border-box', gap: 4,
          touchAction: onPointerDown ? 'none' : 'auto',
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

interface AddProfileModalProps {
  onClose: () => void;
  onSave: (profile: ProfileData) => void;
  profileCount: number;
  initialProfile?: ProfileData;
  initialStep?: 'equipment' | 'workout' | 'summary';
}

// ── Schedule step constants ────────────────────────────────────────────────

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const FULL_DAY: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};
const BODY_PARTS      = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
const BODY_PARTS_GRID = ['Rest', ...BODY_PARTS];

const WHEEL_H = 208;
const ROW_H   = 52;
const CTR_TOP = WHEEL_H / 2 - ROW_H / 2;

const SLOT_W  = 72;

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
            fontWeight: 700, fontSize: 13, letterSpacing: '0.08em',
          }}>
            {DAYS[dayIdx]}
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
            fontWeight: 500, fontSize: 11, letterSpacing: '0.04em',
          }}>
            {DAYS[dayIdx]}
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
            fontWeight: 500, fontSize: 10, letterSpacing: '0.02em',
          }}>
            {DAYS[dayIdx]}
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

// ── Drag helpers ───────────────────────────────────────────────────────────

function makeGhost(text: string): HTMLDivElement {
  const g = document.createElement('div');
  g.textContent = text;
  Object.assign(g.style, {
    position: 'fixed', zIndex: '9999',
    width: '62px', height: '62px', borderRadius: '12px',
    fontSize: '0.4rem', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '4px', boxSizing: 'border-box',
    background: '#fef2f2', border: '2px solid #dc2626', color: '#dc2626',
    pointerEvents: 'none', opacity: '0.85',
    transform: 'translate(-50%,-50%)',
    left: '-999px', top: '-999px',
  });
  document.body.appendChild(g);
  return g;
}

function moveGhost(g: HTMLDivElement, x: number, y: number) {
  g.style.left = `${x}px`;
  g.style.top  = `${y}px`;
}

function isOverZone(ref: HTMLDivElement | null, x: number, y: number) {
  if (!ref) return false;
  const el = document.elementFromPoint(x, y);
  return el === ref || ref.contains(el as Node);
}

// ── Set editor helpers ─────────────────────────────────────────────────────

const adjBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, background: '#f3f4f6',
  border: '0.5px solid #e5e7eb', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, color: '#374151', lineHeight: 1,
};

// ── Main modal ─────────────────────────────────────────────────────────────

export function AddProfileModal({ onClose, onSave, profileCount, initialProfile, initialStep }: AddProfileModalProps) {
  // Equipment step
  const [name, setName]             = useState(initialProfile?.name ?? `Profile ${profileCount + 1}`);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [equipDropActive, setEquipDropActive] = useState(false);
  const [allEquipment, setAllEquipment]       = useState<EquipmentItem[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [step, setStep]             = useState<'equipment' | 'schedule' | 'workout' | 'summary'>(initialStep ?? 'equipment');

  // Schedule step
  const [schedule, setSchedule] = useState<Record<string, string[]>>(() => {
    if (initialProfile?.schedule) {
      return Object.fromEntries((initialProfile.schedule as WorkoutScheduleDay[]).map(d => [d.day, d.bodyParts]));
    }
    return { MON: ['Chest', 'Arms'], WED: ['Back'], FRI: ['Legs'] };
  });
  const [wheelDayIdx, setWheelDayIdx]     = useState(0);
  const [bodyDropActive, setBodyDropActive] = useState(false);

  // Workout step
  const [workoutDayIdx, setWorkoutDayIdx] = useState(0);
  const [workout, setWorkout] = useState<Record<string, WorkoutExercise[]>>(() => {
    if (initialProfile?.workout) {
      return Object.fromEntries((initialProfile.workout as WorkoutDay[]).map(d => [d.day, d.exercises]));
    }
    return {};
  });
  const [activeBP, setActiveBP] = useState<string | null>(null);
  const [bpExercises, setBpExercises] = useState<ExerciseItem[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [workoutWarnVisible, setWorkoutWarnVisible] = useState(false);

  // Equipment touch drag
  const equipDropRef  = useRef<HTMLDivElement>(null);
  const equipGhostRef = useRef<HTMLDivElement | null>(null);
  const equipDragRef  = useRef<{ id: string; startX: number; startY: number; dragging: boolean } | null>(null);

  // Body part touch drag
  const bodyDropRef  = useRef<HTMLDivElement>(null);
  const bodyGhostRef = useRef<HTMLDivElement | null>(null);
  const bodyDragRef  = useRef<{ part: string; startX: number; startY: number; dragging: boolean } | null>(null);

  const selectedDay       = DAYS[wheelDayIdx];
  const selectedBodyParts = schedule[selectedDay] ?? [];

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
  useEffect(() => { setActiveBP(null); setBpExercises([]); }, [workoutDayIdx]);

  const bodyItem    = allEquipment.find(e => e.name.toLowerCase() === 'body');
  const nonBodyList = allEquipment.filter(e => e.name.toLowerCase() !== 'body');
  const filtered    = useMemo(
    () => nonBodyList.filter(e => !selected.has(e.id) && e.name.toUpperCase().includes(search.toUpperCase())),
    [nonBodyList, search, selected],
  );

  const removeEquip = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });

  // ── Equipment drag handlers ──────────────────────────────────────────────

  const handleEquipDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleEquipDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setEquipDropActive(true);
  };
  const handleEquipDrop = (e: React.DragEvent) => {
    e.preventDefault(); setEquipDropActive(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id && nonBodyList.some(eq => eq.id === id)) setSelected(prev => new Set([...prev, id]));
  };

  const onEquipPD = (e: React.PointerEvent, id: string) => {
    if (e.pointerType === 'mouse') return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    equipDragRef.current = { id, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const onEquipPM = (e: React.PointerEvent) => {
    const d = equipDragRef.current;
    if (!d) return;
    if (!d.dragging && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 15) {
      d.dragging = true;
      const label = allEquipment.find(eq => eq.id === d.id)?.name.toUpperCase() ?? '';
      equipGhostRef.current = makeGhost(label);
    }
    if (equipGhostRef.current) {
      moveGhost(equipGhostRef.current, e.clientX, e.clientY);
      setEquipDropActive(isOverZone(equipDropRef.current, e.clientX, e.clientY));
    }
  };

  const onEquipPU = (e: React.PointerEvent) => {
    const d = equipDragRef.current;
    if (!d) return;
    equipDragRef.current = null;
    if (equipGhostRef.current) { document.body.removeChild(equipGhostRef.current); equipGhostRef.current = null; }
    if (d.dragging && isOverZone(equipDropRef.current, e.clientX, e.clientY)) {
      setSelected(prev => new Set([...prev, d.id]));
    }
    setEquipDropActive(false);
  };

  const onEquipPC = () => {
    if (equipGhostRef.current) { document.body.removeChild(equipGhostRef.current); equipGhostRef.current = null; }
    equipDragRef.current = null;
    setEquipDropActive(false);
  };

  // ── Body part drag handlers ──────────────────────────────────────────────

  const handleBodyDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'copy';
      setBodyDropActive(true);
    }
  };
  const handleBodyDrop = (e: React.DragEvent) => {
    e.preventDefault(); setBodyDropActive(false);
    const part = e.dataTransfer.getData('text/plain');
    if (BODY_PARTS.includes(part)) togglePart(selectedDay, part);
  };

  const onBodyPD = (e: React.PointerEvent, part: string) => {
    if (e.pointerType === 'mouse') return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    bodyDragRef.current = { part, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const onBodyPM = (e: React.PointerEvent) => {
    const d = bodyDragRef.current;
    if (!d || d.part === 'Rest') return;
    if (!d.dragging && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 15) {
      d.dragging = true;
      bodyGhostRef.current = makeGhost(d.part.toUpperCase());
    }
    if (bodyGhostRef.current) {
      moveGhost(bodyGhostRef.current, e.clientX, e.clientY);
      setBodyDropActive(isOverZone(bodyDropRef.current, e.clientX, e.clientY));
    }
  };

  const onBodyPU = (e: React.PointerEvent) => {
    const d = bodyDragRef.current;
    if (!d) return;
    bodyDragRef.current = null;
    if (bodyGhostRef.current) { document.body.removeChild(bodyGhostRef.current); bodyGhostRef.current = null; }
    if (d.dragging && isOverZone(bodyDropRef.current, e.clientX, e.clientY)) {
      togglePart(selectedDay, d.part);
    }
    setBodyDropActive(false);
  };

  const onBodyPC = () => {
    if (bodyGhostRef.current) { document.body.removeChild(bodyGhostRef.current); bodyGhostRef.current = null; }
    bodyDragRef.current = null;
    setBodyDropActive(false);
  };

  // ── Profile helpers ──────────────────────────────────────────────────────

  const getProfileDraft = () => {
    if (!name.trim()) return null;
    const bodyName      = bodyItem?.name ?? 'Body';
    const selectedNames = Array.from(selected)
      .map(id => allEquipment.find(e => e.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return { name: name.trim(), equipment: [bodyName, ...selectedNames] };
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

  const clearAll = () => setSchedule({});

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

  const handleSelectBP = (bp: string) => {
    if (activeBP === bp) { setActiveBP(null); setBpExercises([]); return; }
    setActiveBP(bp);
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
    setWorkout(prev => {
      const cur = prev[workoutDay] ?? [];
      if (cur.some(e => e.exerciseId === ex.id)) return prev;
      const repType = ex.repType ?? 'count';
      return {
        ...prev,
        [workoutDay]: [...cur, {
          exerciseId: ex.id,
          exerciseName: ex.name,
          bodyPart: ex.bodyPart,
          sets: [{ repType, reps: repType === 'time' ? 30 : 10, restSeconds: 60 }],
        }],
      };
    });
  };

  const removeExercise = (day: string, exIdx: number) =>
    setWorkout(prev => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== exIdx) }));

  const addSet = (day: string, exIdx: number) =>
    setWorkout(prev => {
      const exs = [...(prev[day] ?? [])];
      const ex  = { ...exs[exIdx] };
      const last = ex.sets[ex.sets.length - 1] ?? { repType: 'count' as const, reps: 10, restSeconds: 60 };
      ex.sets = [...ex.sets, { ...last }];
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const removeSet = (day: string, exIdx: number, setIdx: number) =>
    setWorkout(prev => {
      const exs = [...(prev[day] ?? [])];
      const ex  = { ...exs[exIdx] };
      if (ex.sets.length <= 1) return prev;
      ex.sets = ex.sets.filter((_, i) => i !== setIdx);
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const toggleRepType = (day: string, exIdx: number, setIdx: number) =>
    setWorkout(prev => {
      const exs  = [...(prev[day] ?? [])];
      const ex   = { ...exs[exIdx] };
      const sets = [...ex.sets];
      const s    = sets[setIdx];
      sets[setIdx] = { ...s, repType: s.repType === 'count' ? 'time' : 'count', reps: s.repType === 'count' ? 30 : 10 };
      ex.sets = sets;
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const adjustReps = (day: string, exIdx: number, setIdx: number, delta: number) =>
    setWorkout(prev => {
      const exs  = [...(prev[day] ?? [])];
      const ex   = { ...exs[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], reps: Math.max(1, sets[setIdx].reps + delta) };
      ex.sets = sets;
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  const adjustRest = (day: string, exIdx: number, setIdx: number, delta: number) =>
    setWorkout(prev => {
      const exs  = [...(prev[day] ?? [])];
      const ex   = { ...exs[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], restSeconds: Math.max(0, sets[setIdx].restSeconds + delta) };
      ex.sets = sets;
      exs[exIdx] = ex;
      return { ...prev, [day]: exs };
    });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"
        style={{ height: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="sm:hidden w-10 h-1 rounded-full bg-gray-300 mx-auto" />
          <button
            type="button" onClick={onClose}
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
                ref={equipDropRef}
                onDragOver={handleEquipDragOver}
                onDragLeave={() => setEquipDropActive(false)}
                onDrop={handleEquipDrop}
                style={{
                  minHeight: 96, borderRadius: 12,
                  border: `2px dashed ${equipDropActive ? '#dc2626' : '#d1d5db'}`,
                  background: equipDropActive ? '#fff5f5' : '#fafafa',
                  display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 8, padding: 8,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <EquipmentCard label="BODY" active />
                {Array.from(selected).map(id => {
                  const eq = allEquipment.find(e => e.id === id);
                  if (!eq) return null;
                  return <EquipmentCard key={id} label={eq.name.toUpperCase()} active onRemove={() => removeEquip(id)} />;
                })}
                {selected.size === 0 && !equipDropActive && (
                  <span
                    className="pixel-font-small text-gray-300 m-auto pointer-events-none"
                    style={{ fontSize: '0.42rem', gridColumn: '1 / -1', alignSelf: 'center' }}
                  >
                    DRAG OR TAP TO ADD
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
                        draggable
                        onClick={() => setSelected(prev => new Set([...prev, eq.id]))}
                        onDragStart={e => handleEquipDragStart(e, eq.id)}
                        onPointerDown={e => onEquipPD(e, eq.id)}
                        onPointerMove={onEquipPM}
                        onPointerUp={onEquipPU}
                        onPointerCancel={onEquipPC}
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
          <div className="flex flex-col flex-1 min-h-0 pt-1 gap-0">

            <DayWheelH value={wheelDayIdx} onChange={setWheelDayIdx} />

            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-4 gap-4">

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500, fontSize: 15, color: '#111827' }}>My week</span>
                <button
                  type="button" onClick={clearAll}
                  style={{ fontSize: 13, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                >
                  Clear
                </button>
              </div>

              <div
                ref={bodyDropRef}
                onDragOver={handleBodyDragOver}
                onDragLeave={() => setBodyDropActive(false)}
                onDrop={handleBodyDrop}
                style={{
                  minHeight: 96, borderRadius: 12,
                  border: `0.5px ${bodyDropActive ? 'dashed' : 'solid'} ${bodyDropActive ? '#dc2626' : '#e5e7eb'}`,
                  background: bodyDropActive ? '#fff5f5' : '#fafafa',
                  padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'border-color 0.12s, background 0.12s',
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>{FULL_DAY[selectedDay]}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    {selectedBodyParts.length === 0 ? 'Rest day' : `${selectedBodyParts.length} part${selectedBodyParts.length > 1 ? 's' : ''}`}
                  </div>
                </div>
                {selectedBodyParts.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: '#d1d5db' }}>Drag or tap to add</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {selectedBodyParts.map(part => (
                      <button
                        key={part}
                        type="button"
                        onClick={() => togglePart(selectedDay, part)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '4px 8px 4px 10px', borderRadius: 999,
                          background: '#fef2f2', color: '#dc2626',
                          fontSize: 12, fontWeight: 500,
                          border: '0.5px solid #fecaca',
                          cursor: 'pointer',
                        }}
                      >
                        {part}
                        <span style={{ opacity: 0.45, fontSize: 15, lineHeight: 1 }}>×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-1 min-h-0">
                <label className="pixel-font-small tracking-widest text-gray-500">BODY PART</label>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, paddingBlock: 2 }}>
                    {BODY_PARTS_GRID.map(part => {
                      const isRest = part === 'Rest';
                      const active = isRest ? selectedBodyParts.length === 0 : selectedBodyParts.includes(part);
                      return (
                        <EquipmentCard
                          key={part}
                          label={part.toUpperCase()}
                          active={active}
                          draggable={!isRest && !active}
                          onClick={() => togglePart(selectedDay, part)}
                          onDragStart={!isRest && !active ? e => { e.dataTransfer.setData('text/plain', part); e.dataTransfer.effectAllowed = 'copy'; } : undefined}
                          onPointerDown={e => onBodyPD(e, part)}
                          onPointerMove={onBodyPM}
                          onPointerUp={onBodyPU}
                          onPointerCancel={onBodyPC}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

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

              {/* Day header */}
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, color: '#111827' }}>{FULL_DAY[workoutDay]}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {workoutBodyParts.length === 0 ? 'Rest day — no exercises' : workoutBodyParts.join(' · ')}
                </div>
              </div>

              {workoutBodyParts.length > 0 && (
                <>
                  {/* Body part filter pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {workoutBodyParts.map(bp => {
                      const isMissing = missingBPsForCurrentDay.includes(bp);
                      return (
                        <button
                          key={bp}
                          type="button"
                          onClick={() => handleSelectBP(bp)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 999,
                            background: activeBP === bp ? '#dc2626' : '#f9fafb',
                            color: activeBP === bp ? 'white' : '#374151',
                            border: `1px solid ${activeBP === bp ? '#dc2626' : isMissing ? '#f97316' : '#e5e7eb'}`,
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            transition: 'background 0.12s, color 0.12s',
                          }}
                        >
                          {bp}
                          {isMissing && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: activeBP === bp ? 'rgba(255,255,255,0.75)' : '#f97316',
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Exercise picker */}
                  {activeBP && (
                    <div style={{ background: '#fafafa', borderRadius: 10, padding: 10, border: '0.5px solid #e5e7eb' }}>
                      {loadingExercises ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {[70, 90, 60, 80, 65, 75].map((w, i) => (
                            <div key={i} className="skeleton" style={{ height: 26, width: w, borderRadius: 999 }} />
                          ))}
                        </div>
                      ) : bpExercises.length === 0 ? (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>No exercises found</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {bpExercises.map(ex => {
                            const already = workoutExercises.some(e => e.exerciseId === ex.id);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => !already && addExercise(ex)}
                                style={{
                                  padding: '4px 10px', borderRadius: 999,
                                  background: already ? '#f3f4f6' : '#fef2f2',
                                  color: already ? '#9ca3af' : '#dc2626',
                                  border: `0.5px solid ${already ? '#e5e7eb' : '#fecaca'}`,
                                  fontSize: 12, cursor: already ? 'default' : 'pointer',
                                  textDecoration: already ? 'line-through' : 'none',
                                }}
                              >
                                {ex.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {grouped.map(group => (
                    <div key={group.bp}>
                      {group.bp && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', padding: '8px 0 4px' }}>
                          {group.bp.toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.items.map(({ ex, exIdx }) => (
                    <div key={ex.exerciseId} style={{ borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                      {/* Exercise header */}
                      <div style={{
                        background: '#fafafa', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '0.5px solid #f3f4f6',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{ex.exerciseName}</span>
                        <button
                          type="button" onClick={() => removeExercise(workoutDay, exIdx)}
                          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>

                      {/* Header row */}
                      <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ fontSize: 10, color: '#9ca3af', width: 24, flexShrink: 0 }}></span>
                        <span style={{ fontSize: 10, color: '#9ca3af', width: 40, flexShrink: 0 }}>TYPE</span>
                        <span style={{ fontSize: 10, color: '#9ca3af', flex: 1, textAlign: 'center' }}>REPS / SEC</span>
                        <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 64, textAlign: 'center' }}>REST</span>
                        <span style={{ width: 18 }} />
                      </div>

                      {/* Sets */}
                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} style={{
                          padding: '6px 12px', borderBottom: '0.5px solid #f3f4f6',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 11, color: '#9ca3af', width: 24, flexShrink: 0 }}>S{setIdx + 1}</span>

                          {/* Rep type label (fixed per exercise) */}
                          <span style={{
                            fontSize: 9, padding: '2px 5px', borderRadius: 4, width: 40, textAlign: 'center',
                            background: set.repType === 'count' ? '#dbeafe' : '#dcfce7',
                            color: set.repType === 'count' ? '#1d4ed8' : '#16a34a',
                            fontWeight: 600,
                          }}>
                            {set.repType === 'count' ? 'REPS' : 'TIME'}
                          </span>

                          {/* Reps / duration */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, justifyContent: 'center' }}>
                            <button type="button" onClick={() => adjustReps(workoutDay, exIdx, setIdx, -1)} style={adjBtnStyle}>−</button>
                            <span style={{ fontSize: 12, minWidth: 28, textAlign: 'center', fontWeight: 500 }}>
                              {set.repType === 'count' ? set.reps : `${set.reps}s`}
                            </span>
                            <button type="button" onClick={() => adjustReps(workoutDay, exIdx, setIdx, 1)} style={adjBtnStyle}>+</button>
                          </div>

                          {/* Rest */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 64, justifyContent: 'center' }}>
                            <button type="button" onClick={() => adjustRest(workoutDay, exIdx, setIdx, -15)} style={adjBtnStyle}>−</button>
                            <span style={{ fontSize: 12, minWidth: 28, textAlign: 'center' }}>{set.restSeconds}s</span>
                            <button type="button" onClick={() => adjustRest(workoutDay, exIdx, setIdx, 15)} style={adjBtnStyle}>+</button>
                          </div>

                          {/* Remove set */}
                          <button
                            type="button" onClick={() => removeSet(workoutDay, exIdx, setIdx)}
                            style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, width: 18, padding: 0 }}
                          >×</button>
                        </div>
                      ))}

                      {/* Add set */}
                      <button
                        type="button" onClick={() => addSet(workoutDay, exIdx)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '6px 12px', fontSize: 11, color: '#dc2626',
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        + Set
                      </button>
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

                    {/* Exercise cards */}
                    {exs.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {exs.map((ex, exIdx) => (
                          <div key={ex.exerciseId} style={{ borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                            {/* Exercise header */}
                            <div style={{ background: '#fafafa', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #f3f4f6' }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{ex.exerciseName}</span>
                              <button type="button" onClick={() => removeExercise(day, exIdx)}
                                style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
                            </div>

                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 18px', gap: 4, padding: '6px 12px 2px', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: '#9ca3af' }} />
                              <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Reps / Time</span>
                              <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Rest</span>
                              <span />
                            </div>

                            {/* Set rows */}
                            {ex.sets.map((set, setIdx) => (
                              <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 18px', gap: 4, padding: '4px 12px', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: 10, borderRadius: 4, padding: '2px 4px', textAlign: 'center',
                                  background: set.repType === 'count' ? '#dbeafe' : '#dcfce7',
                                  color: set.repType === 'count' ? '#1d4ed8' : '#16a34a', fontWeight: 600,
                                }}>{set.repType === 'count' ? 'reps' : 'time'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                  <button type="button" style={adjBtnStyle} onClick={() => adjustReps(day, exIdx, setIdx, -1)}>−</button>
                                  <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center', fontWeight: 500 }}>
                                    {set.repType === 'count' ? set.reps : `${set.reps}s`}
                                  </span>
                                  <button type="button" style={adjBtnStyle} onClick={() => adjustReps(day, exIdx, setIdx, 1)}>+</button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                  <button type="button" style={adjBtnStyle} onClick={() => adjustRest(day, exIdx, setIdx, -15)}>−</button>
                                  <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center' }}>{set.restSeconds}s</span>
                                  <button type="button" style={adjBtnStyle} onClick={() => adjustRest(day, exIdx, setIdx, 15)}>+</button>
                                </div>
                                <button type="button" onClick={() => removeSet(day, exIdx, setIdx)}
                                  style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, justifySelf: 'center' }}>×</button>
                              </div>
                            ))}

                            {/* Add set */}
                            <button type="button" onClick={() => addSet(day, exIdx)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                              + Set
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
      </div>
    </div>
  );
}
