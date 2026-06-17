import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { readStore, type Student } from "@/lib/store";

/** Hache un mot de passe avec un sel aléatoire. Format stocké: "salt:hash". */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return ref.length === test.length && timingSafeEqual(ref, test);
}

export function genToken(): string {
  return randomBytes(32).toString("hex");
}

/** Version publique d'un étudiant (sans le hash du mot de passe). */
export type PublicStudent = Omit<Student, "passwordHash">;

export function toPublic(s: Student): PublicStudent {
  const { passwordHash: _omit, ...pub } = s;
  void _omit;
  return pub;
}

/** Récupère l'étudiant lié au token fourni dans le header x-student-token. */
export async function getStudentFromRequest(
  req: Request
): Promise<PublicStudent | null> {
  const token = req.headers.get("x-student-token");
  if (!token) return null;
  const data = await readStore();
  const studentId = data.sessions[token];
  if (!studentId) return null;
  const student = data.students[studentId];
  return student ? toPublic(student) : null;
}
