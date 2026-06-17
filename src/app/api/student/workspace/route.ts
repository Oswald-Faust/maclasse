import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import {
  Note,
  Assignment,
  Submission,
  Interrogation,
  InterroSubmission,
  CourseSession,
  Course,
  type NoteDoc,
} from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Snippet = { id: string; label: string; language: string; code: string };

type Body =
  | { action: "createNote" }
  | { action: "saveNote"; noteId: string; title: string; content: string; snippets: Snippet[] }
  | { action: "deleteNote"; noteId: string }
  | { action: "submitAssignment"; assignmentId: string; title: string; content: string; language: string }
  | { action: "submitInterro"; interroId: string; content: string; language: string; final: boolean };

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
  const [notes, assignments, submissions, interrogations, interroSubs] = await Promise.all([
    Note.find({ userId: student.id }).sort({ updatedAt: -1 }).lean<NoteDoc[]>(),
    student.classId
      ? Assignment.find({ classId: student.classId }).sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
    Submission.find({ userId: student.id }).lean(),
    student.classId
      ? Interrogation.find({ classId: student.classId, status: { $in: ["running", "ended"] } })
          .sort({ startedAt: -1 })
          .lean()
      : Promise.resolve([]),
    InterroSubmission.find({ userId: student.id }).lean(),
  ]);

  const [sessions, courses] = await Promise.all([
    student.classId
      ? CourseSession.find({ classId: student.classId }).sort({ date: 1 }).lean()
      : Promise.resolve([]),
    student.classId
      ? Course.find({ classId: student.classId }).select("-fileData").sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      notes: notes.map(noteOut),
      assignments: assignments.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        description: a.description,
        expectedFormat: a.expectedFormat,
        kind: a.kind ?? "code",
        dueDate: a.dueDate ?? null,
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
      interrogations: interrogations.map((i) => ({
        id: i._id.toString(),
        title: i.title,
        instructions: i.instructions,
        kind: i.kind ?? "code",
        durationMinutes: i.durationMinutes,
        status: i.status,
        startedAt: i.startedAt ?? null,
        endsAt: i.endsAt ?? null,
      })),
      interroSubmissions: interroSubs.map((s) => ({
        id: s._id.toString(),
        interroId: s.interroId.toString(),
        content: s.content,
        language: s.language,
        submittedAt: s.submittedAt ?? null,
        updatedAt: (s.updatedAt as Date)?.getTime?.() ?? Date.now(),
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
        if (assignment.dueDate && Date.now() > assignment.dueDate) {
          return NextResponse.json(
            { error: "La date limite de ce devoir est dépassée." },
            { status: 403 }
          );
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
      case "submitInterro": {
        const interro = await Interrogation.findOne({
          _id: body.interroId,
          ...(student.classId ? { classId: student.classId } : {}),
        });
        if (!interro || interro.status !== "running") {
          return NextResponse.json({ error: "Interrogation non disponible." }, { status: 400 });
        }
        // Le temps est écoulé : la classe ne peut plus soumettre.
        if (interro.endsAt && Date.now() > interro.endsAt) {
          return NextResponse.json(
            { error: "Temps écoulé : l'interrogation est terminée." },
            { status: 403 }
          );
        }
        const sub = await InterroSubmission.findOneAndUpdate(
          { interroId: body.interroId, userId: student.id },
          {
            $set: {
              firstName: student.firstName,
              lastName: student.lastName,
              content: body.content ?? "",
              language: (body.language ?? "text").trim() || "text",
              ...(body.final ? { submittedAt: Date.now() } : {}),
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return NextResponse.json({
          ok: true,
          interroSubmission: {
            id: sub._id.toString(),
            interroId: sub.interroId.toString(),
            content: sub.content,
            language: sub.language,
            submittedAt: sub.submittedAt ?? null,
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
