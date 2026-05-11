'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiltButton } from '../components/TiltButton';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function DumbbellIcon() {
  return (
    <svg viewBox="0 0 100 100" width="70" height="70" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <g transform="rotate(-40 50 50)">
        <line x1="25" y1="50" x2="75" y2="50"/>
        <rect x="8" y="40" width="17" height="20" rx="3"/>
        <rect x="12" y="34" width="8" height="32" rx="2"/>
        <rect x="75" y="40" width="17" height="20" rx="3"/>
        <rect x="80" y="34" width="8" height="32" rx="2"/>
      </g>
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 80 96" width="54" height="65" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="16" width="64" height="76" rx="5"/>
      <rect x="28" y="8" width="24" height="14" rx="4"/>
      <line x1="22" y1="44" x2="58" y2="44"/>
      <line x1="22" y1="57" x2="58" y2="57"/>
      <line x1="22" y1="70" x2="58" y2="70"/>
    </svg>
  );
}

function GearIcon() {
  const N = 7;
  const outerR = 32, innerR = 23, holeR = 11;
  const cx = 50, cy = 50;
  const step = (Math.PI * 2) / N;
  const toothFrac = 0.62;
  let d = '';

  for (let i = 0; i < N; i++) {
    const base = i * step - Math.PI / 2;
    const t2a = base + step * toothFrac;
    const v2a = base + step;

    const t1x = (cx + outerR * Math.cos(base)).toFixed(2);
    const t1y = (cy + outerR * Math.sin(base)).toFixed(2);
    const t2x = (cx + outerR * Math.cos(t2a)).toFixed(2);
    const t2y = (cy + outerR * Math.sin(t2a)).toFixed(2);
    const v1x = (cx + innerR * Math.cos(t2a)).toFixed(2);
    const v1y = (cy + innerR * Math.sin(t2a)).toFixed(2);
    const v2x = (cx + innerR * Math.cos(v2a)).toFixed(2);
    const v2y = (cy + innerR * Math.sin(v2a)).toFixed(2);

    d += i === 0 ? `M ${t1x} ${t1y} ` : `L ${t1x} ${t1y} `;
    d += `A ${outerR} ${outerR} 0 0 1 ${t2x} ${t2y} `;
    d += `L ${v1x} ${v1y} `;
    d += `A ${innerR} ${innerR} 0 0 1 ${v2x} ${v2y} `;
  }
  d += 'Z';

  return (
    <svg viewBox="0 0 100 100" width="58" height="58" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
      <circle cx={cx} cy={cy} r={holeR}/>
    </svg>
  );
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_HEADERS = ['S','M','T','W','T','F','S'];

interface ExEntry { name: string; done: boolean }
interface LogEntry {
  date: string;
  isRestDay: boolean;
  exercisesCompleted: number;
  totalExercises: number;
  exercises: ExEntry[];
}

type DayKind = 'rest' | 'full' | 'partial' | 'missed' | 'none';

const DOW_STRS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function dayKind(log: LogEntry | undefined, isPast: boolean, isWorkoutDay: boolean | null): DayKind {
  if (isWorkoutDay === null) {
    if (!log) return 'none';
    if (log.isRestDay) return 'rest';
    if (log.totalExercises > 0 && log.exercisesCompleted === log.totalExercises) return 'full';
    if (log.exercisesCompleted > 0) return 'partial';
    if (isPast && log.totalExercises > 0) return 'missed';
    return 'none';
  }
  if (!isWorkoutDay) return 'rest';
  if (!log || log.isRestDay) return isPast ? 'missed' : 'none';
  if (log.totalExercises > 0 && log.exercisesCompleted === log.totalExercises) return 'full';
  if (log.exercisesCompleted > 0) return 'partial';
  if (isPast) return 'missed';
  return 'none';
}

const KIND_STYLE: Record<DayKind, { bg: string; shadow: string; text: string }> = {
  rest:    { bg: '#4b5563', shadow: '#374151', text: 'white' },
  full:    { bg: '#16a34a', shadow: '#15803d', text: 'white' },
  partial: { bg: '#eab308', shadow: '#a16207', text: 'white' },
  missed:  { bg: '#dc2626', shadow: '#991b1b', text: 'white' },
  none:    { bg: 'transparent', shadow: 'transparent', text: '#374151' },
};

function DayDetailPopup({ log, isWorkoutDay, onClose }: { log: LogEntry; isWorkoutDay: boolean; onClose: () => void }) {
  const kind: DayKind = !isWorkoutDay
    ? 'rest'
    : log.totalExercises > 0 && log.exercisesCompleted === log.totalExercises
      ? 'full'
      : log.exercisesCompleted > 0
        ? 'partial'
        : 'missed';
  const exList = Array.isArray(log.exercises) ? (log.exercises as ExEntry[]) : [];
  const { bg } = KIND_STYLE[kind];

  const statusLabel =
    kind === 'rest'    ? 'REST DAY' :
    kind === 'full'    ? `DONE  ${log.exercisesCompleted} / ${log.totalExercises}` :
    kind === 'partial' ? `${log.exercisesCompleted} / ${log.totalExercises} done` :
    kind === 'missed'  ? 'MISSED' : '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: '20px 20px 0 0', width: 'min(390px, 100vw)', padding: '20px 20px 32px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="pixel-font-small tracking-widest" style={{ color: '#9ca3af', fontSize: '0.6rem' }}>{log.date}</div>
            <div className="pixel-font-small tracking-widest" style={{ color: bg, fontSize: '0.75rem', marginTop: 2 }}>{statusLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {exList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
            {exList.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                  background: ex.done ? '#16a34a' : '#f3f4f6',
                  border: `2px solid ${ex.done ? '#16a34a' : '#e5e7eb'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {ex.done
                    ? <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 5,9 10,3"/></svg>
                    : <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
                  }
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: ex.done ? '#374151' : '#9ca3af', textDecoration: ex.done ? 'none' : 'line-through' }}>
                  {ex.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: '12px 0' }}>no exercise data</p>
        )}
      </div>
    </div>
  );
}

function CalendarModal({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [logs, setLogs] = useState<Map<string, LogEntry>>(new Map());
  const [selected, setSelected] = useState<{ log: LogEntry; isWorkoutDay: boolean } | null>(null);
  const [workoutDays, setWorkoutDays] = useState<Set<string> | null>(null);

  const activeProfileId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return localStorage.getItem(`activeProfileId_${user.id ?? 'guest'}`);
    } catch { return null; }
  })();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !activeProfileId) return;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/profiles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const profile = data.find((p: any) => p.id === activeProfileId);
        if (!profile) return;
        setWorkoutDays(new Set<string>((profile.days ?? []).map((d: any) => d.day as string)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    setLogs(new Map());
    const profileParam = activeProfileId ? `&profileId=${activeProfileId}` : '';
    fetch(`${base}/workout-logs?year=${year}&month=${month}${profileParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: LogEntry[]) => {
        if (cancelled) return;
        const m = new Map<string, LogEntry>();
        data.forEach(e => m.set(e.date, e));
        setLogs(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [year, month]);

  const navigate = (dir: -1 | 1) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) { newYear--; newMonth = 12; }
    if (newMonth > 12) { newYear++; newMonth = 1; }
    setYear(newYear);
    setMonth(newMonth);
  };

  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const pad = (n: number) => String(n).padStart(2, '0');

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 20,
          padding: '24px 20px',
          width: 'min(340px, 92vw)',
          boxShadow: '0 8px 0 #e5e7eb',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#9ca3af' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </button>
          <span className="pixel-font-small tracking-widest" style={{ color: '#111827', fontSize: '0.75rem' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#9ca3af' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#d1d5db', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 0' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const log = logs.get(dateStr);
            const isPast = dateStr < todayStr;
            const isToday = dateStr === todayStr;
            const dow = DOW_STRS[new Date(year, month - 1, day).getDay()];
            const isWorkoutDay = workoutDays !== null ? workoutDays.has(dow) : null;
            const kind = dayKind(log, isPast || isToday, isWorkoutDay);
            const { bg, shadow, text } = KIND_STYLE[kind];
            const hasLog = kind !== 'none';

            const sublabel = '';

            return (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 0' }}
              >
                <div
                  onClick={() => log && setSelected({ log, isWorkoutDay: isWorkoutDay ?? true })}
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: bg,
                    border: isToday ? `2px solid ${kind === 'none' ? '#dc2626' : shadow}` : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: hasLog ? `0 2px 0 ${shadow}` : 'none',
                    cursor: log ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: kind === 'none' && isToday ? '#dc2626' : text, lineHeight: 1 }}>
                    {day}
                  </span>
                  {sublabel && (
                    <span style={{ fontSize: kind === 'rest' ? 6 : 7, color: 'rgba(255,255,255,0.85)', lineHeight: 1, marginTop: 1 }}>
                      {sublabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {([['#16a34a','done'],['#eab308','partial'],['#dc2626','missed'],['#4b5563','rest']] as const).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 9, color: '#9ca3af' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    {selected && <DayDetailPopup log={selected.log} isWorkoutDay={selected.isWorkoutDay} onClose={() => setSelected(null)} />}
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const now = useClock();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayAbbr = days[now.getDay()];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const tileClass = 'aspect-square flex flex-col items-center p-4';

  return (
    <div className="min-h-screen flex justify-center">
      <div className="bg-white w-full max-w-sm flex flex-col items-center justify-center px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-2 gap-3 w-full">

          <TiltButton tile className={tileClass} onClick={() => router.push('/today')}>
            <div className="flex-1 flex items-center justify-center">
              <DumbbellIcon />
            </div>
            <span className="pixel-font-small tracking-widest self-end">TODAY</span>
          </TiltButton>

          <TiltButton tile className={`${tileClass} justify-center gap-2`} onClick={() => setShowCalendar(true)}>
            <span className="pixel-font text-xl font-black tracking-tight leading-none">{dayAbbr}</span>
            <span className="pixel-font-small tracking-tight leading-none">{dateStr}</span>
            <span className="pixel-font text-2xl font-black tracking-tight leading-none">{timeStr}</span>
          </TiltButton>

          <TiltButton tile className={tileClass} onClick={() => router.push('/profile')}>
            <div className="flex-1 flex items-center justify-center">
              <ClipboardIcon />
            </div>
            <span className="pixel-font-small tracking-widest">schedule</span>
          </TiltButton>

          <TiltButton tile className={tileClass} onClick={() => router.push('/setting')}>
            <div className="flex-1 flex items-center justify-center">
              <GearIcon />
            </div>
            <span className="pixel-font-small tracking-widest">setting</span>
          </TiltButton>

        </div>
      </div>

      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
    </div>
  );
}
