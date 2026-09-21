import {
  useCallback, useEffect, useRef, useState, ChangeEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Edit2, Trash2, Users, UserPlus, Send,
  ChevronDown, ChevronRight, ImageOff, Loader2, RefreshCw,
  ShieldCheck, Eye, Globe, Briefcase, Heart, FileText, Camera,
  Link2, CheckCircle, XCircle, Clock, Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Footer from '@/components/Footer';
import {
  FamilyPerson, FamilyRelationship, FamilyPhoto, FamilySubmission,
  buildLayout, computeGenerations, getRelationshipLabel, generationLabel,
  flagUrl, COUNTRY_NAMES, NODE_W, NODE_H,
  type SubmissionData, type SubmissionMember,
} from '@/lib/familyTree';

// ── Styles ────────────────────────────────────────────────────────────────────

const inp =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white placeholder:text-[var(--muted)]/50 focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]';

const sel =
  'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2 text-sm text-white focus:border-[var(--brand-bright)] focus:outline-none';

const btn = (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => {
  const base = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40';
  if (variant === 'primary') return `${base} bg-[var(--brand-bright)] text-[#0b0d10] hover:bg-white`;
  if (variant === 'danger') return `${base} bg-red-500/10 text-red-400 hover:bg-red-500/20`;
  return `${base} border border-white/10 text-[var(--muted)] hover:border-white/30 hover:text-white`;
};

// ── Country select options ────────────────────────────────────────────────────

const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAMES).sort((a, b) =>
  a[1].localeCompare(b[1])
);

// ── City picker (fetches from CountriesNow API when country changes) ──────────

const cityCache = new Map<string, string[]>();

function CityPicker({
  countryCode, value, onChange, id,
}: {
  countryCode: string | null;
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const [cities, setCities] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const listId = id ?? 'city-list';

  useEffect(() => {
    if (!countryCode) { setCities([]); return; }
    const countryName = COUNTRY_NAMES[countryCode];
    if (!countryName) { setCities([]); return; }

    if (cityCache.has(countryCode)) {
      setCities(cityCache.get(countryCode)!);
      return;
    }

    setFetching(true);
    fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: countryName }),
    })
      .then(r => r.json())
      .then(data => {
        const list: string[] = Array.isArray(data?.data)
          ? (data.data as string[]).sort()
          : [];
        cityCache.set(countryCode, list);
        setCities(list);
      })
      .catch(() => setCities([]))
      .finally(() => setFetching(false));
  }, [countryCode]);

  return (
    <div className="relative">
      <input
        list={listId}
        className={inp}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={fetching ? 'Loading cities…' : countryCode ? 'Type or choose a city' : 'Select a country first'}
        disabled={!countryCode}
      />
      {cities.length > 0 && (
        <datalist id={listId}>
          {cities.map(c => <option key={c} value={c} />)}
        </datalist>
      )}
      {fetching && (
        <Loader2 size={13} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
      )}
    </div>
  );
}

// ── Blank person form ─────────────────────────────────────────────────────────

const blankPerson = (): Omit<FamilyPerson, 'id' | 'created_at'> => ({
  name: '',
  birth_year: null,
  death_year: null,
  birth_date: null,
  death_date: null,
  country_code: null,
  city: null,
  profession: null,
  hobbies: [],
  bio: null,
  is_root: false,
});

// ── Node card (tree canvas) ───────────────────────────────────────────────────

