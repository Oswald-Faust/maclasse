import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Note, Assignment, Submission, type NoteDoc } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Snippet = { id: string; label: string; language: string; code: string };

type Body =
  | { action: "createNote" }
  | { action: "saveNote"; noteId: string; title: string; content: string; snippets: Snippet[] }
  | { action: "deleteNote"; noteId: string }
  | { action: "submitAssignment"; assignmentId: string; title: string; content: string; language: string };

function noteOut(n: NoteDoc) {
  return {
    id: n._id.toString(),
    title: n.title,
    content: n.content,
    snippets: (n.snippets ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      language: s.language,
      code: s.code,
    })),
    createdAt: (n.createdAt as Date)?.getTime?.() ?? Date.now(),
    updatedAt: (n.updatedAt as Date)?.getTime?.() ?? Date.now(),
  };
}

export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await connectDB();
  const [notes, assignments, submissions] = await Promise.all([
    Note.find({ userId: student.id }).sort({ updatedAt: -1 }).lean<NoteDoc[]>(),
    student.classId
      ? Assignment.find({ classId: student.classId }).sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
    Submission.find({ userId: student.id }).lean(),
  ]);

  return NextResponse.json(
    {
      notes: notes.map(noteOut),
      assignments: assignments.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        description: a.description,
        expectedFormat: a.expectedFormat,
        isOpen: a.isOpen,
        createdAt: (a.createdAt as Date)?.getTime?.() ?? Date.now(),
        updatedAt: (a.updatedAt as Date)?.getTime?.() ?? Date.now(),
      })),
      submissions: submissions.map((s) => ({
        id: s._id.toString(),
        assignmentId: s.assignmentId.toString(),
        title: s.title,
        content: s.content,
        language: s.language,
        updatedAt: (s.updatedAt as Date)?.getTime?.() ?? Date.now(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function sanitizeSnippets(snippets: Snippet[]) {
  return (snippets ?? []).slice(0, 12).map((item) => ({
    id: item.id || `snip_${Math.random().toString(36).slice(2, 9)}`,
    label: item.label?.trim() || "Snippet",
    language: item.language?.trim() || "txt",
    code: item.code ?? "",
  }));
}

export async function POST(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    await connectDB();

    switch (body.action) {
      case "createNote": {
        const note = await Note.create({
          userId: student.id,
          title: "Nouvelle note",
          content: "",
          snippets: [],
        });
        return NextResponse.json({ ok: true, note: noteOut(note as unknown as NoteDoc) });
      }
      case "saveNote": {
        const note = await Note.findOne({ _id: body.noteId, userId: student.id });
        if (!note) {
          return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
        }
        note.title = body.title.trim() || "Sans titre";
        note.content = body.content ?? "";
        note.snippets = sanitizeSnippets(body.snippets);
        await note.save();
        return NextResponse.json({ ok: true, note: noteOut(note as unknown as NoteDoc) });
      }
      case "deleteNote": {
        await Note.deleteOne({ _id: body.noteId, userId: student.id });
        return NextResponse.json({ ok: true });
      }
      case "submitAssignment": {
        const assignment = await Assignment.findOne({
          _id: body.assignmentId,
          isOpen: true,
          ...(student.classId ? { classId: student.classId } : {}),
        });
        if (!assignment) {
          return NextResponse.json({ error: "Devoir indisponible." }, { status: 400 });
        }
        const submission = await Submission.findOneAndUpdate(
          { assignmentId: body.assignmentId, userId: student.id },
          {
            $set: {
              title: body.title.trim() || assignment.title,
              content: body.content ?? "",
              language: body.language.trim() || "text",
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return NextResponse.json({
          ok: true,
          submission: {
            id: submission._id.toString(),
            assignmentId: submission.assignmentId.toString(),
            title: submission.title,
            content: submission.content,
            language: submission.language,
            updatedAt: Date.now(),
          },
        });
      }
      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
