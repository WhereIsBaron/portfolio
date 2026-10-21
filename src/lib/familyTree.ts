// ── Types ─────────────────────────────────────────────────────────────────────

export interface FamilyPerson {
  id: string;
  name: string;
  birth_year: number | null;
  death_year: number | null;
  birth_date: string | null;  // ISO date "YYYY-MM-DD"
  death_date: string | null;
  country_code: string | null;
  city: string | null;
  profession: string | null;
  hobbies: string[];
  bio: string | null;
  is_root: boolean;
  pos_x: number | null; // manual (admin-dragged) position; null = auto-layout
  pos_y: number | null;
  created_at: string;
}

export type UnionStatus = 'married' | 'partner' | 'engaged' | 'separated' | 'divorced' | 'widowed';
export type ChildLinkKind = 'biological' | 'adopted' | 'foster' | 'step';

export interface FamilyRelationship {
  id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling';
  status: string | null; // union status (spouse) or child-link kind (parent/child)
}

export const UNION_STATUSES: { value: UnionStatus; label: string }[] = [
  { value: 'married',   label: 'Married' },
  { value: 'partner',   label: 'Partners (unmarried)' },
  { value: 'engaged',   label: 'Engaged' },
  { value: 'separated', label: 'Separated' },
  { value: 'divorced',  label: 'Divorced' },
  { value: 'widowed',   label: 'Widowed' },
];

export const CHILD_LINK_KINDS: { value: ChildLinkKind; label: string }[] = [
  { value: 'biological', label: 'Biological' },
  { value: 'adopted',    label: 'Adopted' },
  { value: 'foster',     label: 'Foster' },
  { value: 'step',       label: 'Step' },
];

export function statusLabel(type: FamilyRelationship['relationship_type'], status: string | null): string {
  if (!status) return type === 'spouse' ? 'married' : type === 'parent' || type === 'child' ? 'biological' : '';
  const src = type === 'spouse' ? UNION_STATUSES : CHILD_LINK_KINDS;
  return (src as { value: string; label: string }[]).find(s => s.value === status)?.label.toLowerCase() ?? status;
}

export interface FamilyPhoto {
  id: string;
  person_id: string;
  storage_path: string;
  url: string;
  display_order: number;
}

