import { NextRequest, NextResponse } from "next/server";
import { mutate, type Student } from "@/lib/store";
import {
  getStudentFromRequest,
  hashPassword,
  verifyPassword,
  toPublic,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const current = await getStudentFromRequest(req);
  if (!current) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const wantsPassword = Boolean(body.newPassword);

  if (firstName.length < 2 || lastName.length < 2) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (wantsPassword && (body.newPassword ?? "").length < 6) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit faire au moins 6 caractères." },
      { status: 400 }
    );
  }

  try {
    const result = await mutate<
      { code: "OK"; student: Student } | { code: "EMAIL_TAKEN" } | { code: "BAD_PASSWORD" }
    >(async (data) => {
      const student = data.students[current.id];
      if (!student) return { data, result: { code: "BAD_PASSWORD" } };

      // E-mail déjà utilisé par un AUTRE compte ?
      const emailClash = Object.values(data.students).some(
        (s) => s.id !== student.id && s.email === email
      );
      if (emailClash) return { data, result: { code: "EMAIL_TAKEN" } };

      // Changement de mot de passe : vérifier l'actuel.
      if (wantsPassword) {
        if (!verifyPassword(body.currentPassword ?? "", student.passwordHash)) {
          return { data, result: { code: "BAD_PASSWORD" } };
        }
        student.passwordHash = hashPassword(body.newPassword as string);
      }

      student.firstName = firstName;
      student.lastName = lastName;
      student.email = email;
      return { data, result: { code: "OK", student } };
    });

    if (result.code === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Cet e-mail est déjà utilisé par un autre compte." },
        { status: 409 }
      );
    }
    if (result.code === "BAD_PASSWORD") {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect." },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: true, student: toPublic(result.student) });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
