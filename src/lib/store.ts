import { promises as fs } from "fs";
import path from "path";
import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";

/**
 * Persistance simple par fichier JSON.
 * Toutes les écritures sont sérialisées via une file d'attente (writeQueue)
 * pour garantir le "premier arrivé, premier servi" sans race condition.
 */

export type SoloClaim = {
  projectId: string;
  firstName: string;
  lastName: string;
  claimedAt: number;
};

export type GroupMember = {
  firstName: string;
  lastName: string;
};

export type Group = {
  id: string;
  name: string;
  members: GroupMember[];
  projectId: string | null; // projet de groupe choisi
  createdAt: number;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string; // format: salt:hash
  createdAt: number;
};

export type NoteSnippet = {
  id: string;
  label: string;
  language: string;
  code: string;
};

export type StudentNote = {
  id: string;
  studentId: string;
  title: string;
  content: string;
  snippets: NoteSnippet[];
  createdAt: number;
  updatedAt: number;
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  expectedFormat: string;
  createdAt: number;
  updatedAt: number;
  isOpen: boolean;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  title: string;
  content: string;
  language: string;
  createdAt: number;
  updatedAt: number;
};

export type UiSettings = {
  boardTickerItems: string[];
};

export type StoreData = {
  soloClaims: Record<string, SoloClaim>; // clé = projectId
  groups: Group[];
  students: Record<string, Student>; // clé = id
  sessions: Record<string, string>; // clé = token -> studentId
  notes: Record<string, StudentNote[]>;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  uiSettings: UiSettings;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const DEFAULT_TICKER_ITEMS = [
  "Bienvenue sur StudEasy",
  "Choisis ton projet",
  "Organise tes notes",
  "Travaille tes devoirs",
];

const EMPTY: StoreData = {
  soloClaims: {},
  groups: [],
  students: {},
  sessions: {},
  notes: {},
  assignments: [],
  submissions: [],
  uiSettings: { boardTickerItems: DEFAULT_TICKER_ITEMS },
};

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY, null, 2), "utf8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      soloClaims: parsed.soloClaims ?? {},
      groups: parsed.groups ?? [],
      students: parsed.students ?? {},
      sessions: parsed.sessions ?? {},
      notes: parsed.notes ?? {},
      assignments: parsed.assignments ?? [],
      submissions: parsed.submissions ?? [],
      uiSettings: {
        boardTickerItems:
          parsed.uiSettings?.boardTickerItems?.filter((item) => typeof item === "string") ??
          DEFAULT_TICKER_ITEMS,
      },
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureFile();
  const tmp = STORE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

// File d'attente pour sérialiser les mutations (atomicité applicative).
let writeQueue: Promise<unknown> = Promise.resolve();

export function mutate<T>(fn: (data: StoreData) => Promise<{ data: StoreData; result: T }>): Promise<T> {
  const run = writeQueue.then(async () => {
    const data = await readStore();
    const { data: next, result } = await fn(data);
    await writeStore(next);
    return result;
  });
  // La file continue même en cas d'erreur de l'opération courante.
  writeQueue = run.catch(() => undefined);
  return run;
}

// --- Helpers métier ---

const VALID_SOLO = new Set(SOLO_PROJECTS.map((p) => p.id));
const GROUP_CAPACITY = new Map(GROUP_PROJECTS.map((p) => [p.id, p.capacity]));

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function isValidSolo(id: string): boolean {
  return VALID_SOLO.has(id);
}

export function groupProjectTakenCount(data: StoreData, projectId: string): number {
  return data.groups.filter((g) => g.projectId === projectId).length;
}

export function groupProjectCapacity(projectId: string): number {
  return GROUP_CAPACITY.get(projectId) ?? 1;
}

export function isValidGroupProject(id: string): boolean {
  return GROUP_CAPACITY.has(id);
}