export interface FamilySubmission {
  id: string;
  submitter_name: string;
  submitter_email: string;
  data: SubmissionData;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

export interface SubmissionMember {
  name: string;
  birth_year?: number;
  birth_date?: string;
  country_code?: string;
  city?: string;
  profession?: string;
  hobbies?: string[];
  bio?: string;
  photo_urls?: string[];
  relationship_to_anchor?: string;
  anchor_name?: string;
}

export interface SubmissionData {
  members: SubmissionMember[];
  notes?: string;
}

// ── Relationship label calculation ────────────────────────────────────────────

// Generation number for each person via longest parent-chain (topological depth).
// Top ancestors = 0, each child sits strictly below ALL of its parents. Spouse and
// sibling edges only pull married-in (parentless) people onto their blood relative's row.
// If a person is marked is_root, generations are shifted so that person is 0 (ancestors
// become negative), which keeps the "You / Parents / Children" labels meaningful.
export function computeGenerations(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): Map<string, number> {
  if (people.length === 0) return new Map();

  const ids = new Set(people.map(p => p.id));
  const parentEdges: [string, string][] = []; // [parent, child]
  const spousePairs: [string, string][] = [];
  const siblingPairs: [string, string][] = [];
  for (const r of rels) {
    if (r.relationship_type === 'parent') parentEdges.push([r.person_a_id, r.person_b_id]);
    else if (r.relationship_type === 'child') parentEdges.push([r.person_b_id, r.person_a_id]);
    else if (r.relationship_type === 'spouse') spousePairs.push([r.person_a_id, r.person_b_id]);
    else if (r.relationship_type === 'sibling') siblingPairs.push([r.person_a_id, r.person_b_id]);
  }

  // Relax three constraints together until stable: child > every parent,
  // spouses equal, siblings equal. Values only rise, bounded by chain length,
  // so this converges (cap guards against contradictory cycles).
  const gen = new Map<string, number>();
  for (const p of people) gen.set(p.id, 0);
  const raiseEqual = (a: string, b: string) => {
    if (!ids.has(a) || !ids.has(b)) return false;
    const m = Math.max(gen.get(a)!, gen.get(b)!);
    let ch = false;
    if (gen.get(a)! !== m) { gen.set(a, m); ch = true; }
    if (gen.get(b)! !== m) { gen.set(b, m); ch = true; }
    return ch;
  };
  const cap = people.length * 2 + 10;
  for (let iter = 0; iter < cap; iter++) {
    let changed = false;
    for (const [p, c] of parentEdges) {
      if (!ids.has(p) || !ids.has(c)) continue;
      const want = gen.get(p)! + 1;
      if (gen.get(c)! < want) { gen.set(c, want); changed = true; }
    }
    for (const [a, b] of spousePairs) if (raiseEqual(a, b)) changed = true;
    for (const [a, b] of siblingPairs) if (raiseEqual(a, b)) changed = true;
    if (!changed) break;
  }

  // If an explicit root is marked, shift so they sit at generation 0.
  const root = people.find(p => p.is_root);
  if (root && gen.has(root.id)) {
    const base = gen.get(root.id)!;
    if (base !== 0) for (const [k, v] of gen) gen.set(k, v - base);
  }

  return gen;
}

// Blood-relation graph (parent/child edges only) plus an explicit spouse map.
interface Kin {
  parentsOf: Map<string, Set<string>>;   // person → their parents
  spousesOf: Map<string, Set<string>>;   // person → their spouses/partners
  siblingEdges: Map<string, Set<string>>; // explicit sibling links (no shared parent needed)
}

function buildKin(people: FamilyPerson[], rels: FamilyRelationship[]): Kin {
  const ids = new Set(people.map(p => p.id));
  const parentsOf = new Map<string, Set<string>>();
  const spousesOf = new Map<string, Set<string>>();
  const siblingEdges = new Map<string, Set<string>>();
  const link = (m: Map<string, Set<string>>, k: string, v: string) => {
    if (!ids.has(k) || !ids.has(v)) return;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(v);
  };
  for (const r of rels) {
    if (r.relationship_type === 'parent') link(parentsOf, r.person_b_id, r.person_a_id);
    else if (r.relationship_type === 'child') link(parentsOf, r.person_a_id, r.person_b_id);
    else if (r.relationship_type === 'spouse') { link(spousesOf, r.person_a_id, r.person_b_id); link(spousesOf, r.person_b_id, r.person_a_id); }
    else if (r.relationship_type === 'sibling') { link(siblingEdges, r.person_a_id, r.person_b_id); link(siblingEdges, r.person_b_id, r.person_a_id); }
  }
  return { parentsOf, spousesOf, siblingEdges };
}

// Every ancestor of `id` (including id at distance 0) with its generational distance.
function ancestorDistances(id: string, parentsOf: Map<string, Set<string>>): Map<string, number> {
  const dist = new Map<string, number>([[id, 0]]);
  const queue: string[] = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const p of parentsOf.get(cur) ?? []) {
      if (!dist.has(p)) { dist.set(p, d + 1); queue.push(p); }
    }
  }
  return dist;
}

