import { ClassRoom } from "@/lib/db/models";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I,O,0,1 ambigus

export function genAccessCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Génère un code d'accès unique (réessaie en cas de collision). */
export async function genUniqueAccessCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = genAccessCode();
    const exists = await ClassRoom.exists({ accessCode: code });
    if (!exists) return code;
  }
  // Fallback très improbable : code plus long.
  return genAccessCode(9);
}
