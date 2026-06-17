import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Group } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || !me.classId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { groupId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const groupId = (body.groupId ?? "").trim();
  const firstName = (body.firstName ?? "").trim() || me.firstName;
  const lastName = (body.lastName ?? "").trim() || me.lastName;

  if (!groupId) {
    return NextResponse.json({ error: "Groupe inconnu." }, { status: 400 });
  }

  try {
    await connectDB();
    const group = await Group.findOne({ _id: groupId, classId: me.classId });
    if (!group) {
      return NextResponse.json({ error: "Ce groupe n'existe plus." }, { status: 404 });
    }
    const already = group.members.some(
      (m) =>
        m.firstName.toLowerCase() === firstName.toLowerCase() &&
        m.lastName.toLowerCase() === lastName.toLowerCase()
    );
    if (already) {
      return NextResponse.json({ error: "Tu fais déjà partie de ce groupe." }, { status: 409 });
    }
    group.members.push({ firstName, lastName });
    await group.save();

    return NextResponse.json({
      ok: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        members: group.members.map((m) => ({ firstName: m.firstName, lastName: m.lastName })),
        projectId: group.projectId ?? null,
        createdAt: (group.get("createdAt") as Date)?.getTime?.() ?? Date.now(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
