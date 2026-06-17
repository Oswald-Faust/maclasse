import { NextRequest, NextResponse } from "next/server";
import { mutate, type Student } from "@/lib/store";
import { verifyPassword, genToken, toPublic } from "@/lib/auth-server";

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
    const result = await mutate<{ student: Student; token: string } | null>(
      async (data) => {
        const student = Object.values(data.students).find((s) => s.email === email);
        if (!student || !verifyPassword(password, student.passwordHash)) {
          return { data, result: null };
        }
        const token = genToken();
        data.sessions[token] = student.id;
        return { data, result: { student, token } };
      }
    );

    if (!result) {
      return NextResponse.json(
        { error: "E-mail ou mot de passe incorrect." },
        { status: 401 }
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
