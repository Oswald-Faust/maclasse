import { NextRequest, NextResponse } from "next/server";
import { mutate, genId, type Student } from "@/lib/store";
import { hashPassword, genToken, toPublic } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (firstName.length < 2 || lastName.length < 2) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 6 caractères." },
      { status: 400 }
    );
  }

  try {
    const result = await mutate<{ student: Student; token: string } | null>(
      async (data) => {
        const exists = Object.values(data.students).some((s) => s.email === email);
        if (exists) {
          return { data, result: null };
        }
        const student: Student = {
          id: genId("std"),
          firstName,
          lastName,
          email,
          passwordHash: hashPassword(password),
          createdAt: Date.now(),
        };
        data.students[student.id] = student;
        const token = genToken();
        data.sessions[token] = student.id;
        return { data, result: { student, token } };
      }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      token: result.token,
      student: toPublic(result.student),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
