import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  ClassRoom,
  User,
  SoloClaim,
  Group,
  Assignment,
  Submission,
  Setting,
  Interrogation,
  InterroSubmission,
  CourseSession,
  Course,
  type WorkKind,
  type CourseKind,
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";
import { genUniqueAccessCode } from "@/lib/class-helpers";

export const dynamic = "force-dynamic";

type Action =
  | { action: "createAssignment"; classId: string; title: string; description: string; expectedFormat: string; kind: WorkKind; dueDate: number | null }
  | { action: "updateAssignment"; classId: string; assignmentId: string; title: string; description: string; expectedFormat: string; kind: WorkKind; dueDate: number | null; isOpen: boolean }
  | { action: "deleteAssignment"; classId: string; assignmentId: string }
  | { action: "createInterro"; classId: string; title: string; instructions: string; kind: WorkKind; durationMinutes: number }
  | { action: "updateInterro"; classId: string; interroId: string; title: string; instructions: string; kind: WorkKind; durationMinutes: number }
  | { action: "launchInterro"; classId: string; interroId: string }
  | { action: "endInterro"; classId: string; interroId: string }
  | { action: "deleteInterro"; classId: string; interroId: string }
  | { action: "releaseSolo"; classId: string; projectId: string }
  | { action: "deleteGroup"; classId: string; groupId: string }
  | { action: "resetGroupProject"; classId: string; groupId: string }
  | { action: "updateTicker"; classId: string; items: string[] }
  | { action: "createSession"; classId: string; date: number; title: string; description: string }
  | { action: "updateSession"; classId: string; sessionId: string; date: number; title: string; description: string }
  | { action: "deleteSession"; classId: string; sessionId: string }
  | { action: "createCourse"; classId: string; sessionId: string | null; title: string; kind: CourseKind; summary: string; fileData: string; fileName: string; url: string }
  | { action: "updateCourse"; classId: string; courseId: string; sessionId: string | null; title: string; kind: CourseKind; summary: string; fileData: string; fileName: string; url: string }
  | { action: "deleteCourse"; classId: string; courseId: string }
  | { action: "removeStudent"; classId: string; studentId: string }
  | { action: "regenerateCode"; classId: string }
  | { action: "updateClass"; classId: string; name?: string; description?: string; school?: string; logo?: string }
  | { action: "deleteClass"; classId: string };