const ORDINALS = ['0th', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`;
const removedWord = (n: number) => n === 1 ? 'once' : n === 2 ? 'twice' : n === 3 ? 'three times' : `${n}×`;
// "great" prefix chain: greats(0)='', greats(1)='Great-', greats(2)='Great-great-', 3+ => 'N× Great-'
const greats = (n: number) => n <= 0 ? '' : n <= 2 ? 'Great-'.repeat(n) : `${n}× Great-`;

function ancestorLabel(up: number): string {
  if (up === 1) return 'Parent';
  if (up === 2) return 'Grandparent';
  return `${greats(up - 2)}grandparent`;
}
function descendantLabel(down: number): string {
  if (down === 1) return 'Child';
  if (down === 2) return 'Grandchild';
  return `${greats(down - 2)}grandchild`;
}
function auntUncleLabel(grand: number): string {
  return grand <= 0 ? 'Aunt / Uncle' : `${greats(grand)}aunt / uncle`;
}
function nieceNephewLabel(grand: number): string {
  return grand <= 0 ? 'Niece / Nephew' : `${greats(grand)}niece / nephew`;
}
function cousinLabel(degree: number, removed: number): string {
  return `${ordinal(degree)} Cousin${removed ? ` ${removedWord(removed)} removed` : ''}`;
}

// Blood relationship of `target` as seen from `from`, via their lowest common
// ancestor. null when they share no ancestor (i.e. not blood-related).
function bloodLabel(fromId: string, targetId: string, parentsOf: Map<string, Set<string>>): string | null {
  const ancFrom = ancestorDistances(fromId, parentsOf);
  const ancTarget = ancestorDistances(targetId, parentsOf);
  let best: { up: number; down: number } | null = null;
  for (const [anc, up] of ancFrom) {
    const down = ancTarget.get(anc);
    if (down === undefined) continue;
    if (!best || up + down < best.up + best.down || (up + down === best.up + best.down && Math.max(up, down) < Math.max(best.up, best.down))) {
      best = { up, down };
    }
  }
  if (!best) return null;
  const { up, down } = best;
  if (up === 0 && down === 0) return 'You';
  if (up === 0) return descendantLabel(down);   // target descends from `from`
  if (down === 0) return ancestorLabel(up);      // target is an ancestor of `from`
  if (up === 1 && down === 1) return 'Sibling';
  if (down === 1) return auntUncleLabel(up - 2);     // target is a sibling of an ancestor
  if (up === 1) return nieceNephewLabel(down - 2);   // target descends from a sibling
  return cousinLabel(Math.min(up, down) - 1, Math.abs(up - down));
}

// Bucket a blood label so in-law/step wording can be derived from its category.
type Kind = 'ancestor' | 'descendant' | 'sibling' | 'collateral';
function kindOf(label: string): Kind {
  const l = label.toLowerCase();
  if (label === 'Sibling') return 'sibling';
  if (l.endsWith('grandparent') || label === 'Parent') return 'ancestor';
  if (l.endsWith('grandchild') || label === 'Child') return 'descendant';
  return 'collateral';
}

// Returns a human-readable relationship label from the root's perspective.
export function getRelationshipLabel(
  targetId: string,
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): string {
  const root = people.find(p => p.is_root);
  if (!root) return '';
  if (targetId === root.id) return 'You';

  const { parentsOf, spousesOf, siblingEdges } = buildKin(people, rels);

  // Direct partner of the root — colour the word by the union's status.
  if (spousesOf.get(root.id)?.has(targetId)) {
    const rel = rels.find(r =>
      r.relationship_type === 'spouse' &&
      ((r.person_a_id === root.id && r.person_b_id === targetId) ||
       (r.person_b_id === root.id && r.person_a_id === targetId)));
    switch (rel?.status) {
      case 'engaged':   return 'Fiancé(e)';
      case 'partner':   return 'Partner';
      case 'divorced':  return 'Ex-spouse';
      case 'separated': return 'Separated spouse';
      default:          return 'Spouse';
    }
  }

  // Blood relationship via lowest common ancestor.
  const blood = bloodLabel(root.id, targetId, parentsOf);
  if (blood) {
    // Full vs half sibling: share one parent only (and a distinct parent exists).
    if (blood === 'Sibling') {
      const rp = parentsOf.get(root.id) ?? new Set<string>();
      const tp = parentsOf.get(targetId) ?? new Set<string>();
      const shared = [...rp].filter(p => tp.has(p)).length;
      if (shared === 1 && (rp.size > 1 || tp.size > 1)) return 'Half-sibling';
    }
    return blood;
  }

  // Explicit sibling link with no shared parent recorded.
  if (siblingEdges.get(root.id)?.has(targetId)) return 'Sibling';

  // ── In-law / step layer: allow a single spouse hop on either side ──
  // (a) target is married to one of the root's blood relatives.
  for (const sp of spousesOf.get(targetId) ?? []) {
    const bl = sp === root.id ? 'You' : bloodLabel(root.id, sp, parentsOf);
    if (!bl || bl === 'You') continue;
    const k = kindOf(bl);
    if (k === 'ancestor') return `Step-${ancestorStepWord(bl)}`; // your parent's/grandparent's spouse
    if (k === 'sibling') return 'Sibling-in-law';
    if (k === 'descendant') return `${bl}-in-law`;              // your child's spouse
    return `${bl}-in-law`;                                      // aunt/uncle/cousin's spouse
  }
  // (b) target is a blood relative of one of the root's spouses.
  for (const sp of spousesOf.get(root.id) ?? []) {
    const bl = bloodLabel(sp, targetId, parentsOf);
    if (!bl || bl === 'You') continue;
    const k = kindOf(bl);
    if (k === 'ancestor') return `${bl}-in-law`;                // your spouse's parent → Parent-in-law
    if (k === 'sibling') return 'Sibling-in-law';
    if (k === 'descendant') return `Step-${descendantStepWord(bl)}`; // your spouse's child → Step-child
    return `${bl}-in-law`;                                      // your spouse's aunt/cousin
  }

  return 'Relative';
}

// Lowercase an ancestor/descendant label for step wording ("Step-grandparent").
function ancestorStepWord(label: string): string { return label.toLowerCase(); }
function descendantStepWord(label: string): string { return label.toLowerCase(); }

// ── Tree layout ───────────────────────────────────────────────────────────────

export interface TreeNode {
  person: FamilyPerson;
  generation: number;
  x: number;
  y: number;
}

export const NODE_W = 160;
export const NODE_H = 80;
export const GEN_GAP = 170; // vertical gap between generation rows
const NODE_GAP = 44; // horizontal gap between nodes in the same row

export function buildLayout(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): { nodes: TreeNode[]; width: number; height: number } {
  if (people.length === 0) return { nodes: [], width: 0, height: 0 };

  const genMap = computeGenerations(people, rels);
  const genValues = [...genMap.values()];
  const minGen = Math.min(...genValues);
  const maxGen = Math.max(...genValues);

  // Relationship maps
  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  const spouseOf = new Map<string, string>();
  const link = (m: Map<string, Set<string>>, k: string, v: string) => {
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(v);
  };
  for (const r of rels) {
    if (r.relationship_type === 'parent') {
      link(childrenOf, r.person_a_id, r.person_b_id);
      link(parentsOf, r.person_b_id, r.person_a_id);
    } else if (r.relationship_type === 'child') {
      link(childrenOf, r.person_b_id, r.person_a_id);
      link(parentsOf, r.person_a_id, r.person_b_id);
    } else if (r.relationship_type === 'spouse') {
      spouseOf.set(r.person_a_id, r.person_b_id);
      spouseOf.set(r.person_b_id, r.person_a_id);
    }
  }

  // Rows of person ids grouped by generation
  const genRows = new Map<number, string[]>();
  for (const p of people) {
    const g = genMap.get(p.id) ?? 0;
    if (!genRows.has(g)) genRows.set(g, []);
    genRows.get(g)!.push(p.id);
  }
  const gens = [...genRows.keys()].sort((a, b) => a - b);

  // Birth ordering value (eldest = smallest). Unknown births sort last.
  const birthVal = new Map<string, number>();
  for (const p of people) {
    const v = p.birth_date
      ? Date.parse(p.birth_date)
      : (p.birth_year != null ? p.birth_year * 10000 : Number.MAX_SAFE_INTEGER);
    birthVal.set(p.id, Number.isNaN(v) ? Number.MAX_SAFE_INTEGER : v);
  }
  const byAge = (x: string, y: string) => (birthVal.get(x)! - birthVal.get(y)!);

  // Keep spouses next to each other, preserving the incoming order otherwise
  const withSpousesAdjacent = (ids: string[]): string[] => {
    const set = new Set(ids);
    const placed = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      if (placed.has(id)) continue;
      out.push(id); placed.add(id);
      const sp = spouseOf.get(id);
      if (sp && set.has(sp) && !placed.has(sp) && genMap.get(sp) === genMap.get(id)) {
        out.push(sp); placed.add(sp);
      }
    }
    return out;
  };

  // ── Pass 1 (top-down): order each row so children cluster under their parents ──
  const orderIndex = new Map<string, number>();
  gens.forEach((g, gi) => {
    let ids = genRows.get(g)!;
    if (gi === 0) {
      // top row: eldest → left
      ids = withSpousesAdjacent([...ids].sort(byAge));
    } else {
      // Group full siblings (same set of placed parents) into one block, order
      // the blocks by their parents' average position, and keep each block
      // contiguous and age-sorted (eldest → left). Blocking the siblings
      // together — rather than keying each child on its own averaged parent
      // index — stops sibling groups from interleaving when a parent married in
      // from another branch and sits far across the row.
      const placedParents = (id: string) =>
        [...(parentsOf.get(id) ?? [])].filter(pid => orderIndex.has(pid)).sort();
      const groups = new Map<string, string[]>();
      for (const id of ids) {
        const ps = placedParents(id);
        const key = ps.length ? ps.join('|') : `__none__${id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(id);
      }
      const ordered = [...groups.values()]
        .map(members => {
          const ps = placedParents(members[0]);
          const pkey = ps.length
            ? ps.reduce((s, pid) => s + orderIndex.get(pid)!, 0) / ps.length
            : Number.MAX_SAFE_INTEGER;
          const akey = Math.min(...members.map(m => birthVal.get(m)!));
          return { members: [...members].sort(byAge), pkey, akey };
        })
        .sort((a, b) => (a.pkey - b.pkey) || (a.akey - b.akey));
      ids = withSpousesAdjacent(ordered.flatMap(g => g.members));
    }
    genRows.set(g, ids);
    ids.forEach((id, i) => orderIndex.set(id, i));
  });

  // ── Pass 2 (bottom-up): center each parent over its children, keep row order ──
  const SPAN = NODE_W + NODE_GAP;
  const xMap = new Map<string, number>();
  for (let gi = gens.length - 1; gi >= 0; gi--) {
    const ids = genRows.get(gens[gi])!;
    let cursor = -Infinity;
    for (const id of ids) {
      const kids = [...(childrenOf.get(id) ?? [])].filter(c => xMap.has(c));
      const desired = kids.length
        ? kids.reduce((s, c) => s + xMap.get(c)!, 0) / kids.length
        : (cursor === -Infinity ? 0 : cursor + SPAN);
      const x = cursor === -Infinity ? desired : Math.max(desired, cursor + SPAN);
      xMap.set(id, x);
      cursor = x;
    }
  }

  // Normalise so the leftmost node sits at x = 0
  const shift = -Math.min(...xMap.values());
  const nodes: TreeNode[] = people.map(p => {
    const autoX = (xMap.get(p.id) ?? 0) + shift;
    const autoY = ((genMap.get(p.id) ?? 0) - minGen) * (NODE_H + GEN_GAP);
    // A person the admin has dragged keeps their saved spot; everyone else
    // follows the auto-layout above.
    return {
      person: p,
      generation: genMap.get(p.id) ?? 0,
      x: p.pos_x != null ? p.pos_x : autoX,
      y: p.pos_y != null ? p.pos_y : autoY,
    };
  });

  const width = Math.max(...nodes.map(n => n.x)) + NODE_W;
  const height = Math.max(...nodes.map(n => n.y)) + NODE_H;
  return { nodes, width, height };
}

