import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  Assignment,
  ClassRoom,
  Group,
  InterroSubmission,
  Interrogation,
  Note,
  SoloClaim,
  Submission,
  User,
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get("classId") ?? "";
  const studentId = req.nextUrl.searchParams.get("studentId") ?? "";
  if (!classId || !studentId) {
    return NextResponse.json({ error: "classId et studentId requis." }, { status: 400 });
  }

  try {
    await connectDB();

    const classroom = await ClassRoom.findOne({ _id: classId, teacherId: me.id }).lean();
    if (!classroom) {
      return NextResponse.json({ error: "Promo introuvable." }, { status: 404 });
    }

    const student = await User.findOne({ _id: studentId, classId, role: "student" }).lean();
    if (!student) {
      return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });
    }

    const [notes, assignments, submissions, interrogations, interroSubmissions, groups, soloClaims] =
      await Promise.all([
        Note.find({ userId: student._id }).sort({ updatedAt: -1 }).lean(),
        Assignment.find({ classId }).sort({ createdAt: -1 }).lean(),
        Submission.find({ userId: student._id }).lean(),
        Interrogation.find({ classId }).sort({ createdAt: -1 }).lean(),
        InterroSubmission.find({ userId: student._id }).lean(),
        Group.find({ classId }).lean(),
        SoloClaim.find({ classId }).lean(),
      ]);

    const group = groups.find((item) =>
      item.members.some(
        (member) =>
          member.firstName.trim().toLowerCase() === student.firstName.trim().toLowerCase() &&
          member.lastName.trim().toLowerCase() === student.lastName.trim().toLowerCase()
      )
    );

    const soloClaim = soloClaims.find((item) => item.userId?.toString() === student._id.toString());

    const submissionByAssignment = new Map(
      submissions.map((item) => [item.assignmentId.toString(), item])
    );
    const interroById = new Map(interrogations.map((item) => [item._id.toString(), item]));
    const interroSubmissionById = new Map(
      interroSubmissions.map((item) => [item.interroId.toString(), item])
    );

    return NextResponse.json({
      ok: true,
      student: {
        id: student._id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        createdAt: (student.createdAt as Date)?.getTime?.() ?? Date.now(),
      },
      stats: {
        notesCount: notes.length,
        snippetsCount: notes.reduce((sum, note) => sum + note.snippets.length, 0),
        assignmentsSubmitted: submissions.length,
        assignmentsOpen: assignments.filter((item) => item.isOpen).length,
        interrogationsSubmitted: interroSubmissions.filter((item) => item.submittedAt).length,
        interrogationsTotal: interrogations.length,
      },
      soloProjectId: soloClaim?.projectId ?? null,
      group: group
        ? {
            id: group._id.toString(),
            name: group.name,
            projectId: group.projectId ?? null,
            members: group.members,
          }
        : null,
      notes: notes.slice(0, 6).map((note) => ({
        id: note._id.toString(),
        title: note.title,
        updatedAt: (note.updatedAt as Date)?.getTime?.() ?? Date.now(),
        snippetsCount: note.snippets.length,
      })),
      assignments: assignments.map((assignment) => {
        const submission = submissionByAssignment.get(assignment._id.toString());
        return {
          id: assignment._id.toString(),
          title: assignment.title,
          dueDate: assignment.dueDate ?? null,
          isOpen: assignment.isOpen,
          submitted: Boolean(submission),
          updatedAt: submission ? (submission.updatedAt as Date)?.getTime?.() ?? Date.now() : null,
        };
      }),
      interrogations: interrogations.map((interro) => {
        const submission = interroSubmissionById.get(interro._id.toString());
        return {
          id: interro._id.toString(),
          title: interro.title,
          status: interro.status,
          submittedAt: submission?.submittedAt ?? null,
          updatedAt: submission ? (submission.updatedAt as Date)?.getTime?.() ?? Date.now() : null,
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
