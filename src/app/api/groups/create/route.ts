import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Group } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Member = { firstName: string; lastName: string };

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (!me.classId) {
    return NextResponse.json({ error: "Tu n'es rattaché à aucune promo." }, { status: 400 });
  }

  let body: { name?: string; members?: Member[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const members: Member[] = (Array.isArray(body.members) ? body.members : [])
    .map((m) => ({
      firstName: (m?.firstName ?? "").trim(),
      lastName: (m?.lastName ?? "").trim(),
    }))
    .filter((m) => m.firstName.length >= 2 && m.lastName.length >= 2);

  if (name.length < 2) {
    return NextResponse.json({ error: "Donne un nom à ton groupe." }, { status: 400 });
  }
  if (members.length < 1) {
    return NextResponse.json(
      { error: "Ajoute au moins un membre (prénom + nom)." },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const group = await Group.create({ classId: me.classId, name, members, projectId: null });
    return NextResponse.json({
      ok: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        members,
        projectId: null,
        createdAt: Date.now(),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("E11000")) {
      return NextResponse.json(
        { error: "Un groupe porte déjà ce nom dans ta promo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
