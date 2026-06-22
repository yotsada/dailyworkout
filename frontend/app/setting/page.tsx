'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiltButton } from '../components/TiltButton';

// ── localStorage keys ──────────────────────────────────────────────────────

export const SETTING_KEYS = {
  defaultRest:   'setting_defaultRest',
  autoStartRest: 'setting_autoStartRest',
  sound:         'setting_sound',
} as const;

export function loadWorkoutSettings() {
  if (typeof window === 'undefined') return { defaultRest: 60, autoStartRest: true, sound: true };
  return {
    defaultRest:   Math.max(0, parseInt(localStorage.getItem(SETTING_KEYS.defaultRest)   ?? '60', 10) || 60),
    autoStartRest: localStorage.getItem(SETTING_KEYS.autoStartRest) !== 'false',
    sound:         localStorage.getItem(SETTING_KEYS.sound)         !== 'false',
  };
}

// ── Shared modal shell ─────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '70dvh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{title}</span>
          <button
            type="button" onClick={onClose}
            className="flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
            style={{ width: 30, height: 30 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-red-400';

// ── Change Username modal ──────────────────────────────────────────────────

function ChangeUsernameModal({ token, currentUsername, onClose, onDone }: {
  token: string; currentUsername: string;
  onClose: () => void;
  onDone: (res: { token: string; user: { id: string; username: string; role: string } }) => void;
}) {
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim() || value.trim() === currentUsername) return;
    setSaving(true); setError('');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/auth/change-username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newUsername: value.trim() }),
      });
      if (res.status === 409) { setError('Username already taken'); return; }
      if (!res.ok) { setError('Failed to update'); return; }
      onDone(await res.json());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change Username" onClose={onClose}>
      <input className={inputCls} value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
      <button type="button" onClick={handleSubmit}
        disabled={!value.trim() || value.trim() === currentUsername || saving}
        className="rounded-xl py-2 text-white text-sm font-medium disabled:opacity-40"
        style={{ background: '#dc2626', boxShadow: '0 3px 0 0 #991b1b' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ── Change Password modal ──────────────────────────────────────────────────

function ChangePasswordModal({ token, onClose, onDone }: {
  token: string; onClose: () => void; onDone: () => void;
}) {
  const [current, setCurrent]     = useState('');
  const [next, setNext]           = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async () => {
    if (!current || !next) return;
    if (next !== confirm) { setError('Passwords do not match'); return; }
    if (next.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setSaving(true); setError('');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.status === 401) { setError('Current password is incorrect'); return; }
      if (res.status === 400) { setError('Password login not available for this account'); return; }
      if (!res.ok) { setError('Failed to update'); return; }
      onDone();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change Password" onClose={onClose}>
      <input className={inputCls} placeholder="Current password" type="password"
        value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
      <input className={inputCls} placeholder="New password" type="password"
        value={next} onChange={e => setNext(e.target.value)} />
      <input className={inputCls} placeholder="Confirm new password" type="password"
        value={confirm} onChange={e => setConfirm(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
      <button type="button" onClick={handleSubmit}
        disabled={!current || !next || !confirm || saving}
        className="rounded-xl py-2 text-white text-sm font-medium disabled:opacity-40"
        style={{ background: '#dc2626', boxShadow: '0 3px 0 0 #991b1b' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ── Add Equipment modal ────────────────────────────────────────────────────

function AddEquipmentModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.status === 409) { setError('Equipment already exists'); return; }
      if (!res.ok) { setError('Failed to save'); return; }
      onDone(name.trim());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add Equipment" onClose={onClose}>
      <input className={inputCls} placeholder="Equipment name" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={!name.trim() || saving}
        className="rounded-xl py-2 text-white text-sm font-medium disabled:opacity-40"
        style={{ background: '#dc2626', boxShadow: '0 3px 0 0 #991b1b' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ── Add Exercise modal ─────────────────────────────────────────────────────

const BODY_PARTS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

function AddExerciseModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName]           = useState('');
  const [bodyPart, setBodyPart]   = useState(BODY_PARTS[0]);
  const [equipment, setEquipment] = useState('');
  const [repType, setRepType]     = useState<'count' | 'time'>('count');
  const [equipList, setEquipList] = useState<{ id: string; name: string }[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    fetch(`${base}/equipment`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setEquipList(d); setEquipment(d[0]?.name ?? ''); }
    }).catch(() => {}).finally(() => setLoadingEquip(false));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !equipment) return;
    setSaving(true); setError('');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), bodyPart, equipmentName: equipment, repType }),
      });
      if (res.status === 409) { setError('Exercise already exists'); return; }
      if (!res.ok) { setError('Failed to save'); return; }
      onDone(name.trim());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const selCls = `${inputCls} bg-white`;

  return (
    <ModalShell title="Add Exercise" onClose={onClose}>
      <input className={inputCls} placeholder="Exercise name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <select className={selCls} value={bodyPart} onChange={e => setBodyPart(e.target.value)}>
        {BODY_PARTS.map(bp => <option key={bp}>{bp}</option>)}
      </select>
      {loadingEquip ? (
        <div className="skeleton rounded-lg" style={{ height: 38 }} />
      ) : (
        <select className={selCls} value={equipment} onChange={e => setEquipment(e.target.value)}>
          {equipList.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['count', 'time'] as const).map(t => (
          <button key={t} type="button" onClick={() => setRepType(t)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${repType === t ? '#dc2626' : '#e5e7eb'}`,
              background: repType === t ? '#fef2f2' : '#fff',
              color: repType === t ? '#dc2626' : '#9ca3af',
            }}
          >{t === 'count' ? 'นับครั้ง (Reps)' : 'นับเวลา (Time)'}</button>
        ))}
      </div>
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={!name.trim() || !equipment || saving}
        className="rounded-xl py-2 text-white text-sm font-medium disabled:opacity-40"
        style={{ background: '#dc2626', boxShadow: '0 3px 0 0 #991b1b' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ── Create Admin modal ─────────────────────────────────────────────────────

function CreateAdminModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setSaving(true); setError('');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.status === 409) { setError('Username already taken'); return; }
      if (!res.ok) { setError('Failed to create'); return; }
      onDone(username.trim());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create Admin User" onClose={onClose}>
      <input className={inputCls} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
      <input className={inputCls} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={!username.trim() || !password || saving}
        className="rounded-xl py-2 text-white text-sm font-medium disabled:opacity-40"
        style={{ background: '#dc2626', boxShadow: '0 3px 0 0 #991b1b' }}>
        {saving ? 'Creating…' : 'Create'}
      </button>
    </ModalShell>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, onHide }: { msg: string; onHide: () => void }) {
  useEffect(() => { const t = setTimeout(onHide, 2500); return () => clearTimeout(t); }, [onHide]);
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: '#111827', color: 'white', borderRadius: 10,
      padding: '8px 18px', fontSize: 13, zIndex: 100, whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}

// ── Setting UI components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.45rem', marginBottom: 4 }}>
      {children}
    </p>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        flexShrink: 0, width: 44, height: 24, borderRadius: 12,
        background: value ? '#dc2626' : '#e5e7eb',
        position: 'relative', border: 'none', cursor: 'pointer',
        transition: 'background 0.2s',
        boxShadow: value ? '0 2px 0 #991b1b' : '0 2px 0 #d1d5db',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

function RestStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb',
    background: '#f9fafb', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#374151', flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" style={btn} onClick={() => onChange(Math.max(0, value - 15))}>−</button>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', minWidth: 40, textAlign: 'center' }}>{value}s</span>
      <button type="button" style={btn} onClick={() => onChange(Math.min(300, value + 15))}>+</button>
    </div>
  );
}

function SettingRow({
  label, sublabel, onClick, children,
}: {
  label: string; sublabel?: string; onClick?: () => void; children?: React.ReactNode;
}) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 0', borderBottom: '0.5px solid #f3f4f6',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div>
        <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sublabel}</div>}
      </div>
      {children ?? (
        onClick && (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13,6 19,12 13,18" />
          </svg>
        )
      )}
    </div>
  );

  if (onClick) {
    return <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>;
  }
  return inner;
}

// ── Confirm popup ──────────────────────────────────────────────────────────

function ConfirmModal({ message, detail, confirmLabel = 'Confirm', onCancel, onConfirm }: {
  message: string; detail?: string; confirmLabel?: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        style={{
          position: 'relative', background: 'white', borderRadius: 20,
          margin: '0 24px', padding: '28px 24px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', textAlign: 'center' }}>{message}</p>
        {detail && <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{detail}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 3px 0 #991b1b' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Setting page ───────────────────────────────────────────────────────────

type ModalType = 'equipment' | 'exercise' | 'admin' | 'username' | 'password' | 'clear_confirm' | null;

export default function SettingPage() {
  const router  = useRouter();
  const [isAdmin, setIsAdmin]   = useState(false);
  const [token, setToken]       = useState('');
  const [username, setUsername] = useState('');
  const [modal, setModal]       = useState<ModalType>(null);
  const [toast, setToast]       = useState('');
  const [exporting, setExporting] = useState(false);

  // Workout settings
  const [defaultRest,   setDefaultRest]   = useState(60);
  const [autoStartRest, setAutoStartRest] = useState(true);
  const [sound,         setSound]         = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token') ?? '';
    const u = JSON.parse(localStorage.getItem('user') ?? '{}');
    setToken(t);
    setIsAdmin(u.role === 'admin');
    setUsername(u.username ?? '');
    const s = loadWorkoutSettings();
    setDefaultRest(s.defaultRest);
    setAutoStartRest(s.autoStartRest);
    setSound(s.sound);
  }, []);

  const updateDefaultRest = (v: number) => {
    setDefaultRest(v);
    localStorage.setItem(SETTING_KEYS.defaultRest, String(v));
  };

  const updateAutoStart = (v: boolean) => {
    setAutoStartRest(v);
    localStorage.setItem(SETTING_KEYS.autoStartRest, String(v));
  };

  const updateSound = (v: boolean) => {
    setSound(v);
    localStorage.setItem(SETTING_KEYS.sound, String(v));
  };

  const handleExport = async () => {
    setExporting(true);
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    const now  = new Date();
    const rows = ['Date,IsRestDay,ExercisesCompleted,TotalExercises'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      try {
        const res = await fetch(
          `${base}/workout-logs?year=${d.getFullYear()}&month=${d.getMonth() + 1}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((log: { date: string; isRestDay: boolean; exercisesCompleted: number; totalExercises: number }) => {
            rows.push(`${log.date},${log.isRestDay},${log.exercisesCompleted},${log.totalExercises}`);
          });
        }
      } catch {}
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `workout-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
    setToast('Exported!');
  };

  const handleClearProgress = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('today_done_'));
    keys.forEach(k => localStorage.removeItem(k));
    setModal(null);
    setToast(`Cleared ${keys.length} session${keys.length !== 1 ? 's' : ''}`);
  };

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const showToast = (msg: string) => setToast(msg);

  return (
    <div className="min-h-screen flex justify-center bg-red-600">
      <div
        className="bg-white w-full sm:max-w-sm flex flex-col px-6 gap-6"
        style={{
          paddingTop:    'max(32px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={() => router.push('/home')}
          className="self-start pixel-font-small text-red-400 tracking-widest hover:text-red-700 transition-colors"
        >
          &lt; BACK
        </button>

        {/* ACCOUNT */}
        <div className="flex flex-col">
          <SectionLabel>ACCOUNT</SectionLabel>
          <SettingRow
            label="Username"
            sublabel={username || undefined}
            onClick={() => setModal('username')}
          />
          <SettingRow
            label="Change Password"
            onClick={() => setModal('password')}
          />
        </div>

        {/* WORKOUT */}
        <div className="flex flex-col">
          <SectionLabel>WORKOUT</SectionLabel>
          <SettingRow label="Default Rest" sublabel="Used when adding new exercises">
            <RestStepper value={defaultRest} onChange={updateDefaultRest} />
          </SettingRow>
          <SettingRow label="Auto-Start Rest" sublabel="Automatically start rest timer after a set">
            <Toggle value={autoStartRest} onChange={updateAutoStart} />
          </SettingRow>
          <SettingRow label="Sound" sublabel="Beep when rest ends">
            <Toggle value={sound} onChange={updateSound} />
          </SettingRow>
        </div>

        {/* DATA */}
        <div className="flex flex-col">
          <SectionLabel>DATA</SectionLabel>
          <SettingRow label="Export Workout History" sublabel="Last 6 months as CSV">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: exporting ? '#f3f4f6' : '#fef2f2',
                color: exporting ? '#9ca3af' : '#dc2626',
                fontSize: 12, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {exporting ? 'Exporting…' : 'Download'}
            </button>
          </SettingRow>
          <SettingRow label="Clear Today's Progress" sublabel="Reset current workout session">
            <button
              type="button"
              onClick={() => setModal('clear_confirm')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: '#fef2f2', color: '#dc2626',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              Clear
            </button>
          </SettingRow>
        </div>

        {/* ADMIN */}
        {isAdmin && (
          <div className="flex flex-col gap-3">
            <SectionLabel>ADMIN</SectionLabel>
            <TiltButton onClick={() => setModal('equipment')} className="w-full">ADD EQUIPMENT</TiltButton>
            <TiltButton onClick={() => setModal('exercise')}  className="w-full">ADD EXERCISE</TiltButton>
            <TiltButton onClick={() => setModal('admin')}     className="w-full">CREATE ADMIN USER</TiltButton>
          </div>
        )}

        <div className="flex-1" />

        {/* User card */}
        {username && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {username[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{username}</span>
          </div>
        )}

        <TiltButton onClick={handleLogout} className="w-full">LOGOUT</TiltButton>
      </div>

      {/* Modals */}
      {modal === 'username' && (
        <ChangeUsernameModal
          token={token}
          currentUsername={username}
          onClose={() => setModal(null)}
          onDone={res => {
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            setUsername(res.user.username);
            setToken(res.token);
            setModal(null);
            showToast('Username updated');
          }}
        />
      )}
      {modal === 'password' && (
        <ChangePasswordModal token={token} onClose={() => setModal(null)}
          onDone={() => { setModal(null); showToast('Password updated'); }} />
      )}
      {modal === 'equipment' && (
        <AddEquipmentModal token={token} onClose={() => setModal(null)}
          onDone={name => { setModal(null); showToast(`"${name}" added`); }} />
      )}
      {modal === 'exercise' && (
        <AddExerciseModal token={token} onClose={() => setModal(null)}
          onDone={name => { setModal(null); showToast(`"${name}" added`); }} />
      )}
      {modal === 'admin' && (
        <CreateAdminModal token={token} onClose={() => setModal(null)}
          onDone={u => { setModal(null); showToast(`Admin "${u}" created`); }} />
      )}
      {modal === 'clear_confirm' && (
        <ConfirmModal
          message="Clear today's progress?"
          detail="This will reset your current workout session so you can start fresh."
          confirmLabel="Clear"
          onCancel={() => setModal(null)}
          onConfirm={handleClearProgress}
        />
      )}

      {toast && <Toast msg={toast} onHide={() => setToast('')} />}
    </div>
  );
}