function normKind(k: unknown): WorkKind {
  return k === "redaction" || k === "autre" ? k : "code";
}
function clampDuration(n: unknown): number {
  const v = Math.round(Number(n) || 30);
  return Math.min(600, Math.max(1, v));
}
function normCourseKind(k: unknown): CourseKind {
  return k === "pdf" || k === "lien" ? k : "resume";
}

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    await connectDB();

    // Vérifie que l'enseignant possède bien cette promo.
    const owns = await ClassRoom.findOne({ _id: body.classId, teacherId: me.id }).lean();
    if (!owns) {
      return NextResponse.json({ error: "Promo introuvable." }, { status: 404 });
    }
    const classId = body.classId;

    switch (body.action) {
      case "createAssignment":
        await Assignment.create({
          classId,
          title: body.title.trim(),
          description: body.description.trim(),
          expectedFormat: body.expectedFormat.trim(),
          kind: normKind(body.kind),
          dueDate: typeof body.dueDate === "number" ? body.dueDate : null,
          isOpen: true,
        });
        break;
      case "updateAssignment":
        await Assignment.updateOne(
          { _id: body.assignmentId, classId },
          {
            $set: {
              title: body.title.trim(),
              description: body.description.trim(),
              expectedFormat: body.expectedFormat.trim(),
              kind: normKind(body.kind),
              dueDate: typeof body.dueDate === "number" ? body.dueDate : null,
              isOpen: body.isOpen,
            },
          }
        );
        break;
      case "deleteAssignment":
        await Promise.all([
          Assignment.deleteOne({ _id: body.assignmentId, classId }),
          Submission.deleteMany({ assignmentId: body.assignmentId }),
        ]);
        break;
      case "createInterro":
        await Interrogation.create({
          classId,
          title: body.title.trim(),
          instructions: body.instructions.trim(),
          kind: normKind(body.kind),
          durationMinutes: clampDuration(body.durationMinutes),
          status: "draft",
        });
        break;
      case "updateInterro":
        await Interrogation.updateOne(
          { _id: body.interroId, classId, status: "draft" },
          {
            $set: {
              title: body.title.trim(),
              instructions: body.instructions.trim(),
              kind: normKind(body.kind),
              durationMinutes: clampDuration(body.durationMinutes),
            },
          }
        );
        break;
      case "launchInterro": {
        const interro = await Interrogation.findOne({ _id: body.interroId, classId });
        if (interro) {
          const startedAt = Date.now();
          interro.status = "running";
          interro.startedAt = startedAt;
          interro.endsAt = startedAt + interro.durationMinutes * 60_000;
          await interro.save();
        }
        break;
      }
      case "endInterro":
        await Interrogation.updateOne(
          { _id: body.interroId, classId },
          { $set: { status: "ended", endsAt: Date.now() } }
        );
        break;
      case "deleteInterro":
        await Promise.all([
          Interrogation.deleteOne({ _id: body.interroId, classId }),
          InterroSubmission.deleteMany({ interroId: body.interroId }),
        ]);
        break;
      case "createSession":
        await CourseSession.create({
          classId,
          date: Number(body.date) || Date.now(),
          title: body.title.trim() || "Séance",
          description: (body.description ?? "").trim(),
        });
        break;
      case "updateSession":
        await CourseSession.updateOne(
          { _id: body.sessionId, classId },
          {
            $set: {
              date: Number(body.date) || Date.now(),
              title: body.title.trim() || "Séance",
              description: (body.description ?? "").trim(),
            },
          }
        );
        break;
      case "deleteSession":
        await Promise.all([
          CourseSession.deleteOne({ _id: body.sessionId, classId }),
          // Les cours rattachés deviennent "non datés" plutôt que supprimés.
          Course.updateMany({ sessionId: body.sessionId, classId }, { $set: { sessionId: null } }),
        ]);
        break;
      case "createCourse":
        await Course.create({
          classId,
          sessionId: body.sessionId || null,
          title: body.title.trim() || "Cours",
          kind: normCourseKind(body.kind),
          summary: (body.summary ?? "").trim(),
          fileData: (body.fileData ?? "").slice(0, 6_000_000),
          fileName: (body.fileName ?? "").slice(0, 200),
          url: (body.url ?? "").trim(),
        });
        break;
      case "updateCourse":
        await Course.updateOne(
          { _id: body.courseId, classId },
          {
            $set: {
              sessionId: body.sessionId || null,
              title: body.title.trim() || "Cours",
              kind: normCourseKind(body.kind),
              summary: (body.summary ?? "").trim(),
              fileData: (body.fileData ?? "").slice(0, 6_000_000),
              fileName: (body.fileName ?? "").slice(0, 200),
              url: (body.url ?? "").trim(),
            },
          }
        );
        break;
      case "deleteCourse":
        await Course.deleteOne({ _id: body.courseId, classId });
        break;
      case "releaseSolo":
        await SoloClaim.deleteOne({ classId, projectId: body.projectId });
        break;
      case "deleteGroup":
        await Group.deleteOne({ _id: body.groupId, classId });
        break;
      case "resetGroupProject":
        await Group.updateOne({ _id: body.groupId, classId }, { $set: { projectId: null } });
        break;
      case "updateTicker": {
        const items = body.items.map((i) => i.trim()).filter(Boolean).slice(0, 12);
        await Setting.updateOne({ classId }, { $set: { boardTickerItems: items } }, { upsert: true });
        break;
      }
      case "removeStudent":
        await User.updateOne(
          { _id: body.studentId, classId, role: "student" },
          { $set: { classId: null } }
        );
        break;
      case "regenerateCode": {
        const code = await genUniqueAccessCode();
        await ClassRoom.updateOne({ _id: classId }, { $set: { accessCode: code } });
        return NextResponse.json({ ok: true, accessCode: code });
      }
      case "updateClass": {
        const set: Record<string, string> = {};
        if (typeof body.name === "string" && body.name.trim().length >= 2)
          set.name = body.name.trim();
        if (typeof body.description === "string") set.description = body.description.trim();
        if (typeof body.school === "string") set.school = body.school.trim();
        if (typeof body.logo === "string") set.logo = body.logo.slice(0, 600000);
        await ClassRoom.updateOne({ _id: classId }, { $set: set });
        break;
      }
      case "deleteClass": {
        const interros = await Interrogation.find({ classId }).select("_id").lean();
        await Promise.all([
          ClassRoom.deleteOne({ _id: classId }),
          User.updateMany({ classId, role: "student" }, { $set: { classId: null } }),
          SoloClaim.deleteMany({ classId }),
          Group.deleteMany({ classId }),
          Assignment.deleteMany({ classId }),
          Setting.deleteMany({ classId }),
          Interrogation.deleteMany({ classId }),
          InterroSubmission.deleteMany({ interroId: { $in: interros.map((i) => i._id) } }),
          CourseSession.deleteMany({ classId }),
          Course.deleteMany({ classId }),
        ]);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
