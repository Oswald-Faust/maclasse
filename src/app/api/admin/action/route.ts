import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin";
import { connectDB } from "@/lib/db/connect";
import {
  User,
  ClassRoom,
  SoloClaim,
  Group,
  Assignment,
  Submission,
  Setting,
  Note,
} from "@/lib/db/models";

export const dynamic = "force-dynamic";

type Action =
  | { action: "deleteClass"; classId: string }
  | { action: "deleteUser"; userId: string }
  | { action: "resetAll" };

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    await connectDB();

    switch (body.action) {
      case "deleteClass":
        await Promise.all([
          ClassRoom.deleteOne({ _id: body.classId }),
          User.updateMany({ classId: body.classId, role: "student" }, { $set: { classId: null } }),
          SoloClaim.deleteMany({ classId: body.classId }),
          Group.deleteMany({ classId: body.classId }),
          Assignment.deleteMany({ classId: body.classId }),
          Setting.deleteMany({ classId: body.classId }),
        ]);
        break;
      case "deleteUser":
        await User.deleteOne({ _id: body.userId });
        break;
      case "resetAll":
        await Promise.all([
          User.deleteMany({}),
          ClassRoom.deleteMany({}),
          SoloClaim.deleteMany({}),
          Group.deleteMany({}),
          Assignment.deleteMany({}),
          Submission.deleteMany({}),
          Setting.deleteMany({}),
          Note.deleteMany({}),
        ]);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
