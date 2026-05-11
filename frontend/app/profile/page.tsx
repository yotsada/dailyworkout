'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TiltButton } from '../components/TiltButton';
import {
  AddProfileModal, DAYS, DAY_COLORS,
  type ProfileData, type WorkoutScheduleDay, type WorkoutDay, type WorkoutExercise, type WorkoutSet,
} from './AddProfileModal';

// ── Helpers ────────────────────────────────────────────────────────────────

function encodeProfile(data: ProfileData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
function decodeProfile(code: string): ProfileData {
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

// ── Icons ──────────────────────────────────────────────────────────────────

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 100 100" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
      <circle cx="50" cy="50" r="30" /><line x1="50" y1="32" x2="50" y2="68" /><line x1="32" y1="50" x2="68" y2="50" />
    </svg>
  );
}
function ImportIcon() {
  return (
    <svg viewBox="0 0 100 100" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="50" y1="18" x2="50" y2="60" /><polyline points="32,44 50,64 68,44" /><line x1="22" y1="78" x2="78" y2="78" />
    </svg>
  );
}

// ── ToggleSwitch ───────────────────────────────────────────────────────────

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        position: 'relative', flexShrink: 0, width: 44, height: 24,
        borderRadius: 9999, border: 'none', padding: 0, cursor: 'pointer',
        background: on ? '#16a34a' : '#d1d5db',
        boxShadow: on ? '0 2px 0 0 #15803d' : '0 2px 0 0 #9ca3af',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease', outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 2, width: 20, height: 20,
        borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  );
}

// ── DayList — shared schedule display ─────────────────────────────────────

