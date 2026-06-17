import { NextRequest, NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/auth-server";
import { genId, mutate, readStore, type AssignmentSubmission, type NoteSnippet } from "@/lib/store";

export const dynamic = "force-dynamic";

type Body =
  | { action: "createNote" }
  | {
      action: "saveNote";
      noteId: string;
      title: string;
      content: string;
      snippets: NoteSnippet[];
    }
  | { action: "deleteNote"; noteId: string }
  | {
      action: "submitAssignment";
      assignmentId: string;
      title: string;
      content: string;
      language: string;
    };

export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const data = await readStore();
  const notes = data.notes[student.id] ?? [];
  const submissions = data.submissions.filter((item) => item.studentId === student.id);

  return NextResponse.json(
    {
      notes,
      assignments: data.assignments,
      submissions,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
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
    const result = await mutate<Record<string, unknown>>(async (data) => {
      const notes = data.notes[student.id] ?? [];

      switch (body.action) {
        case "createNote": {
          const note = {
            id: genId("note"),
            studentId: student.id,
            title: "Nouvelle note",
            content: "",
            snippets: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          data.notes[student.id] = [note, ...notes];
          return { data, result: { note } };
        }
        case "saveNote": {
          const note = notes.find((item) => item.id === body.noteId);
          if (!note) {
            throw new Error("Note introuvable.");
          }
          note.title = body.title.trim() || "Sans titre";
          note.content = body.content;
          note.snippets = sanitizeSnippets(body.snippets);
          note.updatedAt = Date.now();
          data.notes[student.id] = notes;
          return { data, result: { note } };
        }
        case "deleteNote":
          data.notes[student.id] = notes.filter((item) => item.id !== body.noteId);
          return { data, result: { ok: true } };
        case "submitAssignment": {
          const assignment = data.assignments.find(
            (item) => item.id === body.assignmentId && item.isOpen
          );
          if (!assignment) {
            throw new Error("Devoir indisponible.");
          }

          const existing = data.submissions.find(
            (item) => item.assignmentId === body.assignmentId && item.studentId === student.id
          );

          const payload: AssignmentSubmission = existing ?? {
            id: genId("sub"),
            assignmentId: body.assignmentId,
            studentId: student.id,
            title: "",
            content: "",
            language: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          payload.title = body.title.trim() || assignment.title;
          payload.content = body.content;
          payload.language = body.language.trim() || "text";
          payload.updatedAt = Date.now();

          if (!existing) {
            data.submissions.unshift(payload);
          }

          return { data, result: { submission: payload } };
        }
      }
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 400 }
    );
  }
}

function sanitizeSnippets(snippets: NoteSnippet[]) {
  return (snippets ?? []).slice(0, 12).map((item) => ({
    id: item.id || genId("snippet"),
    label: item.label?.trim() || "Snippet",
    language: item.language?.trim() || "txt",
    code: item.code ?? "",
  }));
}
