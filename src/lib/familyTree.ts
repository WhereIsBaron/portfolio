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

// BFS from root; returns generation number for each person (root = 0)
export function computeGenerations(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): Map<string, number> {
  const root = people.find(p => p.is_root);
  if (!root) return new Map();

  const adj = buildAdjacency(rels);
  const gen = new Map<string, number>();
  const queue: string[] = [root.id];
  gen.set(root.id, 0);

  while (queue.length) {
    const cur = queue.shift()!;
    const curGen = gen.get(cur)!;
    for (const { id, type } of adj.get(cur) ?? []) {
      if (gen.has(id)) continue;
      let nextGen = curGen;
      if (type === 'parent') nextGen = curGen - 1;
      else if (type === 'child') nextGen = curGen + 1;
      // spouse / sibling stay in same generation
      gen.set(id, nextGen);
      queue.push(id);
    }
  }

  // any remaining unvisited people get gen 0 (no path from root yet)
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

const NODE_W = 160;
const NODE_H = 80;
const GEN_GAP = 130; // vertical gap between generations
const SIBLING_GAP = 20; // horizontal gap between nodes

export function buildLayout(
  people: FamilyPerson[],
  rels: FamilyRelationship[],
): { nodes: TreeNode[]; width: number; height: number } {
  if (people.length === 0) return { nodes: [], width: 0, height: 0 };

  const genMap = computeGenerations(people, rels);
  const minGen = Math.min(...genMap.values());
  const maxGen = Math.max(...genMap.values());

  // Group people by generation
  const byGen = new Map<number, FamilyPerson[]>();
  for (const p of people) {
    const g = genMap.get(p.id) ?? 0;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(p);
  }

  const nodes: TreeNode[] = [];
  let maxWidth = 0;

  for (const [gen, members] of byGen) {
    const rowWidth = members.length * NODE_W + (members.length - 1) * SIBLING_GAP;
    if (rowWidth > maxWidth) maxWidth = rowWidth;
    const rowY = (gen - minGen) * (NODE_H + GEN_GAP);
    members.forEach((p, i) => {
      nodes.push({
        person: p,
        generation: gen,
        x: i * (NODE_W + SIBLING_GAP),
        y: rowY,
      });
    });
  }

  // Center each row around maxWidth
  for (const node of nodes) {
    const rowMembers = byGen.get(node.generation)!;
    const rowWidth = rowMembers.length * NODE_W + (rowMembers.length - 1) * SIBLING_GAP;
    node.x += (maxWidth - rowWidth) / 2;
  }

  const height = (maxGen - minGen + 1) * (NODE_H + GEN_GAP);
  return { nodes, width: maxWidth, height };
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
