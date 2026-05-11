'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiltButton } from '../components/TiltButton';

// ── Shared modal shell ─────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '60dvh' }}
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

// ── Add Equipment modal ────────────────────────────────────────────────────

function AddEquipmentModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
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
  const [name, setName]         = useState('');
  const [bodyPart, setBodyPart] = useState(BODY_PARTS[0]);
  const [equipment, setEquipment] = useState('');
  const [repType, setRepType]   = useState<'count' | 'time'>('count');
  const [equipList, setEquipList] = useState<{ id: string; name: string }[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(true);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

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

// ── Setting page ───────────────────────────────────────────────────────────

type ModalType = 'equipment' | 'exercise' | 'admin' | null;

export default function SettingPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken]     = useState('');
  const [modal, setModal]     = useState<ModalType>(null);
  const [toast, setToast]     = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token') ?? '';
    const u = JSON.parse(localStorage.getItem('user') ?? '{}');
    setToken(t);
    setIsAdmin(u.role === 'admin');
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const showToast = (msg: string) => setToast(msg);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="bg-white w-full max-w-sm flex flex-col px-6 py-8 gap-6"
        style={{ paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.push('/home')}
          className="self-start pixel-font-small text-red-400 tracking-widest hover:text-red-700 transition-colors"
        >
          &lt; BACK
        </button>

        {isAdmin && (
          <div className="flex flex-col gap-3">
            <p className="pixel-font-small tracking-widest text-gray-400" style={{ fontSize: '0.45rem' }}>
              ADMIN
            </p>

            <TiltButton onClick={() => setModal('equipment')} className="w-full">
              ADD EQUIPMENT
            </TiltButton>

            <TiltButton onClick={() => setModal('exercise')} className="w-full">
              ADD EXERCISE
            </TiltButton>

            <TiltButton onClick={() => setModal('admin')} className="w-full">
              CREATE ADMIN USER
            </TiltButton>
          </div>
        )}

        <TiltButton onClick={handleLogout} className="w-full">
          LOGOUT
        </TiltButton>


      </div>

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
          onDone={username => { setModal(null); showToast(`Admin "${username}" created`); }} />
      )}

      {toast && <Toast msg={toast} onHide={() => setToast('')} />}
    </div>
  );
}
