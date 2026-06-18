"use client";

import { motion } from "framer-motion";
import { fmtDateTime } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { useWorkspace, type StudentNote } from "@/lib/useWorkspace";

export function NotesWorkspace() {
  const {
    notes,
    setNotes,
    activeNoteId,
    setActiveNoteId,
    loading,
    savingNote,
    createNote,
    saveNote,
    deleteNote,
  } = useWorkspace();

  const activeNote = notes.find((item) => item.id === activeNoteId) ?? null;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace de travail · Notes
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4rem)] font-extrabold">
          Ton bloc-notes
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Rassemble tes idées, ta structure, ta logique et tes snippets de code. Tout est
          sauvegardé sur ton compte StudEasy.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
        <div className="card-paper h-fit rounded-[18px] p-5 shadow-hard lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="display-tight text-xl font-bold">Mes notes</h2>
            <button
              onClick={createNote}
              className="rounded-full border-[1.5px] border-ink bg-lime px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-ink hover:text-paper"
            >
              + Nouvelle
            </button>
          </div>

          <div className="space-y-2">
            {loading && notes.length === 0 && (
              <>
                <Skeleton className="h-20 w-full rounded-[16px]" />
                <Skeleton className="h-20 w-full rounded-[16px]" />
                <Skeleton className="h-20 w-full rounded-[16px]" />
              </>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`w-full rounded-[16px] border-[1.5px] px-4 py-3 text-left transition ${
                  activeNoteId === note.id
                    ? "border-ink bg-lime/70 shadow-hard-sm"
                    : "border-ink/15 bg-card hover:bg-paper2"
                }`}
              >
                <div className="truncate font-semibold">{note.title || "Sans titre"}</div>
                <div className="mt-1 line-clamp-2 text-xs text-ink-soft">
                  {note.content || "Aucun contenu pour le moment."}
                </div>
              </button>
            ))}
            {!loading && notes.length === 0 && (
              <div className="rounded-[16px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-4 py-8 text-center text-sm text-ink-faint">
                Aucune note. Crée la première.
              </div>
            )}
          </div>
        </div>

        <div className="card-paper rounded-[18px] p-5 shadow-hard">
          {loading && !activeNote ? (
            <div>
              <Skeleton className="mb-4 h-4 w-28" />
              <Skeleton className="mb-3 h-14 w-full rounded-[16px]" />
              <Skeleton className="h-56 w-full rounded-[18px]" />
            </div>
          ) : activeNote ? (
            <NoteEditor
              note={activeNote}
              saving={savingNote}
              onChange={(updater) =>
                setNotes((prev) =>
                  prev.map((item) => (item.id === activeNote.id ? updater(item) : item))
                )
              }
              onSave={() => saveNote(activeNote)}
              onDelete={() => deleteNote(activeNote.id)}
            />
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 text-center">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                  Notes
                </div>
                <h2 className="display-tight mt-2 text-2xl font-bold">Sélectionne une note</h2>
                <p className="mt-2 max-w-sm text-sm text-ink-soft">
                  Écris des détails, des idées, des checklists et stocke des snippets de code.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  note: StudentNote;
  saving: boolean;
  onChange: (updater: (note: StudentNote) => StudentNote) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            Note active
          </div>
          <p className="mt-1 text-xs text-ink-faint">Mis à jour {fmtDateTime(note.updatedAt)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
          <button
            onClick={onDelete}
            className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
          >
            Supprimer
          </button>
        </div>
      </div>

      <input
        value={note.title}
        onChange={(e) => onChange((current) => ({ ...current, title: e.target.value }))}
        placeholder="Titre de la note"
        className="mb-3 w-full rounded-[16px] border-[1.5px] border-ink bg-card px-4 py-3 text-lg font-semibold outline-none focus:shadow-hard-sm"
      />
      <textarea
        value={note.content}
        onChange={(e) => onChange((current) => ({ ...current, content: e.target.value }))}
        placeholder="Écris ici tes idées, détails, structure, pseudo-code, checklist..."
        className="min-h-[220px] w-full rounded-[18px] border-[1.5px] border-ink bg-card px-4 py-3 text-sm leading-relaxed outline-none focus:shadow-hard-sm"
      />

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">Snippets de code</h3>
          <button
            onClick={() =>
              onChange((current) => ({
                ...current,
                snippets: [
                  ...current.snippets,
                  {
                    id: `snippet_${Date.now()}`,
                    label: "Nouveau snippet",
                    language: "javascript",
                    code: "",
                  },
                ],
              }))
            }
            className="rounded-full border-[1.5px] border-ink bg-lime px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            + Ajouter un snippet
          </button>
        </div>

        <div className="space-y-3">
          {note.snippets.map((snippet) => (
            <div key={snippet.id} className="rounded-[18px] border-[1.5px] border-ink bg-card p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                <input
                  value={snippet.label}
                  onChange={(e) =>
                    onChange((current) => ({
                      ...current,
                      snippets: current.snippets.map((item) =>
                        item.id === snippet.id ? { ...item, label: e.target.value } : item
                      ),
                    }))
                  }
                  className="rounded-xl border-[1.5px] border-ink bg-paper2 px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
                />
                <input
                  value={snippet.language}
                  onChange={(e) =>
                    onChange((current) => ({
                      ...current,
                      snippets: current.snippets.map((item) =>
                        item.id === snippet.id ? { ...item, language: e.target.value } : item
                      ),
                    }))
                  }
                  className="rounded-xl border-[1.5px] border-ink bg-paper2 px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
                />
                <button
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      snippets: current.snippets.filter((item) => item.id !== snippet.id),
                    }))
                  }
                  className="rounded-full border-[1.5px] border-ink bg-card px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
                >
                  Supprimer
                </button>
              </div>
              <textarea
                value={snippet.code}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    snippets: current.snippets.map((item) =>
                      item.id === snippet.id ? { ...item, code: e.target.value } : item
                    ),
                  }))
                }
                placeholder="Colle ton code ici..."
                className="min-h-[160px] w-full rounded-[16px] border-[1.5px] border-ink bg-ink px-4 py-3 font-mono text-sm text-paper outline-none focus:shadow-hard-sm"
              />
            </div>
          ))}
          {note.snippets.length === 0 && (
            <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-4 py-8 text-center text-sm text-ink-faint">
              Aucun snippet dans cette note.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
