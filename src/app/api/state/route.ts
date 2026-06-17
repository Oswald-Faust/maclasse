import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { SoloClaim, Group, Assignment, Setting, ClassRoom } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const EMPTY = { soloClaims: {}, groups: [], assignments: [], uiSettings: { boardTickerItems: [] } };

export async function GET(req: NextRequest) {
  try {
    const me = await getStudentFromRequest(req);
    if (!me) {
      return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
    }

    await connectDB();

    // L'étudiant voit sa promo ; l'enseignant peut viser une promo qu'il possède.
    let classId: string | null = me.classId;
    if (me.role === "teacher") {
      const q = req.nextUrl.searchParams.get("classId");
      if (q) {
        const owns = await ClassRoom.exists({ _id: q, teacherId: me.id });
        classId = owns ? q : null;
      }
    }
    if (!classId) {
      return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
    }

    const [claims, groups, assignments, setting] = await Promise.all([
      SoloClaim.find({ classId }).lean(),
      Group.find({ classId }).sort({ createdAt: 1 }).lean(),
      Assignment.find({ classId }).sort({ createdAt: -1 }).lean(),
      Setting.findOne({ classId }).lean(),
    ]);

    const soloClaims: Record<
      string,
      { projectId: string; firstName: string; lastName: string; claimedAt: number }
    > = {};
    for (const c of claims) {
      soloClaims[c.projectId] = {
        projectId: c.projectId,
        firstName: c.firstName,
        lastName: c.lastName,
        claimedAt: (c.createdAt as Date)?.getTime?.() ?? Date.now(),
      };
    }

    return NextResponse.json(
      {
        soloClaims,
        groups: groups.map((g) => ({
          id: g._id.toString(),
          name: g.name,
          members: g.members.map((m) => ({ firstName: m.firstName, lastName: m.lastName })),
          projectId: g.projectId ?? null,
          createdAt: (g.createdAt as Date)?.getTime?.() ?? Date.now(),
        })),
        assignments: assignments.map((a) => ({
          id: a._id.toString(),
          title: a.title,
          description: a.description,
          expectedFormat: a.expectedFormat,
          isOpen: a.isOpen,
          createdAt: (a.createdAt as Date)?.getTime?.() ?? Date.now(),
          updatedAt: (a.updatedAt as Date)?.getTime?.() ?? Date.now(),
        })),
        uiSettings: { boardTickerItems: setting?.boardTickerItems ?? [] },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }
}
