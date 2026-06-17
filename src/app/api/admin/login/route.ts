import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSWORD } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if ((body.password ?? "") === ADMIN_PASSWORD) {
    // On renvoie la clé que le client renverra ensuite dans le header x-admin-key.
    return NextResponse.json({ ok: true, key: ADMIN_PASSWORD });
  }
  return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
}
