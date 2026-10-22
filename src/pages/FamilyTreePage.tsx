import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, X, Edit2, Trash2, Users, UserPlus, Send,
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
  computeFamilies, statusLabel, UNION_STATUSES, CHILD_LINK_KINDS,
  flagUrl, COUNTRY_NAMES, NODE_W, NODE_H,
  type SubmissionData, type SubmissionMember, type FamilyGroup,
} from '@/lib/familyTree';

// ── Styles ────────────────────────────────────────────────────────────────────

const inp =
  'w-full  border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

const sel =
  'w-full  border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none';

const btn = (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => {
  const base = 'inline-flex items-center gap-1.5  px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40';
  if (variant === 'primary') return `${base} bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90`;
  if (variant === 'danger') return `${base} bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger-bg)]`;
  return `${base} border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]`;
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
  pos_x: null,
  pos_y: null,
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
      <div className={` border ${isRoot ? 'border-[var(--accent)]' : 'border-[var(--border)]'} bg-[var(--surface)] p-2.5 shadow-lg transition-all group-hover:border-[var(--accent)] group-hover:shadow-[var(--accent-soft)]`}>
        {/* avatar */}
        <div className="mb-2 h-12 w-12 overflow-hidden rounded-full border border-[var(--border)] mx-auto bg-[var(--bg-soft)] flex items-center justify-center">
          {thumb
            ? <img src={thumb.url} alt={person.name} className="h-full w-full object-cover" />
            : <Users size={20} className="text-[var(--muted)]" />
          }
        </div>
        <p className="text-center text-xs font-semibold text-[var(--ink)] leading-tight truncate">{person.name}</p>
        {isRoot && <p className="text-center text-[10px] text-[var(--accent)] mt-0.5">You</p>}
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

// Line style for a parent→child link, by child-link kind
// Parent→child links use the muted ink; adopted/foster lean on the brand blue so
// they read against both the light "Stone" and dark "Slate" grounds.
const LINK_KIN = 'var(--accent)';
const LINK_INK = 'var(--muted)';
const LINK_UNION = 'var(--accent)';

function childLinkStyle(status: string | null): { stroke: string; width: number; dash?: string } {
  switch (status) {
    case 'adopted': return { stroke: LINK_KIN, width: 1.5, dash: '6,4' };
    case 'foster':  return { stroke: LINK_KIN, width: 1.5, dash: '1,4' };
    case 'step':    return { stroke: LINK_INK, width: 1,   dash: '2,4' };
    default:        return { stroke: LINK_INK, width: 1.5 }; // biological
  }
}

// Line style for a union link, by union status
function unionStyle(status: string | null): { stroke: string; width: number; dash?: string } {
  switch (status) {
    case 'partner':   return { stroke: LINK_UNION, width: 1.75, dash: '6,4' };
    case 'engaged':   return { stroke: LINK_UNION, width: 1.75, dash: '1,4' };
    case 'separated': return { stroke: LINK_INK,   width: 1.5,  dash: '7,6' };
    case 'divorced':  return { stroke: LINK_INK,   width: 1.5,  dash: '3,5' };
    case 'widowed':   return { stroke: LINK_UNION, width: 1.5,  dash: '5,4' };
    default:          return { stroke: LINK_UNION, width: 1.75 }; // married
  }
}

function Connectors({
  nodes, rels,
}: {
  nodes: { id: string; x: number; y: number }[];
  rels: FamilyRelationship[];
}) {
  const nodeById = new Map<string, { id: string; x: number; y: number }>(nodes.map(n => [n.id, n]));
  const lines: JSX.Element[] = [];

  // child → set of its parents, and child → its parent-link status (for styling)
  const parentsOf = new Map<string, Set<string>>();
  const childStatus = new Map<string, string | null>();
  for (const r of rels) {
    if (r.relationship_type === 'parent') {
      if (!parentsOf.has(r.person_b_id)) parentsOf.set(r.person_b_id, new Set());
      parentsOf.get(r.person_b_id)!.add(r.person_a_id);
      if (!childStatus.has(r.person_b_id)) childStatus.set(r.person_b_id, r.status);
    } else if (r.relationship_type === 'child') {
      if (!parentsOf.has(r.person_a_id)) parentsOf.set(r.person_a_id, new Set());
      parentsOf.get(r.person_a_id)!.add(r.person_b_id);
      if (!childStatus.has(r.person_a_id)) childStatus.set(r.person_a_id, r.status);
    }
  }

  // spouse couples present, so co-parents share a single junction to their kids
  const coupleKeys = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type === 'spouse') coupleKeys.add([r.person_a_id, r.person_b_id].sort().join('-'));
  }

  // group children by the set of their parents present in the layout
  const groups = new Map<string, { parents: string[]; children: string[] }>();
  for (const [childId, pset] of parentsOf) {
    if (!nodeById.has(childId)) continue;
    const present = [...pset].filter(pid => nodeById.has(pid)).sort();
    if (present.length === 0) continue;
    const gkey = present.join('-');
    if (!groups.has(gkey)) groups.set(gkey, { parents: present, children: [] });
    groups.get(gkey)!.children.push(childId);
  }

  // draw each nuclear family as: parent couple → drop → bar → down to each child
  for (const { parents, children } of groups.values()) {
    const pNodes = parents.map(id => nodeById.get(id)!).filter(Boolean);
    const cNodes = children.map(id => nodeById.get(id)!).filter(Boolean);
    if (pNodes.length === 0 || cNodes.length === 0) continue;

    const multi = pNodes.length >= 2;
    const married = multi && coupleKeys.has(parents.slice(0, 2).sort().join('-'));
    const originX = multi
      ? pNodes.reduce((s, n) => s + n.x + NODE_W / 2, 0) / pNodes.length
      : pNodes[0].x + NODE_W / 2;
    const originY = married
      ? pNodes[0].y + NODE_H / 2                       // on the marriage line
      : Math.max(...pNodes.map(n => n.y)) + NODE_H;    // below the parent card

    const railY = Math.min(...cNodes.map(n => n.y)) - 22;
    const centers = cNodes.map(n => n.x + NODE_W / 2);

    // vertical drop from the couple down to the sibling rail
    lines.push(
      <path key={`drop-${parents.join('_')}`}
        d={`M${originX},${originY} L${originX},${railY}`}
        fill="none" stroke={LINK_INK} strokeWidth={1.5} />
    );
    // horizontal rail spanning the children and the drop point
    const barLeft = Math.min(originX, ...centers);
    const barRight = Math.max(originX, ...centers);
    if (barRight - barLeft > 1) {
      lines.push(
        <line key={`rail-${parents.join('_')}`}
          x1={barLeft} y1={railY} x2={barRight} y2={railY}
          stroke={LINK_INK} strokeWidth={1.5} />
      );
    }
    // down from the rail to each child, styled by that child's link kind
    for (const c of cNodes) {
      const cx = c.x + NODE_W / 2;
      const st = childLinkStyle(childStatus.get(c.id) ?? null);
      lines.push(
        <path key={`cdrop-${c.id}`}
          d={`M${cx},${railY} L${cx},${c.y}`}
          fill="none" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} />
      );
    }
  }

  // union lines (horizontal)
  const drawnS = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type !== 'spouse') continue;
    const key = [r.person_a_id, r.person_b_id].sort().join('-');
    if (drawnS.has(key)) continue;
    drawnS.add(key);
    const a = nodeById.get(r.person_a_id);
    const b = nodeById.get(r.person_b_id);
    if (!a || !b) continue;
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    const x1 = left.x + NODE_W;
    const x2 = right.x;
    const y = left.y + NODE_H / 2;
    const st = unionStyle(r.status);
    lines.push(
      <line
        key={key}
        x1={x1} y1={y} x2={x2} y2={y}
        stroke={st.stroke}
        strokeWidth={st.width}
        strokeDasharray={st.dash}
      />
    );
  }

  // sibling ties — only when the pair shares no parent that's drawn above them,
  // so siblings who are already joined through a common parent don't get a
  // redundant line, while siblings linked directly (no parent in the tree) still
  // show the relationship. Routed as a bracket above the row to avoid crossing boxes.
  const drawnSib = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type !== 'sibling') continue;
    const key = [r.person_a_id, r.person_b_id].sort().join('-');
    if (drawnSib.has(key)) continue;
    drawnSib.add(key);
    const a = nodeById.get(r.person_a_id);
    const b = nodeById.get(r.person_b_id);
    if (!a || !b) continue;
    // skip if they share a parent that is present in the layout (already joined)
    const pa = parentsOf.get(r.person_a_id) ?? new Set<string>();
    const pb = parentsOf.get(r.person_b_id) ?? new Set<string>();
    let shared = false;
    for (const p of pa) if (pb.has(p) && nodeById.has(p)) { shared = true; break; }
    if (shared) continue;
    const ax = a.x + NODE_W / 2;
    const bx = b.x + NODE_W / 2;
    const rail = Math.min(a.y, b.y) - 16;
    lines.push(
      <path
        key={`sib-${key}`}
        d={`M${ax},${a.y} L${ax},${rail} L${bx},${rail} L${bx},${b.y}`}
        fill="none"
        stroke={LINK_INK}
        strokeWidth={1.25}
        strokeDasharray="2,4"
      />
    );
  }

  return <>{lines}</>;
}

