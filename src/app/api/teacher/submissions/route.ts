import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  ClassRoom,
  Assignment,
  Submission,
  Interrogation,
  InterroSubmission,
  User,
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }

  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  const interroId = req.nextUrl.searchParams.get("interroId");

  try {
    await connectDB();

    async function ownsClass(classId: unknown): Promise<boolean> {
      return Boolean(await ClassRoom.exists({ _id: classId as string, teacherId: me!.id }));
    }

    if (assignmentId) {
      const assignment = await Assignment.findById(assignmentId).lean();
      if (!assignment || !(await ownsClass(assignment.classId))) {
        return NextResponse.json({ error: "Devoir introuvable." }, { status: 404 });
      }
      const subs = await Submission.find({ assignmentId }).sort({ updatedAt: -1 }).lean();
      const userIds = subs.map((s) => s.userId);
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const map = new Map(users.map((u) => [u._id.toString(), u]));
      return NextResponse.json({
        ok: true,
        title: assignment.title,
        submissions: subs.map((s) => {
          const u = map.get(s.userId.toString());
          return {
            id: s._id.toString(),
            student: u ? `${u.firstName} ${u.lastName}` : "—",
            email: u?.email ?? "",
            title: s.title,
            content: s.content,
            language: s.language,
            updatedAt: (s.updatedAt as Date)?.getTime?.() ?? Date.now(),
          };
        }),
      });
    }

    if (interroId) {
      const interro = await Interrogation.findById(interroId).lean();
      if (!interro || !(await ownsClass(interro.classId))) {
        return NextResponse.json({ error: "Interrogation introuvable." }, { status: 404 });
      }
      const subs = await InterroSubmission.find({ interroId }).sort({ updatedAt: -1 }).lean();
      return NextResponse.json({
        ok: true,
        title: interro.title,
        submissions: subs.map((s) => ({
          id: s._id.toString(),
          student: `${s.firstName} ${s.lastName}`.trim() || "—",
          content: s.content,
          language: s.language,
          submittedAt: s.submittedAt ?? null,
          updatedAt: (s.updatedAt as Date)?.getTime?.() ?? Date.now(),
        })),
      });
    }

    return NextResponse.json({ error: "Paramètre requis." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
