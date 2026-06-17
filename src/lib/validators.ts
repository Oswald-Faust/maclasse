import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";

const VALID_SOLO = new Set(SOLO_PROJECTS.map((p) => p.id));
const GROUP_CAPACITY = new Map(GROUP_PROJECTS.map((p) => [p.id, p.capacity]));

export function isValidSolo(id: string): boolean {
  return VALID_SOLO.has(id);
}

export function isValidGroupProject(id: string): boolean {
  return GROUP_CAPACITY.has(id);
}

export function groupProjectCapacity(projectId: string): number {
  return GROUP_CAPACITY.get(projectId) ?? 1;
}