// Soft tinted panels behind each nuclear family
function FamilyHighlights({
  families, nodeById,
}: {
  families: FamilyGroup[];
  nodeById: Map<string, { x: number; y: number }>;
}) {
  const PAD = 16;
  // The visible card is taller than NODE_H (icon + name + location row ≈ 114px),
  // so bound the panel to the real card height, not the layout slot, or cards
  // poke out the bottom of their family panel.
  const CARD_H = 116;
  return (
    <>
      {families.map(fam => {
        const pts = fam.memberIds.map(id => nodeById.get(id)).filter(Boolean) as { x: number; y: number }[];
        if (pts.length < 2) return null; // skip lone/single-member groups
        const minX = Math.min(...pts.map(p => p.x)) - PAD;
        const minY = Math.min(...pts.map(p => p.y)) - PAD;
        const maxX = Math.max(...pts.map(p => p.x)) + NODE_W + PAD;
        const maxY = Math.max(...pts.map(p => p.y)) + CARD_H + PAD;
        return (
          <div
            key={fam.id}
            style={{
              position: 'absolute',
              left: minX, top: minY,
              width: maxX - minX, height: maxY - minY,
              borderRadius: 24,
              background: `hsla(${fam.hue}, 70%, 55%, 0.07)`,
              border: `1px solid hsla(${fam.hue}, 70%, 60%, 0.22)`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

// ── Profile modal ─────────────────────────────────────────────────────────────

function ProfileModal({
  person, photos, label, isAnchor, onViewFrom, onClose,
}: {
  person: FamilyPerson;
  photos: FamilyPhoto[];
  label: string;
  isAnchor: boolean;
  onViewFrom: () => void;
  onClose: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const sorted = [...photos].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md  border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--ink)]">
          <X size={18} />
        </button>

        {/* Photo gallery */}
        {sorted.length > 0 ? (
          <div className="mb-4">
            <div className="relative h-48  overflow-hidden bg-[var(--bg-soft)]">
              <img src={sorted[photoIdx].url} alt={person.name} className="h-full w-full object-cover" />
              {sorted.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {sorted.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i === photoIdx ? 'bg-[var(--accent)]' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 h-20  bg-[var(--bg-soft)] flex items-center justify-center">
            <ImageOff size={28} className="text-[var(--muted)]" />
          </div>
        )}

        <h2 className="text-xl font-bold text-[var(--ink)] mb-0.5">{person.name}</h2>
        {label && <p className="text-xs text-[var(--accent)] mb-3">{label}</p>}

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

        {/* Perspective control */}
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          {isAnchor ? (
            <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Users size={14} className="text-[var(--accent)]" />
              The tree is showing everyone’s relationship to {person.name.split(' ')[0]}.
            </p>
          ) : (
            <button onClick={onViewFrom} className="flex w-full items-center justify-center gap-2  border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
              <Users size={15} />
              View relationships from {person.name.split(' ')[0]}’s view
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin: Edit person form ────────────────────────────────────────────────────

function PersonForm({
  initial, photos, onSave, onCancel, onDeletePhoto, onUploadPhoto, saving, uploading, error,
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
    pos_x: initial.pos_x ?? null,
    pos_y: initial.pos_y ?? null,
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
              <span key={h} className="flex items-center gap-1 rounded-full bg-[var(--bg-soft)]px-2.5 py-0.5 text-xs text-[var(--muted)]">
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
              <img src={ph.url} alt="" className="h-16 w-16  object-cover border border-[var(--border)]" />
              <button
                onClick={() => onDeletePhoto(ph)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-[var(--danger)] p-0.5 text-[var(--ink)]"
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
              className="h-16 w-16  border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:border-[var(--accent)] disabled:opacity-40"
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

      {error && <p className="text-xs text-[var(--danger)]  bg-[var(--danger-bg)] px-3 py-2">{error}</p>}
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
  onAdd: (a: string, b: string, type: FamilyRelationship['relationship_type'], status: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [type, setType] = useState<FamilyRelationship['relationship_type']>('child');
  const [status, setStatus] = useState<string>('');
  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? id;

  const showStatus = type === 'spouse' || type === 'parent' || type === 'child';
  const statusOptions = type === 'spouse' ? UNION_STATUSES : CHILD_LINK_KINDS;

  return (
    <div className="space-y-4">
      <div className=" border border-[var(--border)] bg-[var(--bg-soft)] p-4 space-y-3">
        <p className="text-xs text-[var(--muted)] font-medium">Add Relationship</p>
        <div className="grid grid-cols-3 gap-2">
          <select className={sel} value={a} onChange={e => setA(e.target.value)}>
            <option value="">Person A</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={sel} value={type} onChange={e => { setType(e.target.value as FamilyRelationship['relationship_type']); setStatus(''); }}>
            <option value="parent">is parent of →</option>
            <option value="child">is child of →</option>
            <option value="spouse">is partner of →</option>
            <option value="sibling">is sibling of →</option>
          </select>
          <select className={sel} value={b} onChange={e => setB(e.target.value)}>
            <option value="">Person B</option>
            {people.filter(p => p.id !== a).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {showStatus && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">
              {type === 'spouse' ? 'Union status' : 'Link type'}
            </span>
            <select className={sel} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">{type === 'spouse' ? 'Married (default)' : 'Biological (default)'}</option>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <button
          className={btn('primary')}
          disabled={!a || !b}
          onClick={() => { onAdd(a, b, type, status || null); setA(''); setB(''); setStatus(''); }}
        >
          <Link2 size={12} /> Add Link
        </button>
      </div>

      <div className="space-y-2">
        {rels.map(r => (
          <div key={r.id} className="flex items-center justify-between  border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-xs text-[var(--muted)]">
            <span>
              <span className="text-[var(--ink)] font-medium">{nameOf(r.person_a_id)}</span>
              {' '}is {r.relationship_type === 'spouse' ? statusLabel('spouse', r.status) : r.relationship_type} of{' '}
              <span className="text-[var(--ink)] font-medium">{nameOf(r.person_b_id)}</span>
              {(r.relationship_type === 'parent' || r.relationship_type === 'child') && r.status && r.status !== 'biological' && (
                <span className="ml-1 rounded bg-[var(--bg-soft)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{statusLabel(r.relationship_type, r.status)}</span>
              )}
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
        <CheckCircle size={36} className="text-[var(--ok)] mx-auto mb-3" />
        <p className="text-[var(--ink)] font-semibold mb-1">Branch Submitted!</p>
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
          <p className="text-sm font-medium text-[var(--ink)]">Family Members</p>
          <button className={btn('ghost')} onClick={addMember}><Plus size={13} /> Add Person</button>
        </div>
        <div className="space-y-4">
          {members.map((m, i) => (
            <div key={i} className=" border border-[var(--border)] bg-[var(--bg-soft)] p-4 space-y-3">
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

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

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
    s === 'approved' ? <CheckCircle size={14} className="text-[var(--ok)]" /> :
    s === 'rejected' ? <XCircle size={14} className="text-[var(--danger)]" /> :
    <Clock size={14} className="text-[var(--warn)]" />;

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-[var(--muted)] text-center py-4"><Loader2 size={16} className="animate-spin inline" /></p>}
      {!loading && submissions.length === 0 && (
        <p className="text-xs text-[var(--muted)] text-center py-6">No submissions yet</p>
      )}
      {submissions.map(s => (
        <div key={s.id} className=" border border-[var(--border)] bg-[var(--bg-soft)] overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-soft)]"
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            <div className="flex items-center gap-2">
              {statusIcon(s.status)}
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">{s.submitter_name}</p>
                <p className="text-xs text-[var(--muted)]">{s.submitter_email} · {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted)]">{(s.data.members ?? []).length} member{(s.data.members ?? []).length !== 1 ? 's' : ''}</span>
              {expanded === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </div>

          {expanded === s.id && (
            <div className="border-t border-[var(--border)]px-4 py-3 space-y-3">
              {(s.data.members ?? []).map((m, i) => (
                <div key={i} className="text-xs text-[var(--muted)] space-y-0.5">
                  <p className="text-[var(--ink)] font-medium">{m.name}</p>
                  {m.birth_year && <p>Born: {m.birth_year}</p>}
                  {(m.city || m.country_code) && <p>Location: {[m.city, m.country_code].filter(Boolean).join(', ')}</p>}
                  {m.profession && <p>Profession: {m.profession}</p>}
                  {m.hobbies && m.hobbies.length > 0 && <p>Hobbies: {m.hobbies.join(', ')}</p>}
                  {m.bio && <p>Bio: {m.bio}</p>}
                  {m.relationship_to_anchor && <p>Relationship: {m.relationship_to_anchor} of {m.anchor_name}</p>}
                  {m.photo_urls && m.photo_urls.length > 0 && (
                    <div className="flex gap-1.5 mt-1">
                      {m.photo_urls.map((u, j) => (
                        <img key={j} src={u} className="h-10 w-10  object-cover border border-[var(--border)]" alt="" />
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
              {s.admin_notes && <p className="text-xs text-[var(--muted)] italic border-t border-[var(--border)]pt-2">Note: {s.admin_notes}</p>}
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
      {err && <p className="text-xs text-[var(--danger)]">{err}</p>}
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
  // Client-side "view from here": pick anyone as the "You" the labels are
  // measured from, without touching the stored is_root. null = use the stored
  // root (if any).
  const [viewAsId, setViewAsId] = useState<string | null>(null);

  // ── Canvas pan/zoom ─────────────────────────────────────────────────────────
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const editFormRef = useRef<HTMLDivElement>(null);
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

  // ── Perspective ───────────────────────────────────────────────────────────────
  // The person the relationship labels are measured from: an explicit "view from
  // here" pick, else the stored root. Re-flag a copy of the people so layout,
  // generations and labels all re-orient around them (node positions are
  // unaffected — only the row that counts as generation 0 changes).
  const storedRoot = people.find(p => p.is_root) ?? null;
  const anchorId = viewAsId ?? storedRoot?.id ?? null;
  const anchorPerson = anchorId ? people.find(p => p.id === anchorId) ?? null : null;
  const rootedPeople = anchorId
    ? people.map(p => (p.is_root === (p.id === anchorId) ? p : { ...p, is_root: p.id === anchorId }))
    : people;

  // ── Layout ──────────────────────────────────────────────────────────────────
  const { nodes, width, height } = buildLayout(rootedPeople, rels);
  const families = computeFamilies(people, rels);
  const nodePosById = new Map(nodes.map(n => [n.person.id, { x: n.x, y: n.y }]));
  const genMap = computeGenerations(rootedPeople, rels);

  // ── Initial view: centre horizontally on the grandparent generation ──────────
  // The top generation that still has descendants = the ancestral grandparents
  // (childless top-row people like an unlinked in-law don't skew the centre).
  const centeredRef = useRef(false);
  useEffect(() => {
    if (centeredRef.current || nodes.length === 0) return;
    const el = canvasRef.current;
    const cw = el?.clientWidth ?? 0;
    if (!cw) return;
    const minGen = Math.min(...nodes.map(n => n.generation));
    const parentIds = new Set<string>();
    for (const r of rels) {
      if (r.relationship_type === 'parent') parentIds.add(r.person_a_id);
      else if (r.relationship_type === 'child') parentIds.add(r.person_b_id);
    }
    let anchors = nodes.filter(n => n.generation === minGen && parentIds.has(n.person.id));
    if (anchors.length === 0) anchors = nodes.filter(n => n.generation === minGen);
    const cx = anchors.reduce((s, n) => s + n.x + NODE_W / 2, 0) / anchors.length;
    setOffset({ x: cw / 2 - cx, y: 40 });
    centeredRef.current = true;
  }, [nodes, rels]);

  // The edit form opens at the top of the People panel; when you edit someone far
  // down the list, scroll it into view so it doesn't look like nothing happened.
  useEffect(() => {
    if (editingPerson) editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingPerson]);

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

  const addRel = async (a: string, b: string, type: FamilyRelationship['relationship_type'], status: string | null) => {
    if (!supabase) return;
    await supabase.from('family_relationships').insert({ person_a_id: a, person_b_id: b, relationship_type: type, status });
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

  // ── Admin: drag a single node ───────────────────────────────────────────────
  // While dragging, livePos holds the node's live canvas position. A pointer that
  // barely moves counts as a click (open profile); a real drag persists pos_x/pos_y.
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

  const startNodeDrag = (e: React.MouseEvent, node: { person: FamilyPerson; x: number; y: number }) => {
    if (!isAdmin) return;
    e.stopPropagation(); // don't pan the canvas
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { x: origX, y: origY } = node;
    const s = scale;
    let moved = false;

    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / s;
      const dy = (ev.clientY - startY) / s;
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) moved = true;
      setLivePos({ id: node.person.id, x: origX + dx, y: origY + dy });
    };

    const up = async (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setLivePos(null);
      if (!moved) { setSelectedPerson(node.person); return; } // treated as a click
      const finalX = Math.round(origX + (ev.clientX - startX) / s);
      const finalY = Math.round(origY + (ev.clientY - startY) / s);
      // Optimistic local update, then persist.
      setPeople(ps => ps.map(p => p.id === node.person.id ? { ...p, pos_x: finalX, pos_y: finalY } : p));
      if (supabase) {
        await supabase.from('family_people').update({ pos_x: finalX, pos_y: finalY }).eq('id', node.person.id);
      }
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const resetLayout = async () => {
    if (!supabase || !confirm('Reset to automatic layout? This clears every card you have dragged.')) return;
    setPeople(ps => ps.map(p => ({ ...p, pos_x: null, pos_y: null })));
    await supabase.from('family_people').update({ pos_x: null, pos_y: null }).not('id', 'is', null);
  };

  // Effective canvas position for a node (follows the live drag while dragging).
  const posOf = (n: { person: FamilyPerson; x: number; y: number }) =>
    livePos && livePos.id === n.person.id ? { x: livePos.x, y: livePos.y } : { x: n.x, y: n.y };

  // ── Pending count badge ─────────────────────────────────────────────────────
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // ── Generation rows for legend ──────────────────────────────────────────────
  const genNumbers = [...new Set([...genMap.values()])].sort((a, b) => a - b);

  return (
    <div className="paper min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]">
            Andrew<span className="text-[var(--accent)]">.</span>FamilyTree
          </Link>
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
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--danger)] text-[10px] flex items-center justify-center text-[var(--ink)] font-bold">
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
            {/* Perspective banner — shown while viewing from a hand-picked person */}
            {viewAsId && anchorPerson && (
              <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 flex items-center gap-2.5 rounded-full border border-[var(--accent)] bg-[var(--surface)]/95 px-3.5 py-1.5 shadow-lg backdrop-blur-sm">
                <Users size={13} className="text-[var(--accent)]" />
                <span className="text-xs text-[var(--ink)]">
                  Relationships shown from <span className="font-semibold">{anchorPerson.name}</span>
                </span>
                <button
                  onClick={() => setViewAsId(null)}
                  className="flex items-center gap-1 rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                >
                  <X size={11} /> Reset
                </button>
              </div>
            )}

            {/* Login popover */}
            {showLogin && !isAdmin && (
              <div className="absolute top-4 right-4 z-20 w-72  border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold">Admin Login</p>
                  <button onClick={() => setShowLogin(false)}><X size={14} /></button>
                </div>
                <AdminLogin onLogin={() => setShowLogin(false)} />
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
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
                    <div key={g} className="flex items-center gap-1.5  border border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-sm px-2 py-1">
                      <span className="text-[10px] text-[var(--muted)]">{g > 0 ? `+${g}` : g}</span>
                      <span className="text-[10px] text-[var(--ink)]/80">{generationLabel(g)}</span>
                    </div>
                  ))}
                </div>

                {/* Line-style legend */}
                <div className="absolute left-3 bottom-3 z-10  border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm px-2.5 py-2 pointer-events-none">
                  <p className="text-[9px] uppercase tracking-wide text-[var(--muted)] mb-1">Key</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      { c: LINK_UNION, d: '', t: 'Married' },
                      { c: LINK_UNION, d: '6,4', t: 'Partners' },
                      { c: LINK_INK, d: '7,6', t: 'Separated' },
                      { c: LINK_INK, d: '3,5', t: 'Divorced' },
                      { c: LINK_INK, d: '', t: 'Biological' },
                      { c: LINK_KIN, d: '6,4', t: 'Adopted' },
                      { c: LINK_KIN, d: '1,4', t: 'Foster' },
                      { c: LINK_INK, d: '2,4', t: 'Step' },
                    ].map(k => (
                      <div key={k.t} className="flex items-center gap-1.5">
                        <svg width={18} height={6}><line x1={0} y1={3} x2={18} y2={3} stroke={k.c} strokeWidth={1.5} strokeDasharray={k.d || undefined} /></svg>
                        <span className="text-[9px] text-[var(--ink)]/80">{k.t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin drag hint */}
                {isAdmin && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm px-3 py-1.5 pointer-events-none">
                    <Edit2 size={12} className="text-[var(--accent)]" />
                    <span className="text-[11px] text-[var(--muted)]">Drag cards to rearrange — positions save automatically</span>
                  </div>
                )}

                {/* Zoom controls */}
                <div className="absolute right-3 bottom-16 z-10 flex flex-col gap-1">
                  <button className={btn('ghost')} onClick={() => setScale(s => Math.min(2, s + 0.1))}>+</button>
                  <button className={btn('ghost')} onClick={() => setScale(1)}>1×</button>
                  <button className={btn('ghost')} onClick={() => setScale(s => Math.max(0.3, s - 0.1))}>−</button>
                  {isAdmin && (
                    <button className={btn('ghost')} onClick={resetLayout} title="Reset to automatic layout">
                      <RefreshCw size={13} />
                    </button>
                  )}
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
                    {/* Nuclear family highlight panels (behind everything) */}
                    <FamilyHighlights families={families} nodeById={nodePosById} />

                    {/* SVG connector lines */}
                    <svg
                      style={{ position: 'absolute', top: 0, left: 0, width: width + 80, height: height + 80, overflow: 'visible' }}
                    >
                      <Connectors nodes={nodes.map(n => ({ id: n.person.id, ...posOf(n) }))} rels={rels} />
                    </svg>

                    {/* Person nodes */}
                    {nodes.map(node => {
                      const pos = posOf(node);
                      return (
                        <div
                          key={node.person.id}
                          style={{
                            position: 'absolute', left: pos.x, top: pos.y, width: NODE_W, height: NODE_H,
                            zIndex: livePos?.id === node.person.id ? 20 : undefined,
                            cursor: isAdmin ? (livePos?.id === node.person.id ? 'grabbing' : 'grab') : 'pointer',
                          }}
                          onMouseDown={isAdmin ? (e) => startNodeDrag(e, node) : undefined}
                        >
                          <TreeNodeCard
                            person={node.person}
                            photos={photos.filter(ph => ph.person_id === node.person.id)}
                            label={getRelationshipLabel(node.person.id, rootedPeople, rels)}
                            isRoot={node.person.is_root}
                            onClick={isAdmin ? () => {} : () => setSelectedPerson(node.person)}
                          />
                        </div>
                      );
                    })}
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
                    <div ref={editFormRef} className="mb-6  border border-[var(--border)] bg-[var(--surface)] p-5 scroll-mt-4">
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
                      <div key={p.id} className="flex items-center justify-between  border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const ph = photos.find(x => x.person_id === p.id);
                            return ph
                              ? <img src={ph.url} className="h-9 w-9 rounded-full object-cover border border-[var(--border)]" alt="" />
                              : <div className="h-9 w-9 rounded-full bg-[var(--bg-soft)] flex items-center justify-center"><Users size={16} className="text-[var(--muted)]" /></div>;
                          })()}
                          <div>
                            <p className="text-sm font-medium">{p.name} {p.is_root && <span className="text-[10px] text-[var(--accent)]">(root)</span>}</p>
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
                    ? <p className="text-sm text-[var(--danger)]">Supabase is not configured.</p>
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
          label={getRelationshipLabel(selectedPerson.id, rootedPeople, rels)}
          isAnchor={!!anchorId && selectedPerson.id === anchorId}
          onViewFrom={() => { setViewAsId(selectedPerson.id); setSelectedPerson(null); }}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      <Footer />
    </div>
  );
}
