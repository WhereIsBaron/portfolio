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

export interface FamilyRelationship {
  id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling';
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

// Find people who have no parents in the relationship list (natural tree tops)
function findNaturalRootIds(people: FamilyPerson[], rels: FamilyRelationship[]): string[] {
  const hasParent = new Set<string>();
  for (const r of rels) {
    if (r.relationship_type === 'parent') hasParent.add(r.person_b_id);
    if (r.relationship_type === 'child')  hasParent.add(r.person_a_id);
  }
  const topPeople = people.filter(p => !hasParent.has(p.id));
  // Prefer the marked root; otherwise all people with no parent
  return topPeople.length > 0 ? topPeople.map(p => p.id) : [people[0].id];
}

// BFS from root(s); returns generation number for each person (root = 0)
export function computeGenerations(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): Map<string, number> {
  if (people.length === 0) return new Map();

  const adj = buildAdjacency(rels);
  const gen = new Map<string, number>();

  // Prefer explicitly marked root; otherwise auto-detect top of tree
  const explicitRoot = people.find(p => p.is_root);
  const startIds = explicitRoot
    ? [explicitRoot.id]
    : findNaturalRootIds(people, rels);

  const queue: string[] = [];
  for (const id of startIds) {
    gen.set(id, 0);
    queue.push(id);
  }

  while (queue.length) {
    const cur = queue.shift()!;
    const curGen = gen.get(cur)!;
    for (const { id, type } of adj.get(cur) ?? []) {
      if (gen.has(id)) continue;
      let nextGen = curGen;
      // 'parent' edge means "I am the parent of the target" → target is a child → one row below
      // 'child'  edge means "I am a child of the target"   → target is a parent → one row above
      if (type === 'parent') nextGen = curGen + 1;
      else if (type === 'child') nextGen = curGen - 1;
      // spouse / sibling stay in same generation
      gen.set(id, nextGen);
      queue.push(id);
    }
  }

  // Any disconnected people land at generation 0
  for (const p of people) {
    if (!gen.has(p.id)) gen.set(p.id, 0);
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
      ids = withSpousesAdjacent(ids);
    } else {
      const keyed = ids.map(id => {
        const ps = [...(parentsOf.get(id) ?? [])].filter(pid => orderIndex.has(pid));
        const key = ps.length
          ? ps.reduce((s, pid) => s + orderIndex.get(pid)!, 0) / ps.length
          : Number.MAX_SAFE_INTEGER;
        return { id, key };
      });
      keyed.sort((a, b) => a.key - b.key);
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
