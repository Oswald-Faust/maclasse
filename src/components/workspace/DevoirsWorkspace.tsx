"use client";

import { motion } from "framer-motion";
import { fmtDateTime } from "@/lib/format";
import { useWorkspace, type Submission } from "@/lib/useWorkspace";
import type { Assignment } from "@/lib/useStore";

export function DevoirsWorkspace() {
  const { assignments, submissions, drafts, setDrafts, loading, submittingId, submitAssignment } =
    useWorkspace();

  const open = assignments.filter((assignment) => assignment.isOpen);
  const doneCount = open.filter((a) => submissions.some((s) => s.assignmentId === a.id)).length;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace de travail · Devoirs
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4rem)] font-extrabold">
          Tes devoirs à rendre
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Les devoirs sont publiés par ton enseignant. Réponds avec du texte, des explications
          et surtout des snippets de code.
        </p>
      </motion.div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:max-w-md">
        <Stat value={`${doneCount}/${open.length}`} label="Devoirs rendus" tone="lime" />
        <Stat value={open.length - doneCount} label="En attente" />
      </div>

      <div className="grid gap-4">
        {open.map((assignment) => (
          <AssignmentSubmissionCard
            key={assignment.id}
            assignment={assignment}
            draft={drafts[assignment.id]}
            submitted={submissions.find((item) => item.assignmentId === assignment.id)}
            busy={submittingId === assignment.id}
            onChange={(next) =>
              setDrafts((prev) => ({
                ...prev,
                [assignment.id]: { ...(prev[assignment.id] ?? next), ...next },
              }))
            }
            onSubmit={() => submitAssignment(assignment.id)}
          />
        ))}
        {!loading && open.length === 0 && (
          <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-16 text-center text-sm text-ink-faint">
            Aucun devoir ouvert pour le moment. Reviens plus tard !
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentSubmissionCard({
  assignment,
  draft,
  submitted,
  busy,
  onChange,
  onSubmit,
}: {
  assignment: Assignment;
  draft?: Submission;
  submitted?: Submission;
  busy: boolean;
  onChange: (next: Partial<Submission>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="card-paper rounded-[18px] p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            Devoir
          </div>
          <h3 className="display-tight text-2xl font-bold">{assignment.title}</h3>
        </div>
        <span
          className={`rounded-full border-[1.5px] border-ink px-3 py-1 text-xs font-bold ${
            submitted ? "bg-lime text-ink" : "bg-card text-ink-soft"
          }`}
        >
          {submitted ? `Livré · ${fmtDateTime(submitted.updatedAt)}` : "À rendre"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{assignment.description}</p>
      <div className="mt-3 rounded-xl border-[1.5px] border-ink bg-paper2/60 px-3 py-2 text-sm">
        Format attendu : <strong>{assignment.expectedFormat}</strong>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          value={draft?.title ?? assignment.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
          placeholder="Titre de ton rendu"
        />
        <input
          value={draft?.language ?? "javascript"}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
          placeholder="Langage principal"
        />
        <textarea
          value={draft?.content ?? ""}
          onChange={(e) => onChange({ content: e.target.value })}
          className="min-h-[220px] w-full rounded-[18px] border-[1.5px] border-ink bg-ink px-4 py-3 font-mono text-sm text-paper outline-none focus:shadow-hard-sm"
          placeholder="Colle ici ton snippet de code, ton explication, ta solution..."
        />
        <button
          disabled={busy || !(draft?.content ?? "").trim()}
          onClick={onSubmit}
          className="w-fit rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
        >
          {busy ? "Envoi…" : submitted ? "Mettre à jour le rendu" : "Livrer le devoir"}
        </button>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone?: "lime";
}) {
  return (
    <div
      className={`rounded-[14px] border-[1.5px] border-ink p-4 shadow-hard-sm ${
        tone === "lime" ? "bg-lime" : "bg-card"
      }`}
    >
      <div className="display-tight text-3xl font-extrabold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}