function TreeNodeCard({
  person, photos, label, isRoot, onClick,
}: {
  person: FamilyPerson;
  photos: FamilyPhoto[];
  label: string;
  isRoot: boolean;
  onClick: () => void;
}) {
  const thumb = photos.find(ph => ph.display_order === 0) ?? photos[0];
  return (
    <div
      onClick={onClick}
      className="group absolute cursor-pointer"
      style={{ width: 160, top: 0, left: 0 }}
    >
      <div className={`rounded-2xl border ${isRoot ? 'border-[var(--brand-bright)]' : 'border-white/10'} bg-[var(--bg-card)] p-2.5 shadow-lg transition-all group-hover:border-[var(--brand-bright)]/60 group-hover:shadow-[var(--brand-bright)]/10`}>
        {/* avatar */}
        <div className="mb-2 h-12 w-12 overflow-hidden rounded-full border border-white/10 mx-auto bg-[var(--bg-soft)] flex items-center justify-center">
          {thumb
            ? <img src={thumb.url} alt={person.name} className="h-full w-full object-cover" />
            : <Users size={20} className="text-[var(--muted)]" />
          }
        </div>
        <p className="text-center text-xs font-semibold text-white leading-tight truncate">{person.name}</p>
        {isRoot && <p className="text-center text-[10px] text-[var(--brand-bright)] mt-0.5">You</p>}
        {!isRoot && label && (
          <p className="text-center text-[10px] text-[var(--muted)] mt-0.5 truncate">{label}</p>
        )}
        {/* location */}
        {(person.country_code || person.city) && (
          <div className="mt-1.5 flex items-center justify-center gap-1">
            {person.country_code && (
              <img
                src={flagUrl(person.country_code)}
                alt={person.country_code}
                className="h-3 inline-block"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span className="text-[10px] text-[var(--muted)] truncate">
              {[person.city, COUNTRY_NAMES[person.country_code ?? '']].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SVG connectors ────────────────────────────────────────────────────────────

function Connectors({
  nodes, rels,
}: {
  nodes: { id: string; x: number; y: number }[];
  rels: FamilyRelationship[];
}) {
  const nodeById = new Map<string, { id: string; x: number; y: number }>(nodes.map(n => [n.id, n]));
  const lines: JSX.Element[] = [];

  const drawn = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type !== 'parent' && r.relationship_type !== 'child') continue;
    // draw line between parent and child
    const parentId = r.relationship_type === 'parent' ? r.person_a_id : r.person_b_id;
    const childId  = r.relationship_type === 'parent' ? r.person_b_id : r.person_a_id;
    const key = `${parentId}-${childId}`;
    if (drawn.has(key)) continue;
    drawn.add(key);

    const p = nodeById.get(parentId);
    const c = nodeById.get(childId);
    if (!p || !c) continue;

    const x1 = p.x + NODE_W / 2;
    const y1 = p.y + NODE_H;
    const x2 = c.x + NODE_W / 2;
    const y2 = c.y;
    const my = (y1 + y2) / 2;
    lines.push(
      <path
        key={key}
        d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1.5}
      />
    );
  }

  // spouse lines (horizontal dashes)
  const drawnS = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type !== 'spouse') continue;
    const key = [r.person_a_id, r.person_b_id].sort().join('-');
    if (drawnS.has(key)) continue;
    drawnS.add(key);
    const a = nodeById.get(r.person_a_id);
    const b = nodeById.get(r.person_b_id);
    if (!a || !b) continue;
    const x1 = a.x + NODE_W;
    const x2 = b.x;
    const y = a.y + NODE_H / 2;
    lines.push(
      <line
        key={key}
        x1={x1} y1={y} x2={x2} y2={y}
        stroke="rgba(255,180,0,0.3)"
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
    );
  }

  return <>{lines}</>;
}

// ── Profile modal ─────────────────────────────────────────────────────────────

function ProfileModal({
  person, photos, label, onClose,
}: {
  person: FamilyPerson;
  photos: FamilyPhoto[];
  label: string;
  onClose: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const sorted = [...photos].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[var(--bg-card)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-[var(--muted)] hover:text-white">
          <X size={18} />
        </button>

        {/* Photo gallery */}
        {sorted.length > 0 ? (
          <div className="mb-4">
            <div className="relative h-48 rounded-2xl overflow-hidden bg-[var(--bg-soft)]">
              <img src={sorted[photoIdx].url} alt={person.name} className="h-full w-full object-cover" />
              {sorted.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {sorted.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 h-20 rounded-2xl bg-[var(--bg-soft)] flex items-center justify-center">
            <ImageOff size={28} className="text-[var(--muted)]" />
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-0.5">{person.name}</h2>
        {label && <p className="text-xs text-[var(--brand-bright)] mb-3">{label}</p>}

        <div className="space-y-2 text-sm">
          {(person.country_code || person.city) && (
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Globe size={14} className="shrink-0" />
              <div className="flex items-center gap-1.5">
                {person.country_code && (
                  <img src={flagUrl(person.country_code)} alt={person.country_code} className="h-3.5" />
                )}
                <span>{[person.city, COUNTRY_NAMES[person.country_code ?? '']].filter(Boolean).join(', ')}</span>
              </div>
            </div>
          )}
          {(person.birth_date || person.birth_year || person.death_date || person.death_year) && (
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Info size={14} className="shrink-0" />
              <span>
                {person.birth_date
                  ? `b. ${new Date(person.birth_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : person.birth_year ? `b. ${person.birth_year}` : ''}
                {(person.death_date || person.death_year) && (
                  person.death_date
                    ? ` – d. ${new Date(person.death_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : ` – d. ${person.death_year}`
                )}
              </span>
            </div>
          )}
          {person.profession && (
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Briefcase size={14} className="shrink-0" />
              <span>{person.profession}</span>
            </div>
          )}
          {person.hobbies.length > 0 && (
            <div className="flex items-start gap-2 text-[var(--muted)]">
              <Heart size={14} className="shrink-0 mt-0.5" />
              <span>{person.hobbies.join(', ')}</span>
            </div>
          )}
          {person.bio && (
            <div className="flex items-start gap-2 text-[var(--muted)]">
              <FileText size={14} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">{person.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin: Edit person form ────────────────────────────────────────────────────

function PersonForm({
  initial, people, photos, onSave, onCancel, onDeletePhoto, onUploadPhoto, saving, uploading, error,
}: {
  initial: Partial<FamilyPerson>;
  people: FamilyPerson[];
  photos: FamilyPhoto[];
  onSave: (data: Omit<FamilyPerson, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  onDeletePhoto: (photo: FamilyPhoto) => void;
  onUploadPhoto: (file: File) => void;
  saving: boolean;
  uploading: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<Omit<FamilyPerson, 'id' | 'created_at'>>({
    name: initial.name ?? '',
    birth_year: initial.birth_year ?? null,
    death_year: initial.death_year ?? null,
    birth_date: initial.birth_date ?? null,
    death_date: initial.death_date ?? null,
    country_code: initial.country_code ?? null,
    city: initial.city ?? null,
    profession: initial.profession ?? null,
    hobbies: initial.hobbies ?? [],
    bio: initial.bio ?? null,
    is_root: initial.is_root ?? false,
  });
  const [hobbyInput, setHobbyInput] = useState('');

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const addHobby = () => {
    const h = hobbyInput.trim();
    if (!h || form.hobbies.includes(h)) return;
    set('hobbies', [...form.hobbies, h]);
    setHobbyInput('');
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const myPhotos = [...photos].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Full Name *</label>
        <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane Doe" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Birthday</label>
          <input
            type="date"
            className={inp}
            value={form.birth_date ?? ''}
            onChange={e => {
              const v = e.target.value || null;
              set('birth_date', v);
              set('birth_year', v ? new Date(v).getFullYear() : null);
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Death Date</label>
          <input
            type="date"
            className={inp}
            value={form.death_date ?? ''}
            onChange={e => {
              const v = e.target.value || null;
              set('death_date', v);
              set('death_year', v ? new Date(v).getFullYear() : null);
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Country</label>
          <select className={sel} value={form.country_code ?? ''} onChange={e => set('country_code', e.target.value || null)}>
            <option value="">— select —</option>
            {COUNTRY_OPTIONS.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">City / Town / Village</label>
          <CityPicker
            countryCode={form.country_code}
            value={form.city ?? ''}
            onChange={v => set('city', v || null)}
            id="admin-city-list"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Profession</label>
        <input className={inp} value={form.profession ?? ''} onChange={e => set('profession', e.target.value || null)} placeholder="e.g. Software Developer, Housewife, Retired…" />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Hobbies</label>
        <div className="flex gap-2">
          <input
            className={inp}
            value={hobbyInput}
            onChange={e => setHobbyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHobby())}
            placeholder="Type a hobby and press Enter"
          />
          <button type="button" className={btn('ghost')} onClick={addHobby}><Plus size={14} /></button>
        </div>
        {form.hobbies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.hobbies.map(h => (
              <span key={h} className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[var(--muted)]">
                {h}
                <button onClick={() => set('hobbies', form.hobbies.filter(x => x !== h))}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Bio</label>
        <textarea className={inp} rows={3} value={form.bio ?? ''} onChange={e => set('bio', e.target.value || null)} placeholder="A short description…" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_root" checked={form.is_root} onChange={e => set('is_root', e.target.checked)} className="rounded" />
        <label htmlFor="is_root" className="text-xs text-[var(--muted)]">Mark as root person (you)</label>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-xs text-[var(--muted)] mb-2">Photos ({myPhotos.length}/5)</label>
        <div className="flex flex-wrap gap-2">
          {myPhotos.map(ph => (
            <div key={ph.id} className="relative">
              <img src={ph.url} alt="" className="h-16 w-16 rounded-xl object-cover border border-white/10" />
              <button
                onClick={() => onDeletePhoto(ph)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {myPhotos.length < 5 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-16 w-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-[var(--muted)] hover:border-white/40 disabled:opacity-40"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { onUploadPhoto(f); e.target.value = ''; }
          }}
        />
      </div>

      {error && <p className="text-xs text-red-400 rounded-xl bg-red-500/10 px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btn('ghost')} onClick={onCancel}>Cancel</button>
        <button type="button" className={btn('primary')} onClick={() => {
          // flush any pending hobby text before saving
          const pending = hobbyInput.trim();
          const finalHobbies = pending && !form.hobbies.includes(pending)
            ? [...form.hobbies, pending]
            : form.hobbies;
          onSave({ ...form, hobbies: finalHobbies });
        }} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save Person
        </button>
      </div>
    </div>
  );
}

// ── Admin: Relationship panel ─────────────────────────────────────────────────

function RelPanel({
  people, rels, onAdd, onDelete,
}: {
  people: FamilyPerson[];
  rels: FamilyRelationship[];
  onAdd: (a: string, b: string, type: FamilyRelationship['relationship_type']) => void;
  onDelete: (id: string) => void;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [type, setType] = useState<FamilyRelationship['relationship_type']>('child');
  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-soft)] p-4 space-y-3">
        <p className="text-xs text-[var(--muted)] font-medium">Add Relationship</p>
        <div className="grid grid-cols-3 gap-2">
          <select className={sel} value={a} onChange={e => setA(e.target.value)}>
            <option value="">Person A</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={sel} value={type} onChange={e => setType(e.target.value as FamilyRelationship['relationship_type'])}>
            <option value="parent">is parent of →</option>
            <option value="child">is child of →</option>
            <option value="spouse">is spouse of →</option>
            <option value="sibling">is sibling of →</option>
          </select>
          <select className={sel} value={b} onChange={e => setB(e.target.value)}>
            <option value="">Person B</option>
            {people.filter(p => p.id !== a).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button
          className={btn('primary')}
          disabled={!a || !b}
          onClick={() => { onAdd(a, b, type); setA(''); setB(''); }}
        >
          <Link2 size={12} /> Add Link
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {rels.map(r => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[var(--bg-soft)] px-3 py-2 text-xs text-[var(--muted)]">
            <span>
              <span className="text-white font-medium">{nameOf(r.person_a_id)}</span>
              {' '}is {r.relationship_type} of{' '}
              <span className="text-white font-medium">{nameOf(r.person_b_id)}</span>
            </span>
            <button className={btn('danger')} onClick={() => onDelete(r.id)}><Trash2 size={12} /></button>
          </div>
        ))}
        {rels.length === 0 && <p className="text-xs text-[var(--muted)] text-center py-4">No relationships yet</p>}
      </div>
    </div>
  );
}

// ── Public: Submit branch form ────────────────────────────────────────────────

function SubmitBranchForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<SubmissionMember[]>([{
    name: '', birth_year: undefined, country_code: undefined, city: undefined,
    profession: undefined, hobbies: [], bio: undefined, photo_urls: [], relationship_to_anchor: '', anchor_name: '',
  }]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const updateMember = (i: number, field: keyof SubmissionMember, value: unknown) => {
    setMembers(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const addMember = () => setMembers(ms => [...ms, {
    name: '', birth_year: undefined, country_code: undefined, city: undefined,
    profession: undefined, hobbies: [], bio: undefined, photo_urls: [], relationship_to_anchor: '', anchor_name: '',
  }]);

  const removeMember = (i: number) => setMembers(ms => ms.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setError('Please fill in your name and email.'); return; }
    if (members.some(m => !m.name.trim())) { setError('All family members need a name.'); return; }
    setSending(true);
    setError('');
    const data: SubmissionData = { members, notes: notes.trim() || undefined };
    const { error: err } = await supabase!
      .from('family_submissions')
      .insert({ submitter_name: name.trim(), submitter_email: email.trim(), data });
    setSending(false);
    if (err) { setError(err.message); return; }
    setSent(true);
    onSubmitted();
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={36} className="text-green-400 mx-auto mb-3" />
        <p className="text-white font-semibold mb-1">Branch Submitted!</p>
        <p className="text-sm text-[var(--muted)]">The admin will review and add your family members to the tree.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Your Name *</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Your Email *</label>
          <input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Family Members</p>
          <button className={btn('ghost')} onClick={addMember}><Plus size={13} /> Add Person</button>
        </div>
        <div className="space-y-4">
          {members.map((m, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[var(--bg-soft)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--muted)]">Person {i + 1}</p>
                {members.length > 1 && (
                  <button className={btn('danger')} onClick={() => removeMember(i)}><X size={12} /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">Name *</label>
                  <input className={inp} value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">Birthday</label>
                  <input type="date" className={inp} value={m.birth_date ?? ''} onChange={e => { updateMember(i, 'birth_date', e.target.value || undefined); updateMember(i, 'birth_year', e.target.value ? new Date(e.target.value).getFullYear() : undefined); }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">Country</label>
                  <select className={sel} value={m.country_code ?? ''} onChange={e => updateMember(i, 'country_code', e.target.value || undefined)}>
                    <option value="">— select —</option>
                    {COUNTRY_OPTIONS.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">City / Town / Village</label>
                  <CityPicker
                    countryCode={m.country_code ?? null}
                    value={m.city ?? ''}
                    onChange={v => updateMember(i, 'city', v || undefined)}
                    id={`sub-city-list-${i}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--muted)] mb-1">Profession</label>
                <input className={inp} value={m.profession ?? ''} onChange={e => updateMember(i, 'profession', e.target.value || undefined)} placeholder="Software Dev, Teacher, Retired…" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--muted)] mb-1">Hobbies</label>
                <input className={inp} value={m.hobbies?.join(', ') ?? ''} onChange={e => updateMember(i, 'hobbies', e.target.value.split(',').map(h => h.trim()).filter(Boolean))} placeholder="Reading, Football, Cooking (comma-separated)" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--muted)] mb-1">About</label>
                <textarea className={inp} rows={2} value={m.bio ?? ''} onChange={e => updateMember(i, 'bio', e.target.value || undefined)} placeholder="A short description (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">Relationship to tree</label>
                  <input className={inp} value={m.relationship_to_anchor ?? ''} onChange={e => updateMember(i, 'relationship_to_anchor', e.target.value)} placeholder="e.g. cousin, uncle" />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">Related to (name)</label>
                  <input className={inp} value={m.anchor_name ?? ''} onChange={e => updateMember(i, 'anchor_name', e.target.value)} placeholder="Name of the connection" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--muted)] mb-1">Photo URLs (up to 5, comma-separated)</label>
                <input className={inp} value={m.photo_urls?.join(', ') ?? ''} onChange={e => updateMember(i, 'photo_urls', e.target.value.split(',').map(u => u.trim()).filter(Boolean).slice(0, 5))} placeholder="https://…, https://…" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Additional Notes</label>
        <textarea className={inp} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context to help the admin add your branch correctly" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button className={btn('primary')} onClick={submit} disabled={sending || !supabase}>
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Submit Branch
      </button>
    </div>
  );
}

// ── Admin: Submissions review ─────────────────────────────────────────────────

function SubmissionsPanel({
  submissions, onStatus, loading,
}: {
  submissions: FamilySubmission[];
  onStatus: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const statusIcon = (s: FamilySubmission['status']) =>
    s === 'approved' ? <CheckCircle size={14} className="text-green-400" /> :
    s === 'rejected' ? <XCircle size={14} className="text-red-400" /> :
    <Clock size={14} className="text-yellow-400" />;

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-[var(--muted)] text-center py-4"><Loader2 size={16} className="animate-spin inline" /></p>}
      {!loading && submissions.length === 0 && (
        <p className="text-xs text-[var(--muted)] text-center py-6">No submissions yet</p>
      )}
      {submissions.map(s => (
        <div key={s.id} className="rounded-2xl border border-white/10 bg-[var(--bg-soft)] overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5"
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            <div className="flex items-center gap-2">
              {statusIcon(s.status)}
              <div>
                <p className="text-sm font-medium text-white">{s.submitter_name}</p>
                <p className="text-xs text-[var(--muted)]">{s.submitter_email} · {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted)]">{(s.data.members ?? []).length} member{(s.data.members ?? []).length !== 1 ? 's' : ''}</span>
              {expanded === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </div>

          {expanded === s.id && (
            <div className="border-t border-white/5 px-4 py-3 space-y-3">
              {(s.data.members ?? []).map((m, i) => (
                <div key={i} className="text-xs text-[var(--muted)] space-y-0.5">
                  <p className="text-white font-medium">{m.name}</p>
                  {m.birth_year && <p>Born: {m.birth_year}</p>}
                  {(m.city || m.country_code) && <p>Location: {[m.city, m.country_code].filter(Boolean).join(', ')}</p>}
                  {m.profession && <p>Profession: {m.profession}</p>}
                  {m.hobbies && m.hobbies.length > 0 && <p>Hobbies: {m.hobbies.join(', ')}</p>}
                  {m.bio && <p>Bio: {m.bio}</p>}
                  {m.relationship_to_anchor && <p>Relationship: {m.relationship_to_anchor} of {m.anchor_name}</p>}
                  {m.photo_urls && m.photo_urls.length > 0 && (
                    <div className="flex gap-1.5 mt-1">
                      {m.photo_urls.map((u, j) => (
                        <img key={j} src={u} className="h-10 w-10 rounded-lg object-cover border border-white/10" alt="" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {s.data.notes && <p className="text-xs text-[var(--muted)] italic">{s.data.notes}</p>}

              {s.status === 'pending' && (
                <div className="space-y-2 pt-1">
                  <textarea
                    className={inp}
                    rows={2}
                    placeholder="Admin notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className={btn('primary')} onClick={() => onStatus(s.id, 'approved', notes)}>
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button className={btn('danger')} onClick={() => onStatus(s.id, 'rejected', notes)}>
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              )}
              {s.admin_notes && <p className="text-xs text-[var(--muted)] italic border-t border-white/5 pt-2">Note: {s.admin_notes}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Login gate ────────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr('');
    const { error } = await signIn(email, pw);
    setLoading(false);
    if (error) { setErr(error); } else onLogin();
  };

  return (
    <div className="space-y-3">
      <input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" />
      <input type="password" className={inp} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Password" />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <button className={btn('primary')} onClick={submit} disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        Sign In
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Panel = 'tree' | 'admin-people' | 'admin-rels' | 'admin-submissions' | 'submit';

export default function FamilyTreePage() {
  usePageTitle('Family Tree');

  const { user } = useAuth();
  const isAdmin = !!user;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [rels, setRels] = useState<FamilyRelationship[]>([]);
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [submissions, setSubmissions] = useState<FamilySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [panel, setPanel] = useState<Panel>('tree');
  const [selectedPerson, setSelectedPerson] = useState<FamilyPerson | null>(null);
  const [editingPerson, setEditingPerson] = useState<FamilyPerson | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // ── Canvas pan/zoom ─────────────────────────────────────────────────────────
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [p, r, ph] = await Promise.all([
      supabase.from('family_people').select('*').order('created_at'),
      supabase.from('family_relationships').select('*'),
      supabase.from('family_photos').select('*').order('display_order'),
    ]);
    setPeople(p.data ?? []);
    setRels(r.data ?? []);
    setPhotos(ph.data ?? []);
    setLoading(false);
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setLoadingSubs(true);
    const { data } = await supabase.from('family_submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data ?? []);
    setLoadingSubs(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) loadSubmissions(); }, [isAdmin, loadSubmissions]);

  // ── Layout ──────────────────────────────────────────────────────────────────
  const { nodes, width, height } = buildLayout(people, rels);
  const genMap = computeGenerations(people, rels);

  // ── Admin CRUD ──────────────────────────────────────────────────────────────
  const savePerson = async (data: Omit<FamilyPerson, 'id' | 'created_at'>) => {
    if (!supabase) return;
    setSaving(true);
    setSaveError('');
    let err;
    if (editingPerson === 'new') {
      ({ error: err } = await supabase.from('family_people').insert(data));
    } else if (editingPerson) {
      ({ error: err } = await supabase.from('family_people').update(data).eq('id', (editingPerson as FamilyPerson).id));
    }
    setSaving(false);
    if (err) { setSaveError(err.message); return; }
    setEditingPerson(null);
    await load();
  };

  const deletePerson = async (id: string) => {
    if (!supabase || !confirm('Delete this person and all their relationships?')) return;
    await supabase.from('family_people').delete().eq('id', id);
    await load();
  };

  const addRel = async (a: string, b: string, type: FamilyRelationship['relationship_type']) => {
    if (!supabase) return;
    await supabase.from('family_relationships').insert({ person_a_id: a, person_b_id: b, relationship_type: type });
    await load();
  };

  const deleteRel = async (id: string) => {
    if (!supabase) return;
    await supabase.from('family_relationships').delete().eq('id', id);
    await load();
  };

  const uploadPhoto = async (personId: string, file: File) => {
    if (!supabase) return;
    const myPhotos = photos.filter(p => p.person_id === personId);
    if (myPhotos.length >= 5) return;
    setUploading(true);
    const path = `${personId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('family-photos').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('family-photos').getPublicUrl(path);
      await supabase.from('family_photos').insert({
        person_id: personId,
        storage_path: path,
        url: publicUrl,
        display_order: myPhotos.length,
      });
      await load();
    }
    setUploading(false);
  };

  const deletePhoto = async (photo: FamilyPhoto) => {
    if (!supabase) return;
    await supabase.storage.from('family-photos').remove([photo.storage_path]);
    await supabase.from('family_photos').delete().eq('id', photo.id);
    await load();
  };

  const updateSubmissionStatus = async (id: string, status: 'approved' | 'rejected', admin_notes?: string) => {
    if (!supabase) return;
    await supabase.from('family_submissions').update({ status, admin_notes: admin_notes || null }).eq('id', id);
    await loadSubmissions();
  };

  // ── Canvas drag ─────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  };
  const onMouseUp = () => { dragging.current = false; };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(2, Math.max(0.3, s - e.deltaY * 0.001)));
  };

  // ── Pending count badge ─────────────────────────────────────────────────────
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // ── Generation rows for legend ──────────────────────────────────────────────
  const genNumbers = [...new Set([...genMap.values()])].sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[var(--muted)] hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[var(--brand-bright)]" />
              <span className="font-semibold text-sm">Family Tree</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <>
                <button className={btn('ghost')} onClick={() => { setPanel('submit'); setShowLogin(false); }}>
                  <UserPlus size={14} /> Submit Branch
                </button>
                <button className={btn('ghost')} onClick={() => { setPanel('tree'); setShowLogin(!showLogin); }}>
                  <ShieldCheck size={14} /> Admin
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <button className={`${btn(panel === 'admin-people' ? 'primary' : 'ghost')}`} onClick={() => setPanel('admin-people')}>
                  <Users size={14} /> People
                </button>
                <button className={`${btn(panel === 'admin-rels' ? 'primary' : 'ghost')}`} onClick={() => setPanel('admin-rels')}>
                  <Link2 size={14} /> Relationships
                </button>
                <button className={`relative ${btn(panel === 'admin-submissions' ? 'primary' : 'ghost')}`} onClick={() => setPanel('admin-submissions')}>
                  <Send size={14} /> Submissions
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center text-white font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button className={btn('ghost')} onClick={() => setPanel('tree')}>
                  <Eye size={14} /> View Tree
                </button>
              </>
            )}
            <button className={btn('ghost')} onClick={load} title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex">

        {/* ── Tree canvas ─────────────────────────────────────────────────────── */}
        {panel === 'tree' && (
          <div className="flex-1 relative overflow-hidden">
            {/* Login popover */}
            {showLogin && !isAdmin && (
              <div className="absolute top-4 right-4 z-20 w-72 rounded-2xl border border-white/10 bg-[var(--bg-card)] p-4 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold">Admin Login</p>
                  <button onClick={() => setShowLogin(false)}><X size={14} /></button>
                </div>
                <AdminLogin onLogin={() => setShowLogin(false)} />
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--brand-bright)]" />
              </div>
            )}

            {!loading && people.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                <Users size={48} className="opacity-20" />
                <p className="text-sm">No family members yet.</p>
                {isAdmin && (
                  <button className={btn('primary')} onClick={() => setPanel('admin-people')}>
                    <Plus size={14} /> Add the first person
                  </button>
                )}
              </div>
            )}

            {!loading && people.length > 0 && (
              <>
                {/* Generation legend sidebar */}
                <div className="absolute left-3 top-3 z-10 space-y-1 pointer-events-none">
                  {genNumbers.map(g => (
                    <div key={g} className="flex items-center gap-1.5 rounded-lg bg-black/50 backdrop-blur-sm px-2 py-1">
                      <span className="text-[10px] text-[var(--muted)]">{g > 0 ? `+${g}` : g}</span>
                      <span className="text-[10px] text-white/70">{generationLabel(g)}</span>
                    </div>
                  ))}
                </div>

                {/* Zoom controls */}
                <div className="absolute right-3 bottom-16 z-10 flex flex-col gap-1">
                  <button className={btn('ghost')} onClick={() => setScale(s => Math.min(2, s + 0.1))}>+</button>
                  <button className={btn('ghost')} onClick={() => setScale(1)}>1×</button>
                  <button className={btn('ghost')} onClick={() => setScale(s => Math.max(0.3, s - 0.1))}>−</button>
                </div>

                {/* Canvas */}
                <div
                  ref={canvasRef}
                  className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onWheel={onWheel}
                >
                  <div
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                      transformOrigin: '0 0',
                      position: 'relative',
                      width: width + 80,
                      height: height + 80,
                    }}
                  >
                    {/* SVG connector lines */}
                    <svg
                      style={{ position: 'absolute', top: 0, left: 0, width: width + 80, height: height + 80, overflow: 'visible' }}
                    >
                      <Connectors nodes={nodes.map(n => ({ id: n.person.id, x: n.x, y: n.y }))} rels={rels} />
                    </svg>

                    {/* Person nodes */}
                    {nodes.map(node => (
                      <div
                        key={node.person.id}
                        style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                      >
                        <TreeNodeCard
                          person={node.person}
                          photos={photos.filter(ph => ph.person_id === node.person.id)}
                          label={getRelationshipLabel(node.person.id, people, rels)}
                          isRoot={node.person.is_root}
                          onClick={() => setSelectedPerson(node.person)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Admin panels ────────────────────────────────────────────────────── */}
        {(panel === 'admin-people' || panel === 'admin-rels' || panel === 'admin-submissions' || panel === 'submit') && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-8">

              {/* Admin: People */}
              {panel === 'admin-people' && isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Manage People</h1>
                    <button className={btn('primary')} onClick={() => setEditingPerson('new')}>
                      <Plus size={14} /> Add Person
                    </button>
                  </div>

                  {editingPerson && (
                    <div className="mb-6 rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
                      <h2 className="text-sm font-semibold mb-4">{editingPerson === 'new' ? 'New Person' : `Edit: ${editingPerson.name}`}</h2>
                      <PersonForm
                        key={editingPerson === 'new' ? 'new' : (editingPerson as FamilyPerson).id}
                        initial={editingPerson === 'new' ? blankPerson() : editingPerson}
                        people={people}
                        photos={editingPerson === 'new' ? [] : photos.filter(ph => ph.person_id === (editingPerson as FamilyPerson).id)}
                        onSave={savePerson}
                        onCancel={() => setEditingPerson(null)}
                        onDeletePhoto={deletePhoto}
                        onUploadPhoto={async (file) => {
                          if (editingPerson !== 'new') await uploadPhoto((editingPerson as FamilyPerson).id, file);
                        }}
                        saving={saving}
                        uploading={uploading}
                        error={saveError}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {people.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--bg-card)] px-4 py-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const ph = photos.find(x => x.person_id === p.id);
                            return ph
                              ? <img src={ph.url} className="h-9 w-9 rounded-full object-cover border border-white/10" alt="" />
                              : <div className="h-9 w-9 rounded-full bg-[var(--bg-soft)] flex items-center justify-center"><Users size={16} className="text-[var(--muted)]" /></div>;
                          })()}
                          <div>
                            <p className="text-sm font-medium">{p.name} {p.is_root && <span className="text-[10px] text-[var(--brand-bright)]">(root)</span>}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.country_code && <img src={flagUrl(p.country_code)} alt={p.country_code} className="h-3" />}
                              <span className="text-xs text-[var(--muted)]">{[p.city, COUNTRY_NAMES[p.country_code ?? '']].filter(Boolean).join(', ') || '—'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button className={btn('ghost')} onClick={() => setEditingPerson(p)}><Edit2 size={13} /></button>
                          <button className={btn('danger')} onClick={() => deletePerson(p.id)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                    {people.length === 0 && !loading && (
                      <p className="text-sm text-[var(--muted)] text-center py-6">No people yet. Add the first one above.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Admin: Relationships */}
              {panel === 'admin-rels' && isAdmin && (
                <div>
                  <h1 className="text-xl font-bold mb-6">Manage Relationships</h1>
                  <RelPanel people={people} rels={rels} onAdd={addRel} onDelete={deleteRel} />
                </div>
              )}

              {/* Admin: Submissions */}
              {panel === 'admin-submissions' && isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Branch Submissions</h1>
                    <button className={btn('ghost')} onClick={loadSubmissions}><RefreshCw size={14} /></button>
                  </div>
                  <SubmissionsPanel submissions={submissions} onStatus={updateSubmissionStatus} loading={loadingSubs} />
                </div>
              )}

              {/* Public: Submit */}
              {panel === 'submit' && (
                <div>
                  <h1 className="text-xl font-bold mb-2">Submit Your Branch</h1>
                  <p className="text-sm text-[var(--muted)] mb-6">Add your family members to the tree. The admin will review and publish them.</p>
                  {!supabase
                    ? <p className="text-sm text-red-400">Supabase is not configured.</p>
                    : <SubmitBranchForm onSubmitted={() => {}} />
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Profile modal */}
      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          photos={photos.filter(ph => ph.person_id === selectedPerson.id)}
          label={getRelationshipLabel(selectedPerson.id, people, rels)}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      <Footer />
    </div>
  );
}
