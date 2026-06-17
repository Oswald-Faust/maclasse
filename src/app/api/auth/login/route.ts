import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User, type UserDoc } from "@/lib/db/models";
import { verifyPassword, signToken, toPublic } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  try {
    await connectDB();
    const user = await User.findOne({ email }).lean<UserDoc>();
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "E-mail ou mot de passe incorrect." },
        { status: 401 }
      );
    }
    const student = toPublic(user);
    return NextResponse.json({ ok: true, token: signToken(student.id), student });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
