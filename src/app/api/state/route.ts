import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readStore();
  // On n'expose JAMAIS les comptes ni les sessions au public.
  return NextResponse.json(
    {
      soloClaims: data.soloClaims,
      groups: data.groups,
      assignments: data.assignments,
      uiSettings: data.uiSettings,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