// ── Nuclear families ──────────────────────────────────────────────────────────
// A nuclear family = a set of parents who share one or more children, plus those
// children. Each unique parent-set forms one group (single-parent sets included).

export interface FamilyGroup {
  id: string;
  parentIds: string[];
  childIds: string[];
  memberIds: string[];
  hue: number;
}

export function computeFamilies(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): FamilyGroup[] {
  const ids = new Set(people.map(p => p.id));
  // child → set of parents
  const parentsOf = new Map<string, Set<string>>();
  const addParent = (child: string, parent: string) => {
    if (!ids.has(child) || !ids.has(parent)) return;
    if (!parentsOf.has(child)) parentsOf.set(child, new Set());
    parentsOf.get(child)!.add(parent);
  };
  for (const r of rels) {
    if (r.relationship_type === 'parent') addParent(r.person_b_id, r.person_a_id);
    else if (r.relationship_type === 'child') addParent(r.person_a_id, r.person_b_id);
  }

  // group children by identical parent-set
  const groups = new Map<string, { parents: string[]; children: string[] }>();
  for (const [child, parents] of parentsOf) {
    const parentIds = [...parents].sort();
    const key = parentIds.join('|');
    if (!groups.has(key)) groups.set(key, { parents: parentIds, children: [] });
    groups.get(key)!.children.push(child);
  }

  let i = 0;
  const total = groups.size || 1;
  return [...groups.entries()].map(([key, g]) => ({
    id: key,
    parentIds: g.parents,
    childIds: g.children,
    memberIds: [...g.parents, ...g.children],
    hue: Math.round((360 / total) * i++),
  }));
}

