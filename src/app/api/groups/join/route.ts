import { NextRequest, NextResponse } from "next/server";
import { mutate, type Group } from "@/lib/store";

export const dynamic = "force-dynamic";

type JoinResult =
  | { code: "NO_GROUP" }
  | { code: "DUPLICATE" }
  | { code: "OK"; group: Group };

export async function POST(req: NextRequest) {
  let body: { groupId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const groupId = (body.groupId ?? "").trim();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();

  if (!groupId) {
    return NextResponse.json({ error: "Groupe inconnu." }, { status: 400 });
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return NextResponse.json(
      { error: "Indique ton prénom et ton nom (2 caractères minimum)." },
      { status: 400 }
    );
  }

  try {
    const result = await mutate<JoinResult>(async (data) => {
      const group = data.groups.find((g) => g.id === groupId);
      if (!group) {
        return { data, result: { code: "NO_GROUP" } };
      }
      const already = group.members.some(
        (m) =>
          m.firstName.toLowerCase() === firstName.toLowerCase() &&
          m.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (already) {
        return { data, result: { code: "DUPLICATE" } };
      }
      group.members.push({ firstName, lastName });
      return { data, result: { code: "OK", group } };
    });

    switch (result.code) {
      case "NO_GROUP":
        return NextResponse.json({ error: "Ce groupe n'existe plus." }, { status: 404 });
      case "DUPLICATE":
        return NextResponse.json(
          { error: "Tu fais déjà partie de ce groupe." },
          { status: 409 }
        );
      default:
        return NextResponse.json({ ok: true, group: result.group });
    }
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
