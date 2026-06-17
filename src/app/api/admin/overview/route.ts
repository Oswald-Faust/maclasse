import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin";
import { connectDB } from "@/lib/db/connect";
import { User, ClassRoom, Group, Assignment } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await connectDB();

    const [classes, totalStudents, totalTeachers] = await Promise.all([
      ClassRoom.find().sort({ createdAt: -1 }).lean(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
    ]);

    const teacherIds = classes.map((c) => c.teacherId);
    const teachers = await User.find({ _id: { $in: teacherIds } }).lean();
    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t]));

    const enriched = await Promise.all(
      classes.map(async (c) => {
        const [studentCount, groupCount, assignmentCount] = await Promise.all([
          User.countDocuments({ classId: c._id, role: "student" }),
          Group.countDocuments({ classId: c._id }),
          Assignment.countDocuments({ classId: c._id }),
        ]);
        const t = teacherMap.get(c.teacherId.toString());
        return {
          id: c._id.toString(),
          name: c.name,
          school: c.school,
          logo: c.logo,
          accessCode: c.accessCode,
          teacher: t ? `${t.firstName} ${t.lastName}` : "—",
          teacherEmail: t?.email ?? "—",
          studentCount,
          groupCount,
          assignmentCount,
          createdAt: (c.createdAt as Date)?.getTime?.() ?? Date.now(),
        };
      })
    );

    return NextResponse.json({
      ok: true,
      stats: {
        classes: classes.length,
        students: totalStudents,
        teachers: totalTeachers,
      },
      classes: enriched,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
