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
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";
import { genUniqueAccessCode } from "@/lib/class-helpers";

export const dynamic = "force-dynamic";

type Action =
  | { action: "createAssignment"; classId: string; title: string; description: string; expectedFormat: string }
  | { action: "updateAssignment"; classId: string; assignmentId: string; title: string; description: string; expectedFormat: string; isOpen: boolean }
  | { action: "deleteAssignment"; classId: string; assignmentId: string }
  | { action: "releaseSolo"; classId: string; projectId: string }
  | { action: "deleteGroup"; classId: string; groupId: string }
  | { action: "resetGroupProject"; classId: string; groupId: string }
  | { action: "updateTicker"; classId: string; items: string[] }
  | { action: "removeStudent"; classId: string; studentId: string }
  | { action: "regenerateCode"; classId: string }
  | { action: "updateClass"; classId: string; name?: string; description?: string; school?: string; logo?: string }
  | { action: "deleteClass"; classId: string };

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
      case "deleteClass":
        await Promise.all([
          ClassRoom.deleteOne({ _id: classId }),
          User.updateMany({ classId, role: "student" }, { $set: { classId: null } }),
          SoloClaim.deleteMany({ classId }),
          Group.deleteMany({ classId }),
          Assignment.deleteMany({ classId }),
          Setting.deleteMany({ classId }),
        ]);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