function DayList({ schedule, workout }: { schedule?: WorkoutScheduleDay[]; workout?: WorkoutDay[] }) {
  return (
    <>
      {DAYS.map((day, i) => {
        const schedDay = (schedule ?? []).find(s => s.day === day);
        const workDay  = (workout  ?? []).find(w => w.day === day);
        const parts    = schedDay?.bodyParts ?? [];
        const exs      = workDay?.exercises  ?? [];
        const isRest   = parts.length === 0;
        const c        = DAY_COLORS[i];
        return (
          <div key={day} style={{ paddingBlock: 8, borderBottom: i < DAYS.length - 1 ? '0.5px solid #f9fafb' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <div style={{
                flexShrink: 0, width: 40, height: 22, borderRadius: 5,
                background: isRest ? '#f3f4f6' : c.surface, color: isRest ? '#9ca3af' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              }}>{day}</div>
              {isRest ? (
                <span style={{ fontSize: 11, color: '#9ca3af' }}>REST</span>
              ) : (
                parts.map(part => (
                  <span key={part} style={{
                    padding: '2px 7px', borderRadius: 4, background: '#f3f4f6', color: '#374151',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  }}>{part.toUpperCase()}</span>
                ))
              )}
            </div>
            {exs.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: 47, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {exs.map(ex => {
                  const sets = ex.sets ?? [];
                  const allSame = sets.length > 0 && sets.every(s =>
                    s.repType === sets[0].repType && s.reps === sets[0].reps && s.restSeconds === sets[0].restSeconds
                  );
                  return (
                    <div key={ex.exerciseId}>
                      <div style={{ fontSize: 11, color: '#111827', fontWeight: 500 }}>{ex.exerciseName}</div>
                      {allSame ? (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                          {sets[0].repType === 'count' ? `${sets[0].reps} reps` : `${sets[0].reps}s`}
                          {sets.length > 1 && <span style={{ color: '#dc2626', fontWeight: 600 }}> ×{sets.length}</span>}
                          {'  '}rest {sets[0].restSeconds}s
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                          {sets.map((s, si) => (
                            <div key={si} style={{ fontSize: 10, color: '#9ca3af' }}>
                              S{si + 1}{'  '}{s.repType === 'count' ? `${s.reps} reps` : `${s.reps}s`}{'  '}rest {s.restSeconds}s
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Profile interface ──────────────────────────────────────────────────────

interface Profile extends ProfileData { id: string; }

// ── ShareModal ─────────────────────────────────────────────────────────────

function ShareModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const code = useMemo(() => encodeProfile({
    name: profile.name, equipment: profile.equipment,
    schedule: profile.schedule, workout: profile.workout,
  }), [profile]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl mx-6 flex flex-col gap-4"
        style={{ width: '100%', maxWidth: 340, padding: '24px 24px 28px' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.45rem', marginBottom: 4 }}>SHARE PROFILE</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{profile.name}</p>
        </div>
        <textarea
          readOnly value={code}
          style={{
            width: '100%', height: 90, resize: 'none', fontFamily: 'monospace', fontSize: 10,
            border: '1px solid #e5e7eb', borderRadius: 8, padding: 8,
            color: '#6b7280', background: '#f9fafb', outline: 'none',
          }}
        />
        <TiltButton
          surface={copied ? '#16a34a' : '#dc2626'}
          side={copied ? '#15803d' : '#991b1b'}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2"
        >
          {copied ? 'COPIED!' : 'COPY CODE'}
        </TiltButton>
      </div>
    </div>
  );
}

// ── ImportModal ────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImport, existingNames }: {
  onClose: () => void;
  onImport: (data: ProfileData) => void;
  existingNames: string[];
}) {
  const [code, setCode]           = useState('');
  const [parsed, setParsed]       = useState<ProfileData | null>(null);
  const [error, setError]         = useState('');
  const [nameConflict, setNameConflict] = useState(false);
  const [rename, setRename]       = useState('');

  const handlePreview = () => {
    try {
      const data = decodeProfile(code);
      setParsed(data);
      setError('');
      if (existingNames.includes(data.name)) {
        setNameConflict(true);
        setRename(data.name + ' (2)');
      } else {
        setNameConflict(false);
        setRename('');
      }
    } catch {
      setError('Invalid code. Please check and try again.');
    }
  };

  const handleImport = () => {
    if (!parsed) return;
    const finalName = nameConflict ? rename.trim() : parsed.name;
    if (!finalName) return;
    onImport({ ...parsed, name: finalName });
  };

  const displayName = nameConflict ? rename : (parsed?.name ?? '');
  const canImport   = parsed && (!nameConflict || rename.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full max-w-sm mx-4 rounded-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>Import Profile</span>
          <button type="button" onClick={onClose}
            className="flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
            style={{ width: 30, height: 30 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-5 py-4 gap-4">

          {/* Code input */}
          {!parsed && (
            <div className="flex flex-col gap-2">
              <label className="pixel-font-small tracking-widest text-gray-500">PASTE CODE</label>
              <textarea
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                placeholder="Paste code here..."
                style={{
                  width: '100%', height: 80, resize: 'none', fontFamily: 'monospace', fontSize: 16,
                  border: `1px solid ${error ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8,
                  padding: 8, color: '#374151', outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
              {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
              <TiltButton onClick={handlePreview} disabled={!code.trim()} className="w-full">
                PREVIEW
              </TiltButton>
            </div>
          )}

          {parsed && (
            <>
              {/* Name conflict warning */}
              {nameConflict && (
                <div className="flex flex-col gap-2">
                  <p style={{ fontSize: 12, color: '#dc2626' }}>
                    &ldquo;{parsed.name}&rdquo; already exists. Enter a new name.
                  </p>
                  <input
                    value={rename}
                    onChange={e => setRename(e.target.value)}
                    style={{
                      width: '100%', border: '1px solid #fca5a5', borderRadius: 6,
                      padding: '6px 10px', fontSize: 13, outline: 'none',
                    }}
                    placeholder="New name"
                  />
                </div>
              )}

              {/* Preview */}
              <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f3f4f6', background: '#fafafa' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {(parsed.equipment ?? []).join(' · ')}
                  </div>
                </div>
                <div style={{ padding: '4px 14px 10px' }}>
                  <DayList schedule={parsed.schedule} workout={parsed.workout} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <TiltButton surface="#f3f4f6" side="#d1d5db" textColor="#374151"
                  onClick={() => { setParsed(null); setError(''); }}
                  className="flex-1"
                >
                  BACK
                </TiltButton>
                <TiltButton onClick={handleImport} disabled={!canImport} className="flex-1">
                  IMPORT
                </TiltButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ProfileDetail ──────────────────────────────────────────────────────────

function ProfileDetail({ profile, onDelete, onEdit }: {
  profile: Profile;
  onDelete: () => void;
  onEdit: (mode: 'equipment' | 'setrep') => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShare,   setShowShare]   = useState(false);

  return (
    <>
      <div style={{ borderTop: '0.5px solid #f3f4f6', padding: '8px 16px 12px' }}>

        {/* Action buttons — top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
          <span onClick={e => e.stopPropagation()}>
            <TiltButton tile surface="#f9fafb" side="#d1d5db" textColor="#6b7280"
              onClick={() => onEdit('setrep')}
              className="flex items-center justify-center w-9 h-9"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </TiltButton>
          </span>
          <span onClick={e => e.stopPropagation()}>
            <TiltButton tile surface="#f9fafb" side="#d1d5db" textColor="#6b7280"
              onClick={() => setShowShare(true)}
              className="flex items-center justify-center w-9 h-9"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </TiltButton>
          </span>
          <span onClick={e => e.stopPropagation()}>
            <TiltButton tile surface="#fef2f2" side="#fecaca" textColor="#ef4444"
              onClick={() => setShowConfirm(true)}
              className="flex items-center justify-center w-9 h-9"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </TiltButton>
          </span>
        </div>

        <DayList schedule={profile.schedule} workout={profile.workout} />
      </div>

      {/* Share modal */}
      {showShare && <ShareModal profile={profile} onClose={() => setShowShare(false)} />}

      {/* Confirm delete */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl flex flex-col items-center gap-5 mx-6"
            style={{ padding: '28px 32px', minWidth: 240 }}
            onClick={e => e.stopPropagation()}
          >
            <p className="pixel-font-small tracking-widest text-gray-500" style={{ fontSize: '0.5rem' }}>DELETE PROFILE</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', textAlign: 'center' }}>{profile.name}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <TiltButton surface="#f3f4f6" side="#d1d5db" textColor="#374151" onClick={() => setShowConfirm(false)}>
                CANCEL
              </TiltButton>
              <TiltButton onClick={() => { setShowConfirm(false); onDelete(); }}>
                DELETE
              </TiltButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── EditSetRepModal ────────────────────────────────────────────────────────

const adjBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, background: '#f3f4f6',
  border: '0.5px solid #e5e7eb', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, color: '#374151', lineHeight: 1,
};

function EditSetRepModal({ profile, onClose, onSave, onEditEquipment }: {
  profile: Profile;
  onClose: () => void;
  onSave: (updated: ProfileData) => void;
  onEditEquipment: () => void;
}) {
  const initWorkout = (): Record<string, WorkoutExercise[]> => {
    if (!profile.workout) return {};
    return Object.fromEntries((profile.workout as WorkoutDay[]).map(d => [d.day, d.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }))]));
  };
  const initSchedule = (): Record<string, string[]> => {
    if (!profile.schedule) return {};
    return Object.fromEntries((profile.schedule as WorkoutScheduleDay[]).map(d => [d.day, d.bodyParts]));
  };

  const [workout, setWorkout] = useState<Record<string, WorkoutExercise[]>>(initWorkout);
  const [schedule] = useState<Record<string, string[]>>(initSchedule);  // read-only

  const adjust = (day: string, exIdx: number, setIdx: number, field: 'reps' | 'restSeconds', delta: number) =>
    setWorkout(prev => {
      const days = { ...prev };
      const exs  = (days[day] ?? []).map((e, ei) => ei !== exIdx ? e : {
        ...e,
        sets: e.sets.map((s, si) => si !== setIdx ? s : {
          ...s,
          [field]: Math.max(field === 'reps' ? 1 : 0, s[field] + delta),
        }),
      });
      return { ...days, [day]: exs };
    });

  const toggleType = (day: string, exIdx: number, setIdx: number) =>
    setWorkout(prev => {
      const days = { ...prev };
      const exs  = (days[day] ?? []).map((e, ei) => ei !== exIdx ? e : {
        ...e,
        sets: e.sets.map((s, si) => si !== setIdx ? s : {
          ...s, repType: s.repType === 'count' ? 'time' : 'count',
          reps: s.repType === 'count' ? 30 : 10,
        }),
      });
      return { ...days, [day]: exs };
    });

  const removeSet = (day: string, exIdx: number, setIdx: number) =>
    setWorkout(prev => {
      const days = { ...prev };
      const exs  = (days[day] ?? []).map((e, ei) => ei !== exIdx ? e : {
        ...e, sets: e.sets.length > 1 ? e.sets.filter((_, si) => si !== setIdx) : e.sets,
      });
      return { ...days, [day]: exs };
    });

  const addSet = (day: string, exIdx: number) =>
    setWorkout(prev => {
      const days = { ...prev };
      const exs  = (days[day] ?? []).map((e, ei) => {
        if (ei !== exIdx) return e;
        const last = e.sets[e.sets.length - 1] ?? { repType: 'count' as const, reps: 10, restSeconds: 60 };
        return { ...e, sets: [...e.sets, { ...last }] };
      });
      return { ...days, [day]: exs };
    });

  const removeExercise = (day: string, exIdx: number) =>
    setWorkout(prev => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== exIdx) }));

  const handleSave = () => {
    onSave({
      name:      profile.name,
      equipment: profile.equipment,
      schedule:  DAYS.map(day => ({ day, bodyParts: schedule[day] ?? [] })),
      workout:   DAYS.map(day => ({ day, exercises: workout[day] ?? [] })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full max-w-sm mx-4 rounded-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{profile.name}</span>
            <p className="pixel-font-small text-gray-400 mt-0.5" style={{ fontSize: '0.42rem' }}>
              แก้ไข Set / Rep
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
            style={{ width: 30, height: 30 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          {DAYS.map((day, di) => {
            const exs   = workout[day] ?? [];
            const parts = schedule[day] ?? [];
            const c     = DAY_COLORS[di];
            if (exs.length === 0) return null;
            return (
              <div key={day} style={{ marginBottom: 20 }}>
                {/* Day header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{
                    flexShrink: 0, width: 44, height: 24, borderRadius: 6,
                    background: c.surface, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  }}>{day}</div>
                  {parts.map(p => (
                    <span key={p} style={{
                      padding: '3px 8px', borderRadius: 4, background: '#f3f4f6',
                      color: '#374151', fontSize: 11, fontWeight: 600,
                    }}>{p.toUpperCase()}</span>
                  ))}
                </div>

                {/* Exercises */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {exs.map((ex, exIdx) => (
                    <div key={ex.exerciseId} style={{ borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                      {/* Exercise name row */}
                      <div style={{
                        background: '#fafafa', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '0.5px solid #f3f4f6',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{ex.exerciseName}</span>
                        <button type="button" onClick={() => removeExercise(day, exIdx)}
                          style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>

                      {/* Set header */}
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
                            color: set.repType === 'count' ? '#1d4ed8' : '#16a34a',
                            fontWeight: 600,
                          }}>{set.repType === 'count' ? 'reps' : 'time'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <button type="button" style={adjBtn} onClick={() => adjust(day, exIdx, setIdx, 'reps', -1)}>−</button>
                            <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center', fontWeight: 500 }}>
                              {set.repType === 'count' ? set.reps : `${set.reps}s`}
                            </span>
                            <button type="button" style={adjBtn} onClick={() => adjust(day, exIdx, setIdx, 'reps', 1)}>+</button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <button type="button" style={adjBtn} onClick={() => adjust(day, exIdx, setIdx, 'restSeconds', -15)}>−</button>
                            <span style={{ fontSize: 12, minWidth: 32, textAlign: 'center' }}>{set.restSeconds}s</span>
                            <button type="button" style={adjBtn} onClick={() => adjust(day, exIdx, setIdx, 'restSeconds', 15)}>+</button>
                          </div>
                          <button type="button" onClick={() => removeSet(day, exIdx, setIdx)}
                            style={{ color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, justifySelf: 'center' }}
                          >×</button>
                        </div>
                      ))}

                      {/* Add set */}
                      <button type="button" onClick={() => addSet(day, exIdx)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                      >+ Set</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <div className="flex gap-3">
            <TiltButton surface="#f3f4f6" side="#d1d5db" textColor="#374151" onClick={onClose} className="flex-1">
              CANCEL
            </TiltButton>
            <TiltButton onClick={handleSave} className="flex-1">
              SAVE
            </TiltButton>
          </div>
          <TiltButton surface="#f9fafb" side="#d1d5db" textColor="#6b7280" onClick={onEditEquipment} className="w-full">
            เปลี่ยนอุปกรณ์ / ท่าทาง
          </TiltButton>
        </div>
      </div>
    </div>
  );
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [ready, setReady]           = useState(false);
  const [profiles, setProfiles]     = useState<Profile[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeKey, setActiveKey]   = useState('activeProfileId');
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editMode,   setEditMode]   = useState<'equipment' | 'setrep' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      const key  = `activeProfileId_${user.id ?? 'guest'}`;
      setActiveKey(key);
      setActiveId(localStorage.getItem(key));
    } catch {}
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/profiles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const normalized = (data as any[]).map(p => ({
          id: p.id,
          name: p.name,
          equipment: (p.equipment ?? []).map((e: any) =>
            typeof e === 'string' ? e : (e.equipment?.name ?? '')
          ),
          schedule: (p.days ?? []).map((d: any) => ({
            day: d.day,
            bodyParts: d.bodyParts ?? [],
          })),
          workout: (p.days ?? []).map((d: any) => ({
            day: d.day,
            exercises: (d.exercises ?? [])
              .sort((a: any, b: any) => a.order - b.order)
              .map((ex: any) => ({
                exerciseId: ex.exerciseId,
                exerciseName: ex.exercise?.name ?? '',
                bodyPart: ex.exercise?.bodyPart ?? '',
                sets: (ex.sets ?? [])
                  .sort((a: any, b: any) => a.setNumber - b.setNumber)
                  .map((s: any) => ({
                    repType: s.repType,
                    reps: s.repType === 'time' ? (s.duration ?? 0) : (s.reps ?? 0),
                    restSeconds: s.restSeconds,
                  })),
              })),
          })),
        }));
        setProfiles(normalized as Profile[]);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen flex justify-center">
      <div className="bg-white w-full max-w-sm flex flex-col px-6 py-8"
        style={{ paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
        <div className="skeleton h-3 w-14 mb-8 rounded" />
        <div className="flex flex-col gap-3 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border-2 border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="skeleton h-3 w-28 rounded" />
                <div className="skeleton h-5 w-10 rounded-full" />
              </div>
              <div className="skeleton h-2 w-40 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleSave = async (data: ProfileData) => {
    let id = crypto.randomUUID();
    try {
      const base  = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch(`${base}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) { const json = await res.json(); if (json?.id) id = json.id; }
    } catch {}
    setProfiles(prev => [...prev, { id, ...data }]);
    setShowAdd(false);
    setShowImport(false);
  };

  const handleToggle = (id: string) => {
    const next = activeId === id ? null : id;
    setActiveId(next);
    if (next) localStorage.setItem(activeKey, next);
    else localStorage.removeItem(activeKey);
  };

  const handleDelete = async (id: string) => {
    try {
      const base  = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const token = localStorage.getItem('token') ?? '';
      await fetch(`${base}/profiles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeId   === id) { setActiveId(null); localStorage.removeItem(activeKey); }
    if (expandedId === id) setExpandedId(null);
  };

  const handleEditSave = async (data: ProfileData) => {
    if (!editTarget) return;
    const id = editTarget.id;
    try {
      const base  = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const token = localStorage.getItem('token') ?? '';
      await fetch(`${base}/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    } catch {}
    const normalized = {
      id,
      ...data,
      equipment: data.equipment ?? editTarget.equipment,
    };
    setProfiles(prev => prev.map(p => p.id === id ? normalized as Profile : p));
    setEditTarget(null);
    setEditMode(null);
  };

  const existingNames = profiles.map(p => p.name);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="bg-white w-full max-w-sm flex flex-col px-6 py-8"
        style={{ paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.push('/home')}
          className="self-start pixel-font-small text-red-400 tracking-widest mb-8 hover:text-red-700 transition-colors"
        >
          &lt; BACK
        </button>

        {profiles.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            {profiles.map(profile => {
              const isActive   = activeId   === profile.id;
              const isExpanded = expandedId === profile.id;
              return (
                <div
                  key={profile.id}
                  className="rounded-xl border-2 overflow-hidden cursor-pointer"
                  style={{
                    borderColor: isActive ? '#dc2626' : '#e5e7eb',
                    background:  isActive ? '#fff5f5' : '#fff',
                    transition:  'border-color 0.2s ease, background-color 0.2s ease',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="pixel-font-small text-gray-800 truncate">{profile.name}</p>
                      <ToggleSwitch on={isActive} onChange={() => handleToggle(profile.id)} />
                    </div>
                    <p className="pixel-font-small text-gray-400 mt-2 leading-relaxed" style={{ fontSize: '0.42rem' }}>
                      {profile.equipment.map(e => e.toUpperCase()).join(' · ')}
                    </p>
                  </div>
                  <div style={{ maxHeight: isExpanded ? '800px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <ProfileDetail
                      profile={profile}
                      onDelete={() => handleDelete(profile.id)}
                      onEdit={(mode) => { setEditTarget(profile); setEditMode(mode); }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <TiltButton pill tile className="w-full py-4 flex items-center justify-center" onClick={() => setShowAdd(true)}>
            <PlusCircleIcon />
          </TiltButton>
          <TiltButton pill tile className="w-full py-4 flex items-center justify-center" onClick={() => setShowImport(true)}>
            <ImportIcon />
          </TiltButton>
        </div>

      </div>

      {showAdd && (
        <AddProfileModal onClose={() => setShowAdd(false)} onSave={handleSave} profileCount={profiles.length} />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={handleSave} existingNames={existingNames} />
      )}
      {editTarget && editMode === 'equipment' && (
        <AddProfileModal
          onClose={() => { setEditTarget(null); setEditMode(null); }}
          onSave={handleEditSave}
          profileCount={profiles.length}
          initialProfile={editTarget}
          initialStep="equipment"
        />
      )}
      {editTarget && editMode === 'setrep' && (
        <AddProfileModal
          onClose={() => { setEditTarget(null); setEditMode(null); }}
          onSave={handleEditSave}
          profileCount={profiles.length}
          initialProfile={editTarget}
          initialStep="summary"
        />
      )}
    </div>
  );
}
