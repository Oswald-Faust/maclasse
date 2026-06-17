import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { SoloClaim } from "@/lib/db/models";
import { isValidSolo } from "@/lib/validators";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (!me.classId) {
    return NextResponse.json({ error: "Tu n'es rattaché à aucune promo." }, { status: 400 });
  }

  let body: { projectId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const projectId = (body.projectId ?? "").trim();
  const firstName = (body.firstName ?? "").trim() || me.firstName;
  const lastName = (body.lastName ?? "").trim() || me.lastName;

  if (!projectId || !isValidSolo(projectId)) {
    return NextResponse.json({ error: "Projet inconnu." }, { status: 400 });
  }

  try {
    await connectDB();

    // Premier arrivé premier servi garanti par l'index unique (classId, projectId).
    const claim = await SoloClaim.create({
      classId: me.classId,
      projectId,
      userId: me.id,
      firstName,
      lastName,
    });

    return NextResponse.json({
      ok: true,
      claim: {
        projectId: claim.projectId,
        firstName: claim.firstName,
        lastName: claim.lastName,
        claimedAt: Date.now(),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("E11000")) {
      const existing = await SoloClaim.findOne({ classId: me.classId, projectId }).lean();
      return NextResponse.json(
        {
          error: existing
            ? `Trop tard ! Ce projet vient d'être pris par ${existing.firstName} ${existing.lastName}.`
            : "Ce projet vient d'être pris.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
