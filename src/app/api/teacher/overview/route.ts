import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  ClassRoom,
  User,
  SoloClaim,
  Group,
  Assignment,
  Submission,
  Interrogation,
  InterroSubmission,
  CourseSession,
  Course,
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get("classId") ?? "";
  if (!classId) {
    return NextResponse.json({ error: "classId requis." }, { status: 400 });
  }

  try {
    await connectDB();
    const classroom = await ClassRoom.findOne({ _id: classId, teacherId: me.id }).lean();
    if (!classroom) {
      return NextResponse.json({ error: "Promo introuvable." }, { status: 404 });
    }

    const [students, claims, groups, assignments, interrogations, sessions, courses] =
      await Promise.all([
        User.find({ classId, role: "student" }).sort({ createdAt: 1 }).lean(),
        SoloClaim.find({ classId }).lean(),
        Group.find({ classId }).sort({ createdAt: 1 }).lean(),
        Assignment.find({ classId }).sort({ createdAt: -1 }).lean(),
        Interrogation.find({ classId }).sort({ createdAt: -1 }).lean(),
        CourseSession.find({ classId }).sort({ date: 1 }).lean(),
        Course.find({ classId }).select("-fileData").sort({ createdAt: -1 }).lean(),
      ]);

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean();
    const subCount: Record<string, number> = {};
    for (const s of submissions) {
      const k = s.assignmentId.toString();
      subCount[k] = (subCount[k] ?? 0) + 1;
    }

    const interroIds = interrogations.map((i) => i._id);
    const interroSubs = await InterroSubmission.find({
      interroId: { $in: interroIds },
      submittedAt: { $ne: null },
    }).lean();
    const interroSubCount: Record<string, number> = {};
    for (const s of interroSubs) {
      const k = s.interroId.toString();
      interroSubCount[k] = (interroSubCount[k] ?? 0) + 1;
    }

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

    return NextResponse.json({
      ok: true,
      classInfo: {
        id: classroom._id.toString(),
        name: classroom.name,
        description: classroom.description,
        school: classroom.school,
        logo: classroom.logo,
        accessCode: classroom.accessCode,
        createdAt: (classroom.createdAt as Date)?.getTime?.() ?? Date.now(),
      },
      students: students.map((s) => ({
        id: s._id.toString(),
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        createdAt: (s.createdAt as Date)?.getTime?.() ?? Date.now(),
      })),
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
        kind: a.kind ?? "code",
        dueDate: a.dueDate ?? null,
        isOpen: a.isOpen,
        submissionCount: subCount[a._id.toString()] ?? 0,
        createdAt: (a.createdAt as Date)?.getTime?.() ?? Date.now(),
      })),
      interrogations: interrogations.map((i) => ({
        id: i._id.toString(),
        title: i.title,
        instructions: i.instructions,
        kind: i.kind ?? "code",
        durationMinutes: i.durationMinutes,
        status: i.status,
        startedAt: i.startedAt ?? null,
        endsAt: i.endsAt ?? null,
        submissionCount: interroSubCount[i._id.toString()] ?? 0,
        createdAt: (i.createdAt as Date)?.getTime?.() ?? Date.now(),
      })),
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        date: s.date,
        title: s.title,
        description: s.description,
      })),
      courses: courses.map((c) => ({
        id: c._id.toString(),
        sessionId: c.sessionId ? c.sessionId.toString() : null,
        title: c.title,
        kind: c.kind,
        summary: c.summary,
        fileName: c.fileName,
        url: c.url,
        hasFile: Boolean(c.fileName),
        createdAt: (c.createdAt as Date)?.getTime?.() ?? Date.now(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
