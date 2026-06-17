import { NextRequest, NextResponse } from "next/server";
import { mutate, genId, type GroupMember } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { name?: string; members?: GroupMember[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const rawMembers = Array.isArray(body.members) ? body.members : [];

  const members: GroupMember[] = rawMembers
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
    const group = await mutate(async (data) => {
      const exists = data.groups.some(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        throw new Error("Un groupe porte déjà ce nom.");
      }
      const newGroup = {
        id: genId("grp"),
        name,
        members,
        projectId: null,
        createdAt: Date.now(),
      };
      data.groups.push(newGroup);
      return { data, result: newGroup };
    });
    return NextResponse.json({ ok: true, group });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
