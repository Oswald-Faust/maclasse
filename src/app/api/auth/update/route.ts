import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User, type UserDoc } from "@/lib/db/models";
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
    await connectDB();

    const emailClash = await User.findOne({ email, _id: { $ne: current.id } }).lean();
    if (emailClash) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà utilisé par un autre compte." },
        { status: 409 }
      );
    }

    const user = await User.findById(current.id);
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    if (wantsPassword) {
      if (!verifyPassword(body.currentPassword ?? "", user.passwordHash)) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
      }
      user.passwordHash = hashPassword(body.newPassword as string);
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    await user.save();

    return NextResponse.json({ ok: true, student: toPublic(user as unknown as UserDoc) });
  } catch (e) {
    if (e instanceof Error && e.message.includes("E11000")) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà utilisé par un autre compte." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
