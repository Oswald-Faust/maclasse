import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User, ClassRoom, type UserDoc } from "@/lib/db/models";
import { hashPassword, signToken, toPublic } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: string;
    accessCode?: string;
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
  const role = body.role === "teacher" ? "teacher" : "student";
  const accessCode = (body.accessCode ?? "").trim().toUpperCase();

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
    await connectDB();

    // Étudiant : un code promo valide est requis pour rejoindre une classe.
    let classId = null;
    if (role === "student") {
      if (!accessCode) {
        return NextResponse.json(
          { error: "Un code de promo est requis pour créer un compte étudiant." },
          { status: 400 }
        );
      }
      const classroom = await ClassRoom.findOne({ accessCode }).lean();
      if (!classroom) {
        return NextResponse.json(
          { error: "Code de promo invalide. Demande-le à ton enseignant." },
          { status: 404 }
        );
      }
      classId = classroom._id;
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 }
      );
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: hashPassword(password),
      role,
      classId,
    });

    const student = toPublic(user as unknown as UserDoc);
    return NextResponse.json({ ok: true, token: signToken(student.id), student });
  } catch (e) {
    if (e instanceof Error && e.message.includes("E11000")) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
