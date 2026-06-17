import { NextRequest, NextResponse } from "next/server";
import {
  mutate,
  isValidGroupProject,
  groupProjectTakenCount,
  groupProjectCapacity,
  type Group,
} from "@/lib/store";

type ClaimResult =
  | { code: "NO_GROUP" }
  | { code: "ALREADY_CHOSEN"; group: Group }
  | { code: "TAKEN" }
  | { code: "OK"; group: Group };

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    const result = await mutate<ClaimResult>(async (data) => {
      const group = data.groups.find((g) => g.id === groupId);
      if (!group) {
        return { data, result: { code: "NO_GROUP" } };
      }
      if (group.projectId) {
        return { data, result: { code: "ALREADY_CHOSEN", group } };
      }
      const taken = groupProjectTakenCount(data, projectId);
      if (taken >= groupProjectCapacity(projectId)) {
        return { data, result: { code: "TAKEN" } };
      }
      group.projectId = projectId;
      return { data, result: { code: "OK", group } };
    });

    switch (result.code) {
      case "NO_GROUP":
        return NextResponse.json({ error: "Ce groupe n'existe pas." }, { status: 404 });
      case "ALREADY_CHOSEN":
        return NextResponse.json(
          { error: "Ton groupe a déjà choisi un projet.", group: result.group },
          { status: 409 }
        );
      case "TAKEN":
        return NextResponse.json(
          { error: "Trop tard ! Ce projet de groupe vient d'être pris." },
          { status: 409 }
        );
      default:
        return NextResponse.json({ ok: true, group: result.group });
    }
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