export const GENERATION_LABELS: Record<number, string> = {
  '-4': 'Great-great-grandparents',
  '-3': 'Great-grandparents',
  '-2': 'Grandparents',
  '-1': 'Parents',
  '0': 'Your Generation',
  '1': 'Children',
  '2': 'Grandchildren',
  '3': 'Great-grandchildren',
  '4': 'Great-great-grandchildren',
};

export function generationLabel(gen: number): string {
  return GENERATION_LABELS[gen] ?? (gen < 0 ? `${Math.abs(gen)}× Ancestors` : `${gen}× Descendants`);
}

// ISO country code → country name map (common subset)
export const COUNTRY_NAMES: Record<string, string> = {
  ZA: 'South Africa', BW: 'Botswana', ZW: 'Zimbabwe', MZ: 'Mozambique',
  NA: 'Namibia', ZM: 'Zambia', GB: 'United Kingdom', US: 'United States',
  AU: 'Australia', NZ: 'New Zealand', CA: 'Canada', DE: 'Germany',
  FR: 'France', NL: 'Netherlands', BE: 'Belgium', PT: 'Portugal',
  ES: 'Spain', IT: 'Italy', IE: 'Ireland', IN: 'India', CN: 'China',
  JP: 'Japan', BR: 'Brazil', AR: 'Argentina', NG: 'Nigeria', KE: 'Kenya',
  GH: 'Ghana', ET: 'Ethiopia', EG: 'Egypt', MA: 'Morocco',
  AE: 'UAE', SA: 'Saudi Arabia', SG: 'Singapore', MY: 'Malaysia',
  DK: 'Denmark', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  CH: 'Switzerland', AT: 'Austria', PL: 'Poland', GR: 'Greece',
};

export function flagUrl(code: string): string {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}
