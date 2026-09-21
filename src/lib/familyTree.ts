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

type RelMap = Map<string, { id: string; type: 'parent' | 'child' | 'spouse' | 'sibling' }[]>;

function buildAdjacency(rels: FamilyRelationship[]): RelMap {
  const map: RelMap = new Map();
  const add = (a: string, b: string, type: FamilyRelationship['relationship_type']) => {
    if (!map.has(a)) map.set(a, []);
    map.get(a)!.push({ id: b, type });
  };
  for (const r of rels) {
    add(r.person_a_id, r.person_b_id, r.relationship_type);
    // mirror symmetric types
    if (r.relationship_type === 'spouse') add(r.person_b_id, r.person_a_id, 'spouse');
    else if (r.relationship_type === 'sibling') add(r.person_b_id, r.person_a_id, 'sibling');
    else if (r.relationship_type === 'parent') add(r.person_b_id, r.person_a_id, 'child');
    else if (r.relationship_type === 'child') add(r.person_b_id, r.person_a_id, 'parent');
  }
  return map;
}

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

// Returns a human-readable relationship label from root's perspective
export function getRelationshipLabel(
  targetId: string,
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): string {
  const root = people.find(p => p.is_root);
  if (!root) return '';
  if (targetId === root.id) return 'You';

  const adj = buildAdjacency(rels);
  // BFS path from root to target, tracking edge types
  const visited = new Map<string, { from: string; type: string }>();
  const queue: string[] = [root.id];
  visited.set(root.id, { from: '', type: '' });

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === targetId) break;
    for (const { id, type } of adj.get(cur) ?? []) {
      if (visited.has(id)) continue;
      visited.set(id, { from: cur, type });
      queue.push(id);
    }
  }

  if (!visited.has(targetId)) return 'Relative';

  // Reconstruct path as sequence of edge types
  const path: string[] = [];
  let cur = targetId;
  while (cur !== root.id) {
    const { from, type } = visited.get(cur)!;
    path.unshift(type);
    cur = from;
  }

  return pathToLabel(path);
}

function pathToLabel(path: string[]): string {
  if (path.length === 0) return 'You';
  if (path.length === 1) {
    if (path[0] === 'parent') return 'Parent';
    if (path[0] === 'child') return 'Child';
    if (path[0] === 'spouse') return 'Spouse';
    if (path[0] === 'sibling') return 'Sibling';
  }
  if (path.length === 2) {
    const [a, b] = path;
    if (a === 'parent' && b === 'parent') return 'Grandparent';
    if (a === 'parent' && b === 'sibling') return 'Aunt / Uncle';
    if (a === 'parent' && b === 'spouse') return 'Step-parent';
    if (a === 'child' && b === 'child') return 'Grandchild';
    if (a === 'child' && b === 'sibling') return 'Nephew / Niece';
    if (a === 'sibling' && b === 'child') return 'Nephew / Niece';
    if (a === 'sibling' && b === 'spouse') return 'Sibling-in-law';
    if (a === 'spouse' && b === 'sibling') return 'Brother / Sister-in-law';
    if (a === 'spouse' && b === 'parent') return 'Parent-in-law';
    if (a === 'spouse' && b === 'child') return 'Step-child';
  }
  if (path.length === 3) {
    const [a, b, c] = path;
    if (a === 'parent' && b === 'parent' && c === 'parent') return 'Great-grandparent';
    if (a === 'parent' && b === 'parent' && c === 'sibling') return 'Great-aunt / Great-uncle';
    if (a === 'parent' && b === 'sibling' && c === 'child') return '1st Cousin';
    if (a === 'child' && b === 'child' && c === 'child') return 'Great-grandchild';
    if (a === 'sibling' && b === 'child' && c === 'child') return 'Great-nephew / Niece';
  }
  if (path.length === 4) {
    const [a, b, c, d] = path;
    if (a === 'parent' && b === 'parent' && c === 'sibling' && d === 'child') return '1st Cousin once removed';
    if (a === 'parent' && b === 'sibling' && c === 'child' && d === 'child') return '1st Cousin once removed';
    if (a === 'parent' && b === 'parent' && c === 'parent' && d === 'sibling') return 'Great-great-aunt/uncle';
  }
  if (path.length === 5) {
    const p = path.join(',');
    if (p === 'parent,parent,sibling,child,child') return '2nd Cousin';
    if (p === 'parent,parent,parent,sibling,child') return '2nd Cousin once removed';
  }
  // Fallback: count generations
  const up = path.filter(x => x === 'parent').length;
  const down = path.filter(x => x === 'child').length;
  if (up > 0 && down === 0) return `${up}× Great-grandparent`;
  if (down > 0 && up === 0) return `${down}× Great-grandchild`;
  return 'Distant Relative';
}

// ── Tree layout ───────────────────────────────────────────────────────────────

export interface TreeNode {
  person: FamilyPerson;
  generation: number;
  x: number;
  y: number;
}

export const NODE_W = 160;
export const NODE_H = 80;
export const GEN_GAP = 140;
const NODE_GAP = 24; // horizontal gap between nodes in the same row

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
      // cluster under parents; break ties (same parents = siblings) by age, eldest → left
      const keyed = ids.map(id => {
        const ps = [...(parentsOf.get(id) ?? [])].filter(pid => orderIndex.has(pid));
        const key = ps.length
          ? ps.reduce((s, pid) => s + orderIndex.get(pid)!, 0) / ps.length
          : Number.MAX_SAFE_INTEGER;
        return { id, key };
      });
      keyed.sort((a, b) => (a.key - b.key) || byAge(a.id, b.id));
      ids = withSpousesAdjacent(keyed.map(k => k.id));
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
  const nodes: TreeNode[] = people.map(p => ({
    person: p,
    generation: genMap.get(p.id) ?? 0,
    x: (xMap.get(p.id) ?? 0) + shift,
    y: ((genMap.get(p.id) ?? 0) - minGen) * (NODE_H + GEN_GAP),
  }));

  const width = Math.max(...nodes.map(n => n.x)) + NODE_W;
  const height = (maxGen - minGen + 1) * (NODE_H + GEN_GAP);
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
};

export function flagUrl(code: string): string {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}
