"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import type { Assignment } from "@/lib/useStore";

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

/**
 * Charge et gère l'espace de travail de l'étudiant (notes + devoirs).
 * Doit être utilisé à l'intérieur d'un ToastProvider.
 */
export function useWorkspace() {
  const toast = useToast();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Submission>>({});

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/student/workspace", {
      headers: { "x-student-token": token },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        setNotes(json.notes ?? []);
        setAssignments(json.assignments ?? []);
        setSubmissions(json.submissions ?? []);
        setActiveNoteId((current) => current ?? json.notes?.[0]?.id ?? null);
      })
      .catch(() => toast("Impossible de charger l'espace de travail.", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

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

  return {
    notes,
    setNotes,
    assignments,
    submissions,
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
  };
}
