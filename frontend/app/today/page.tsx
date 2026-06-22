'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiltButton } from '../components/TiltButton';
import type { WorkoutExercise, WorkoutDay } from '../profile/AddProfileModal';
import { loadWorkoutSettings } from '../setting/page';
import { getExerciseImageUrl } from '../lib/exerciseImages';

const DAY_JS    = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Phase  = 'set' | 'timing' | 'rest' | 'rest_pending';
type Screen = 'list' | 'working' | 'all_done';

interface WS {
  exercises: WorkoutExercise[];
  done:      boolean[];
  activeIdx: number;
  setIdx:    number;
  phase:     Phase;
  secsLeft:  number;
  screen:    Screen;
}

type Act =
  | { type: 'load';       exercises: WorkoutExercise[]; done?: boolean[]; screen?: Screen }
  | { type: 'pick';       idx: number }
  | { type: 'back' }
  | { type: 'rep_done';   autoStart: boolean }
  | { type: 'start_timer' }
  | { type: 'tick' }
  | { type: 'skip_rest' }
  | { type: 'start_rest' };

function finishExercise(s: WS): WS {
  const done = s.done.map((v, i) => i === s.activeIdx ? true : v);
  return { ...s, done, screen: done.every(Boolean) ? 'all_done' : 'list' };
}

function advanceSet(s: WS): WS {
  const cur = s.exercises[s.activeIdx];
  if (s.setIdx + 1 < cur.sets.length) return { ...s, setIdx: s.setIdx + 1, phase: 'set' };
  return finishExercise(s);
}

function afterSet(s: WS, autoStart: boolean): WS {
  const rest = s.exercises[s.activeIdx]?.sets[s.setIdx]?.restSeconds ?? 0;
  if (rest > 0) return { ...s, phase: autoStart ? 'rest' : 'rest_pending', secsLeft: rest };
  return advanceSet(s);
}

function reducer(s: WS, a: Act): WS {
  switch (a.type) {
    case 'load':
      return { ...s, exercises: a.exercises, done: a.done ?? a.exercises.map(() => false), screen: a.screen ?? 'list' };
    case 'pick':
      return { ...s, activeIdx: a.idx, setIdx: 0, phase: 'set', screen: 'working' };
    case 'rep_done':
      return afterSet(s, a.autoStart);
    case 'start_timer': {
      const secs = s.exercises[s.activeIdx]?.sets[s.setIdx]?.reps ?? 0;
      return { ...s, phase: 'timing', secsLeft: secs };
    }
    case 'tick':
      if (s.secsLeft <= 1) {
        if (s.phase === 'timing') return afterSet({ ...s, secsLeft: 0 }, true);
        if (s.phase === 'rest')   return advanceSet({ ...s, secsLeft: 0 });
      }
      return { ...s, secsLeft: s.secsLeft - 1 };
    case 'back':
      return { ...s, screen: 'list', setIdx: 0, phase: 'set' };
    case 'skip_rest':
      return (s.phase === 'rest' || s.phase === 'rest_pending') ? advanceSet(s) : s;
    case 'start_rest':
      return s.phase === 'rest_pending' ? { ...s, phase: 'rest' } : s;
    default: return s;
  }
}

const INIT: WS = { exercises: [], done: [], activeIdx: 0, setIdx: 0, phase: 'set', secsLeft: 0, screen: 'list' };

// ── Web Audio beep ─────────────────────────────────────────────────────────

function playBeep(freq = 880, duration = 0.2) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

// ── Exercise flip image ────────────────────────────────────────────────────

