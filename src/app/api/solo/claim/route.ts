import { NextRequest, NextResponse } from "next/server";
import { mutate, isValidSolo, type SoloClaim } from "@/lib/store";

type ClaimResult =
  | { ok: true; claim: SoloClaim }
  | { ok: false; claim: SoloClaim };

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { projectId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const projectId = (body.projectId ?? "").trim();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();

  if (!projectId || !isValidSolo(projectId)) {
    return NextResponse.json({ error: "Projet inconnu." }, { status: 400 });
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return NextResponse.json(
      { error: "Indique ton prénom et ton nom (2 caractères minimum)." },
      { status: 400 }
    );
  }

  try {
    const result = await mutate<ClaimResult>(async (data) => {
      // Premier arrivé, premier servi : si déjà pris -> refus.
      const existing = data.soloClaims[projectId];
      if (existing) {
        return { data, result: { ok: false, claim: existing } };
      }
      const claim = { projectId, firstName, lastName, claimedAt: Date.now() };
      data.soloClaims[projectId] = claim;
      return { data, result: { ok: true, claim } };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Trop tard ! Ce projet vient d'être pris par ${result.claim.firstName} ${result.claim.lastName}.`,
          claim: result.claim,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, claim: result.claim });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
