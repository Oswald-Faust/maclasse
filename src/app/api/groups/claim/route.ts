import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Group } from "@/lib/db/models";
import { isValidGroupProject } from "@/lib/validators";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || !me.classId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { groupId?: string; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const groupId = (body.groupId ?? "").trim();
  const projectId = (body.projectId ?? "").trim();

  if (!projectId || !isValidGroupProject(projectId)) {
    return NextResponse.json({ error: "Projet de groupe inconnu." }, { status: 400 });
  }
  if (!groupId) {
    return NextResponse.json({ error: "Groupe inconnu." }, { status: 400 });
  }

  try {
    await connectDB();
    const group = await Group.findOne({ _id: groupId, classId: me.classId });
    if (!group) {
      return NextResponse.json({ error: "Ce groupe n'existe pas." }, { status: 404 });
    }
    if (group.projectId) {
      return NextResponse.json({ error: "Ton groupe a déjà choisi un projet." }, { status: 409 });
    }

    group.projectId = projectId;
    try {
      await group.save();
    } catch (e) {
      if (e instanceof Error && e.message.includes("E11000")) {
        return NextResponse.json(
          { error: "Trop tard ! Ce projet de groupe vient d'être pris." },
          { status: 409 }
        );
      }
      throw e;
    }

    return NextResponse.json({
      ok: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        members: group.members.map((m) => ({ firstName: m.firstName, lastName: m.lastName })),
        projectId: group.projectId,
        createdAt: (group.get("createdAt") as Date)?.getTime?.() ?? Date.now(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
