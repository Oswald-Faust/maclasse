import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Course, ClassRoom } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  try {
    await connectDB();
    const course = await Course.findById(id).lean();
    if (!course) {
      return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
    }

    // Accès : l'étudiant doit être dans la promo, ou l'enseignant la posséder.
    const classId = course.classId.toString();
    const allowed =
      (me.role === "student" && me.classId === classId) ||
      (me.role === "teacher" &&
        Boolean(await ClassRoom.exists({ _id: classId, teacherId: me.id })));
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      title: course.title,
      fileName: course.fileName,
      fileData: course.fileData,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
