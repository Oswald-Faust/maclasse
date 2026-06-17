"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { Assignment, WorkKind } from "@/lib/useStore";

export type NoteSnippet = {
  id: string;
  label: string;
  language: string;
  code: string;
};

export type StudentNote = {
  id: string;
  title: string;
  content: string;
  snippets: NoteSnippet[];
  createdAt: number;
  updatedAt: number;
};

export type Submission = {
  id: string;
  assignmentId: string;
  title: string;
  content: string;
  language: string;
  updatedAt: number;
};

export type Interrogation = {
  id: string;
  title: string;
  instructions: string;
  kind: WorkKind;
  durationMinutes: number;
  status: "draft" | "running" | "ended";
  startedAt: number | null;
  endsAt: number | null;
};

export type InterroSubmission = {
  id: string;
  interroId: string;
  content: string;
  language: string;
  submittedAt: number | null;
  updatedAt: number;
};

export type CourseKind = "pdf" | "resume" | "lien";

export type CourseSession = {
  id: string;
  date: number;
  title: string;
  description: string;
};

export type Course = {
  id: string;
  sessionId: string | null;
  title: string;
  kind: CourseKind;
  summary: string;
  fileName: string;
  url: string;
  hasFile: boolean;
  createdAt: number;
};

/**
 * Charge et gère l'espace de travail de l'étudiant (notes + devoirs).
 * Doit être utilisé à l'intérieur d'un ToastProvider.
 */
/** pollMs > 0 active le rafraîchissement périodique (utile pour le timer des interros). */
export function useWorkspace(pollMs = 0) {
  const toast = useToast();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [interrogations, setInterrogations] = useState<Interrogation[]>([]);
  const [interroSubmissions, setInterroSubmissions] = useState<InterroSubmission[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Submission>>({});
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/student/workspace", {
        headers: { "x-student-token": token },
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (!mounted.current) return;
      setNotes(json.notes ?? []);
      setAssignments(json.assignments ?? []);
      setSubmissions(json.submissions ?? []);
      setInterrogations(json.interrogations ?? []);
      setInterroSubmissions(json.interroSubmissions ?? []);
      setSessions(json.sessions ?? []);
      setCourses(json.courses ?? []);
      setActiveNoteId((current) => current ?? json.notes?.[0]?.id ?? null);
    } catch {
      /* on garde l'état courant */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const id = pollMs > 0 ? setInterval(refresh, pollMs) : null;
    return () => {
      mounted.current = false;
      if (id) clearInterval(id);
    };
  }, [refresh, pollMs]);

  useEffect(() => {
    setDrafts(() =>
      Object.fromEntries(
        assignments.map((assignment) => {
          const existing = submissions.find((item) => item.assignmentId === assignment.id);
          return [
            assignment.id,
            existing ?? {
              id: `draft_${assignment.id}`,
              assignmentId: assignment.id,
              title: assignment.title,
              content: "",
              language: "javascript",
              updatedAt: Date.now(),
            },
          ];
        })
      )
    );
  }, [assignments, submissions]);

  const action = useCallback(async (body: Record<string, unknown>) => {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("Non authentifié");
    const res = await fetch("/api/student/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-student-token": token },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erreur");
    return json;
  }, []);

  const createNote = useCallback(async () => {
    try {
      const json = await action({ action: "createNote" });
      setNotes((prev) => [json.note, ...prev]);
      setActiveNoteId(json.note.id);
      toast("Nouvelle note créée", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Création impossible", "error");
    }
  }, [action, toast]);

  const saveNote = useCallback(
    async (note: StudentNote) => {
      setSavingNote(true);
      try {
        const json = await action({
          action: "saveNote",
          noteId: note.id,
          title: note.title,
          content: note.content,
          snippets: note.snippets,
        });
        setNotes((prev) => prev.map((item) => (item.id === note.id ? json.note : item)));
        toast("Note enregistrée", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Sauvegarde impossible", "error");
      } finally {
        setSavingNote(false);
      }
    },
    [action, toast]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        await action({ action: "deleteNote", noteId });
        setNotes((prev) => {
          const remaining = prev.filter((item) => item.id !== noteId);
          setActiveNoteId((current) => (current === noteId ? remaining[0]?.id ?? null : current));
          return remaining;
        });
        toast("Note supprimée", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Suppression impossible", "error");
      }
    },
    [action, toast]
  );

  const submitAssignment = useCallback(
    async (assignmentId: string) => {
      const draft = drafts[assignmentId];
      if (!draft) return;
      setSubmittingId(assignmentId);
      try {
        const json = await action({
          action: "submitAssignment",
          assignmentId,
          title: draft.title,
          content: draft.content,
          language: draft.language,
        });
        setSubmissions((prev) => [
          json.submission,
          ...prev.filter((item) => item.assignmentId !== assignmentId),
        ]);
        toast("Devoir livré", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Envoi impossible", "error");
      } finally {
        setSubmittingId(null);
      }
    },
    [action, drafts, toast]
  );

  const submitInterro = useCallback(
    async (interroId: string, content: string, language: string, final: boolean) => {
      try {
        const json = await action({ action: "submitInterro", interroId, content, language, final });
        setInterroSubmissions((prev) => [
          json.interroSubmission,
          ...prev.filter((item) => item.interroId !== interroId),
        ]);
        if (final) toast("Interrogation rendue ✦", "success");
        return true;
      } catch (error) {
        toast(error instanceof Error ? error.message : "Envoi impossible", "error");
        return false;
      }
    },
    [action, toast]
  );

  return {
    notes,
    setNotes,
    assignments,
    submissions,
    interrogations,
    interroSubmissions,
    sessions,
    courses,
    activeNoteId,
    setActiveNoteId,
    drafts,
    setDrafts,
    loading,
    savingNote,
    submittingId,
    createNote,
    saveNote,
    deleteNote,
    submitAssignment,
    submitInterro,
    refresh,
  };
}
