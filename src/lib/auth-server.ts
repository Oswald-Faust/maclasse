import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db/connect";
import { User, type UserDoc } from "@/lib/db/models";

const JWT_SECRET = process.env.JWT_SECRET || "studeasy_dev_secret_change_me";

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

/** Signe un JWT de session (30 jours). */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Représentation publique d'un utilisateur (sans le hash). */
export type PublicStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "teacher";
  classId: string | null;
  createdAt: number;
};

export function toPublic(u: UserDoc): PublicStudent {
  return {
    id: u._id.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: (u.role as "student" | "teacher") ?? "student",
    classId: u.classId ? u.classId.toString() : null,
    createdAt: (u as unknown as { createdAt?: Date }).createdAt?.getTime?.() ?? Date.now(),
  };
}

/** Récupère l'utilisateur lié au JWT fourni dans le header x-student-token. */
export async function getStudentFromRequest(
  req: Request
): Promise<PublicStudent | null> {
  const token = req.headers.get("x-student-token");
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId).lean<UserDoc>();
  return user ? toPublic(user) : null;
}