function ExerciseFlipImage({ externalId }: { externalId: string | null | undefined }) {
  const [frame, setFrame]         = useState<0 | 1>(0);
  const [frame0ok, setFrame0ok]   = useState(false);
  const [frame1ok, setFrame1ok]   = useState(false);
  const [settled, setSettled]     = useState(false); // both attempted (load OR error)

  useEffect(() => {
    if (!externalId) { setSettled(true); return; }
    setFrame0ok(false); setFrame1ok(false); setSettled(false); setFrame(0);

    let attempts = 0;
    const done = () => { if (++attempts === 2) setSettled(true); };

    const img0 = new window.Image();
    img0.onload  = () => { setFrame0ok(true);  done(); };
    img0.onerror = () => {                      done(); };
    img0.src = getExerciseImageUrl(externalId, 0)!;

    const img1 = new window.Image();
    img1.onload  = () => { setFrame1ok(true);  done(); };
    img1.onerror = () => {                      done(); };
    img1.src = getExerciseImageUrl(externalId, 1)!;

    if (process.env.NODE_ENV === 'development') {
      console.log('[ExerciseFlip] loading', externalId);
    }
  }, [externalId]);

  // Only cycle if BOTH frames loaded successfully
  useEffect(() => {
    if (!frame0ok || !frame1ok) return;
    const id = setInterval(() => setFrame(f => (f === 0 ? 1 : 0)), 700);
    return () => clearInterval(id);
  }, [frame0ok, frame1ok]);

  const wrapStyle: React.CSSProperties = {
    width: '100%', borderRadius: 14, overflow: 'hidden',
    background: '#f3f4f6', aspectRatio: '1 / 1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  // No externalId or both images failed → placeholder
  if (!externalId || (settled && !frame0ok && !frame1ok)) {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 80 80" width="52" height="52" fill="none" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="64" height="64" rx="12" />
          <circle cx="28" cy="28" r="7" />
          <polyline points="8,56 26,38 42,50 56,34 72,56" />
        </svg>
      </div>
    );
  }

  // Still loading
  if (!settled) {
    return <div style={wrapStyle} className="skeleton" />;
  }

  // At least frame 0 loaded — show what we have
  const src = getExerciseImageUrl(externalId, frame1ok ? frame : 0)!;
  return (
    <div style={wrapStyle}>
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="11,6 5,12 11,18" />
      </svg>
    </button>
  );
}

function SetDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          borderRadius: '50%',
          background: i < current ? '#16a34a' : i === current ? '#dc2626' : '#e5e7eb',
          boxShadow: i === current ? '0 2px 0 #991b1b' : i < current ? '0 2px 0 #15803d' : '0 2px 0 #d1d5db',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const router = useRouter();
  const [ws, dispatch] = useReducer(reducer, INIT);
  const [status, setStatus] = useState<'loading' | 'no_profile' | 'rest_day' | 'ready'>('loading');
  const sessionKeyRef      = useRef<string | null>(null);
  const activeProfileIdRef = useRef<string | null>(null);
  const todayInProfileRef  = useRef<boolean>(false);

  // Settings refs (read once on mount, don't need re-render)
  const autoStartRef = useRef(true);
  const soundRef     = useRef(true);

  const now = new Date();
  const dateLabel = `${DAY_FULL[now.getDay()]}, ${now.getDate()} ${MON_SHORT[now.getMonth()]}`;

  useEffect(() => {
    const s = loadWorkoutSettings();
    autoStartRef.current = s.autoStartRest;
    soundRef.current     = s.sound;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }
    let activeId: string | null = null;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      activeId = localStorage.getItem(`activeProfileId_${user.id ?? 'guest'}`);
    } catch {}
    if (!activeId) { setStatus('no_profile'); return; }
    activeProfileIdRef.current = activeId;
    sessionKeyRef.current = `today_done_${activeId}_${now.toDateString()}`;

    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/profiles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (!Array.isArray(data)) { setStatus('no_profile'); return; }
        const profile = (data as any[]).find(p => p.id === activeId);
        if (!profile) { setStatus('no_profile'); return; }
        const todayStr = DAY_JS[now.getDay()];
        const todayDay = (profile.days ?? profile.workout ?? []).find((d: any) => d.day === todayStr);
        todayInProfileRef.current = !!todayDay;
        const exs: WorkoutExercise[] = (todayDay?.exercises ?? [])
          .sort((a: any, b: any) => a.order - b.order)
          .map((ex: any) => ({
            exerciseId:   ex.exerciseId,
            exerciseName: ex.exercise?.name ?? ex.exerciseName ?? '',
            bodyPart:     ex.exercise?.bodyPart ?? ex.bodyPart ?? '',
            externalId:   ex.exercise?.externalId ?? null,
            sets: (ex.sets ?? [])
              .sort((a: any, b: any) => a.setNumber - b.setNumber)
              .map((s: any) => ({
                repType:     s.repType,
                reps:        s.repType === 'time' ? (s.duration ?? 0) : (s.reps ?? 0),
                restSeconds: s.restSeconds,
              })),
          }));
        if (exs.length === 0) { setStatus('rest_day'); return; }
        let savedDone: boolean[] | undefined;
        let savedScreen: Screen | undefined;
        try {
          const raw = JSON.parse(localStorage.getItem(sessionKeyRef.current!) ?? 'null');
          if (raw?.done?.length === exs.length) { savedDone = raw.done; savedScreen = raw.screen; }
        } catch {}
        dispatch({ type: 'load', exercises: exs, done: savedDone, screen: savedScreen });
        setStatus('ready');
      })
      .catch(() => setStatus('no_profile'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Tick timer (only for 'timing' and 'rest' phases — not 'rest_pending')
  useEffect(() => {
    if (ws.screen !== 'working') return;
    if (ws.phase !== 'timing' && ws.phase !== 'rest') return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [ws.screen, ws.phase]);

  // Persist session progress
  useEffect(() => {
    if (!sessionKeyRef.current || ws.exercises.length === 0) return;
    try { localStorage.setItem(sessionKeyRef.current, JSON.stringify({ done: ws.done, screen: ws.screen })); } catch {}
  }, [ws.done, ws.screen, ws.exercises.length]);

  // Log workout progress
  useEffect(() => {
    if (status !== 'ready' || ws.exercises.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/workout-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        date,
        profileId: activeProfileIdRef.current,
        isRestDay: false,
        exercisesCompleted: ws.done.filter(Boolean).length,
        totalExercises: ws.exercises.length,
        exercises: ws.exercises.map((ex, i) => ({ name: ex.exerciseName, done: ws.done[i] ?? false })),
      }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.done, status]);

  // Log rest day
  useEffect(() => {
    if (status !== 'rest_day') return;
    if (todayInProfileRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/workout-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, profileId: activeProfileIdRef.current, isRestDay: true, exercisesCompleted: 0, totalExercises: 0, exercises: [] }),
    }).catch(() => {});
  }, [status]);

  // Sound: beep when rest ends naturally (rest → set) or starts (set → rest/rest_pending)
  const prevPhaseRef = useRef<Phase>('set');
  useEffect(() => {
    if (soundRef.current) {
      const from = prevPhaseRef.current;
      const to   = ws.phase;
      if (from === 'rest' && to === 'set') {
        playBeep(880, 0.25); // rest ended — back to work
      } else if (from === 'set' && (to === 'rest' || to === 'rest_pending')) {
        playBeep(440, 0.15); // rest starting — softer lower tone
      }
    }
    prevPhaseRef.current = ws.phase;
  }, [ws.phase]);

  // ── shell for simple states ─────────────────────────────────────────────
  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen flex justify-center" style={{ background: '#dc2626' }}>
      <div className="bg-white w-full sm:max-w-sm flex flex-col items-center justify-center gap-6"
        style={{ padding: 'env(safe-area-inset-top) max(24px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(24px, env(safe-area-inset-left))' }}>
        {content}
      </div>
    </div>
  );

  if (status === 'loading') return shell(
    <span className="pixel-font-small text-gray-400 tracking-widest">loading...</span>
  );
  if (status === 'no_profile') return shell(
    <>
      <p className="pixel-font-small text-gray-400 tracking-widest text-center">no active profile</p>
      <TiltButton onClick={() => router.push('/profile')}>SCHEDULE</TiltButton>
    </>
  );
  if (status === 'rest_day') return shell(
    <>
      <div className="text-center">
        <div className="pixel-font text-3xl font-black tracking-tight" style={{ color: '#dc2626' }}>REST DAY</div>
        <div className="pixel-font-small text-gray-400 mt-2 tracking-widest">{dateLabel}</div>
      </div>
      <TiltButton onClick={() => router.push('/home')}>HOME</TiltButton>
    </>
  );

  /* ── ALL DONE ──────────────────────────────────────────────────────────── */
  if (ws.screen === 'all_done') return (
    <div className="min-h-screen flex justify-center" style={{ background: '#dc2626' }}>
      <div className="bg-white w-full sm:max-w-sm flex flex-col items-center justify-center gap-6"
        style={{ padding: 'env(safe-area-inset-top) max(24px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(24px, env(safe-area-inset-left))' }}>
        <div className="text-center">
          <div className="pixel-font text-4xl font-black tracking-tight" style={{ color: '#16a34a' }}>DONE!</div>
          <div className="pixel-font-small text-gray-400 mt-3 tracking-widest">{dateLabel}</div>
        </div>
        <TiltButton surface="#16a34a" side="#15803d" onClick={() => router.push('/home')}>HOME</TiltButton>
      </div>
    </div>
  );

  /* ── EXERCISE LIST ─────────────────────────────────────────────────────── */
  if (ws.screen === 'list') {
    return (
      <div className="min-h-screen flex justify-center" style={{ background: '#dc2626' }}>
        <div className="bg-white w-full sm:max-w-sm flex flex-col" style={{ minHeight: '100dvh', paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))', paddingLeft: 'max(20px, env(safe-area-inset-left))', paddingRight: 'max(20px, env(safe-area-inset-right))' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <BackBtn onClick={() => router.push('/home')} />
            <div className="text-right">
              <div className="pixel-font-small tracking-widest" style={{ color: '#9ca3af', fontSize: '0.6rem' }}>
                {dateLabel.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-5 mt-3">
            <span className="pixel-font font-black tracking-tight" style={{ fontSize: '1.5rem', color: '#111827' }}>TODAY</span>
          </div>

          {/* Exercise cards */}
          <div className="flex flex-col gap-1 flex-1">
            {(() => {
              const grouped = ws.exercises.reduce<{ bp: string; items: { ex: typeof ws.exercises[0]; i: number }[] }[]>((acc, ex, i) => {
                const bp = ex.bodyPart ?? '';
                const g = acc.find(x => x.bp === bp);
                if (g) g.items.push({ ex, i });
                else acc.push({ bp, items: [{ ex, i }] });
                return acc;
              }, []);
              return grouped.map(group => (
                <div key={group.bp}>
                  {group.bp && (
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', padding: '10px 4px 4px' }}>
                      {group.bp.toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                  {group.items.map(({ ex, i }) => {
              const isDone = ws.done[i];
              const firstSet = ex.sets[0];
              const allSame = ex.sets.every(s => s.reps === firstSet?.reps && s.repType === firstSet?.repType);
              const setLabel = allSame && firstSet
                ? `${ex.sets.length} × ${firstSet.repType === 'time' ? `${firstSet.reps}s` : `${firstSet.reps} reps`}`
                : `${ex.sets.length} sets`;

              return (
                <button
                  key={ex.exerciseId}
                  type="button"
                  onClick={() => !isDone && dispatch({ type: 'pick', idx: i })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1.5px solid ${isDone ? '#bbf7d0' : '#e5e7eb'}`,
                    background: isDone ? '#f0fdf4' : '#ffffff',
                    boxShadow: isDone
                      ? '0 4px 0 #bbf7d0'
                      : '0 4px 0 #e5e7eb',
                    cursor: isDone ? 'default' : 'pointer',
                    textAlign: 'left', width: '100%',
                    transform: 'translateY(0)',
                    transition: 'box-shadow 0.1s, transform 0.1s',
                  }}
                  onMouseDown={e => { if (!isDone) (e.currentTarget as HTMLElement).style.transform = 'translateY(4px)'; (e.currentTarget as HTMLElement).style.boxShadow = isDone ? '0 0 0 #bbf7d0' : '0 0 0 #e5e7eb'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = isDone ? '0 4px 0 #bbf7d0' : '0 4px 0 #e5e7eb'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = isDone ? '0 4px 0 #bbf7d0' : '0 4px 0 #e5e7eb'; }}
                >
                  {/* Check circle */}
                  <div style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                    border: `2px solid ${isDone ? '#16a34a' : '#e5e7eb'}`,
                    background: isDone ? '#16a34a' : 'transparent',
                    boxShadow: isDone ? '0 2px 0 #15803d' : '0 2px 0 #d1d5db',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone
                      ? <svg viewBox="0 0 12 12" width="13" height="13" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 5,9 10,3" /></svg>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: '#d1d5db' }}>{i + 1}</span>
                    }
                  </div>

                  {/* Name + sets */}
                  <div className="flex-1 min-w-0">
                    <div style={{
                      fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
                      color: isDone ? '#16a34a' : '#111827',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ex.exerciseName}
                    </div>
                    <div style={{ fontSize: 11, color: isDone ? '#86efac' : '#9ca3af', marginTop: 2 }}>
                      {setLabel}
                      {firstSet && firstSet.restSeconds > 0 && (
                        <span style={{ marginLeft: 6 }}>· rest {firstSet.restSeconds}s</span>
                      )}
                    </div>
                  </div>

                  {!isDone && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13,6 19,12 13,18" />
                    </svg>
                  )}
                </button>
              );
            })}
                  </div>
                </div>
              ));
            })()}
          </div>

        </div>
      </div>
    );
  }

  /* ── WORKING VIEW ──────────────────────────────────────────────────────── */
  const { exercises, activeIdx, setIdx, phase, secsLeft } = ws;
  const ex  = exercises[activeIdx];
  const set = ex.sets[setIdx];
  const isResting = phase === 'rest' || phase === 'rest_pending';
  const isPending = phase === 'rest_pending';

  return (
    <div className="min-h-screen flex justify-center" style={{ background: isResting ? '#fff7ed' : '#f9fafb' }}>
      <div className="w-full sm:max-w-sm flex flex-col" style={{ minHeight: '100dvh', paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))', paddingLeft: 'max(20px, env(safe-area-inset-left))', paddingRight: 'max(20px, env(safe-area-inset-right))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <BackBtn onClick={() => dispatch({ type: 'back' })} />
        </div>

        {isResting ? (

          /* ── REST / REST_PENDING ── */
          <div className="flex flex-col flex-1 items-center justify-center gap-8">

            <div style={{
              width: '100%', borderRadius: 20,
              background: 'white',
              border: '1.5px solid #fed7aa',
              boxShadow: '0 6px 0 #fed7aa',
              padding: '40px 24px',
              textAlign: 'center',
            }}>
              <div className="pixel-font-small tracking-widest mb-4" style={{ color: '#f97316' }}>
                {isPending ? 'READY TO REST' : 'REST'}
              </div>
              <div className="pixel-font font-black" style={{
                fontSize: '7rem', lineHeight: 1, color: '#ea580c',
                textShadow: '0 6px 0 #fed7aa',
                opacity: isPending ? 0.5 : 1,
              }}>
                {secsLeft}
              </div>
              <div className="pixel-font-small tracking-widest mt-3" style={{ color: '#fdba74' }}>SEC</div>
            </div>

            {isPending ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <TiltButton surface="#f97316" side="#c2410c" onClick={() => dispatch({ type: 'start_rest' })}>
                  START REST
                </TiltButton>
                <TiltButton surface="#9ca3af" side="#6b7280" onClick={() => dispatch({ type: 'skip_rest' })}>
                  SKIP
                </TiltButton>
              </div>
            ) : (
              <TiltButton surface="#f97316" side="#c2410c" onClick={() => dispatch({ type: 'skip_rest' })}>
                SKIP
              </TiltButton>
            )}
          </div>

        ) : (

          /* ── SET / TIMING ── */
          <div className="flex flex-col flex-1 items-center gap-3" style={{ justifyContent: 'flex-start', paddingTop: 8 }}>

            {/* Flip image */}
            <div style={{ width: '100%' }}>
              <ExerciseFlipImage externalId={ex.externalId} />
            </div>

            {/* Exercise name */}
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              color: '#111827', textAlign: 'center',
            }}>
              {ex.exerciseName.toUpperCase()}
            </div>

            {/* Exercise card */}
            <div style={{
              width: '100%', borderRadius: 20,
              background: 'white',
              border: `1.5px solid ${phase === 'timing' ? '#fecaca' : '#e5e7eb'}`,
              boxShadow: `0 4px 0 ${phase === 'timing' ? '#fecaca' : '#e5e7eb'}`,
              padding: '16px 24px 20px',
              textAlign: 'center',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>

              {/* Big number */}
              <div className="pixel-font font-black" style={{
                fontSize: '5rem', lineHeight: 1,
                color: phase === 'timing' ? '#dc2626' : '#111827',
                textShadow: phase === 'timing' ? '0 4px 0 #fecaca' : '0 4px 0 #e5e7eb',
                transition: 'color 0.2s, text-shadow 0.2s',
              }}>
                {set.repType === 'time' && phase === 'timing' ? secsLeft : set.reps}
              </div>

              <div className="pixel-font-small tracking-widest mt-2" style={{
                color: phase === 'timing' ? '#f87171' : '#9ca3af',
              }}>
                {set.repType === 'time' ? 'SEC' : 'REPS'}
              </div>

            </div>

            {set.repType === 'time'
              ? phase !== 'timing' && (
                  <TiltButton onClick={() => dispatch({ type: 'start_timer' })}>START</TiltButton>
                )
              : null
            }

          </div>
        )}

      </div>

      {/* Fixed DONE button — count exercises only */}
      {ws.screen === 'working' && !isResting && ws.exercises[ws.activeIdx]?.sets[ws.setIdx]?.repType !== 'time' && (
        <div style={{
          position: 'fixed', bottom: 'max(64px, env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 10,
        }}>
          <TiltButton onClick={() => dispatch({ type: 'rep_done', autoStart: autoStartRef.current })}>DONE</TiltButton>
        </div>
      )}

    </div>
  );
}
