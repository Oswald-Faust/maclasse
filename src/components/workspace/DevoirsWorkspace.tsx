"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fmtDateTime } from "@/lib/format";
import { useCountdown, formatRemaining } from "@/lib/useCountdown";
import { Skeleton } from "@/components/Skeleton";
import {
  useWorkspace,
  type Submission,
  type Interrogation,
  type InterroSubmission,
} from "@/lib/useWorkspace";
import type { Assignment, WorkKind } from "@/lib/useStore";

const KIND_LABEL: Record<WorkKind, string> = {
  code: "💻 Informatique",
  redaction: "✍️ Rédaction",
  autre: "📋 Autre",
};

export function DevoirsWorkspace() {
  return <WorkItemsWorkspace initialTab="devoirs" />;
}

export function InterrogationsWorkspace() {
  return <WorkItemsWorkspace initialTab="interros" />;
}

function WorkItemsWorkspace({ initialTab }: { initialTab: "devoirs" | "interros" }) {
  const ws = useWorkspace(7000);
  const [tab, setTab] = useState<"devoirs" | "interros">(initialTab);

  const openAssignments = ws.assignments.filter((a) => a.isOpen);
  const runningInterros = ws.interrogations.filter((i) => i.status === "running");

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace de travail
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4rem)] font-extrabold">
          {tab === "devoirs" ? "Devoirs" : "Interrogations"}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          {tab === "devoirs"
            ? "Rends tes devoirs avant la date limite et suis l'état de tes remises."
            : "Passe les interrogations chronométrées lancées par ton enseignant et suis leur statut."}
        </p>
      </motion.div>

      <div className="mb-8 flex flex-wrap gap-2.5 border-b-[1.5px] border-ink pb-5">
        <Tab active={tab === "devoirs"} onClick={() => setTab("devoirs")} label="Devoirs" count={openAssignments.length} />
        <Tab
          active={tab === "interros"}
          onClick={() => setTab("interros")}
          label="Interrogations"
          count={runningInterros.length}
          live={runningInterros.length > 0}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "devoirs" ? (
            <DevoirsTab
              assignments={openAssignments}
              submissions={ws.submissions}
              drafts={ws.drafts}
              setDrafts={ws.setDrafts}
              submittingId={ws.submittingId}
              submitAssignment={ws.submitAssignment}
              loading={ws.loading}
            />
          ) : (
            <InterrosTab
              interrogations={ws.interrogations}
              interroSubmissions={ws.interroSubmissions}
              submitInterro={ws.submitInterro}
              loading={ws.loading}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Tab({
  active,
  onClick,
  label,
  count,
  live,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  live?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-full border-[1.5px] border-ink px-5 py-2.5 text-sm font-semibold transition-colors ${
        active ? "text-paper" : "text-ink hover:text-ink"
      }`}
    >
      {active && (
        <motion.span layoutId="devoirs-tab" className="absolute inset-0 z-0 bg-ink" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {live && <span className="h-2 w-2 animate-blink rounded-full bg-lime" />}
        {label}
        <span className="font-mono text-[11px] opacity-60">{count}</span>
      </span>
    </button>
  );
}

/* ---------------- Onglet Devoirs ---------------- */

function DevoirsTab({
  assignments,
  submissions,
  drafts,
  setDrafts,
  submittingId,
  submitAssignment,
  loading,
}: {
  assignments: Assignment[];
  submissions: Submission[];
  drafts: Record<string, Submission>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, Submission>>>;
  submittingId: string | null;
  submitAssignment: (id: string) => void;
  loading: boolean;
}) {
  if (!loading && assignments.length === 0) {
    return (
      <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-16 text-center text-sm text-ink-faint">
        Aucun devoir ouvert pour le moment.
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {loading && assignments.length === 0 && (
        <>
          <Skeleton className="h-[360px] w-full rounded-[18px]" />
          <Skeleton className="h-[360px] w-full rounded-[18px]" />
        </>
      )}
      {assignments.map((a) => (
        <AssignmentCard
          key={a.id}
          assignment={a}
          draft={drafts[a.id]}
          submitted={submissions.find((s) => s.assignmentId === a.id)}
          busy={submittingId === a.id}
          onChange={(next) =>
            setDrafts((prev) => ({ ...prev, [a.id]: { ...(prev[a.id] ?? next), ...next } }))
          }
          onSubmit={() => submitAssignment(a.id)}
        />
      ))}
    </div>
  );
}

function AssignmentCard({
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
  const isCode = assignment.kind === "code";
  const overdue = assignment.dueDate !== null && Date.now() > assignment.dueDate;

  return (
    <div className="card-paper rounded-[18px] p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border-[1.5px] border-ink bg-paper2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
              {KIND_LABEL[assignment.kind]}
            </span>
            {assignment.dueDate !== null && (
              <span
                className={`rounded-full border-[1.5px] border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  overdue ? "bg-vermilion text-paper" : "bg-card text-ink-soft"
                }`}
              >
                {overdue ? "Délai dépassé" : `À rendre avant ${fmtDateTime(assignment.dueDate)}`}
              </span>
            )}
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
      {assignment.expectedFormat && (
        <div className="mt-3 rounded-xl border-[1.5px] border-ink bg-paper2/60 px-3 py-2 text-sm">
          Format attendu : <strong>{assignment.expectedFormat}</strong>
        </div>
      )}

      {overdue ? (
        <div className="mt-4 rounded-xl border-[1.5px] border-vermilion bg-vermilion/10 px-3 py-3 text-sm text-vermilion">
          La date limite est dépassée — les rendus sont fermés.
          {submitted && " Ton dernier rendu a bien été enregistré."}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <input
            value={draft?.title ?? assignment.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
            placeholder="Titre de ton rendu"
          />
          {isCode && (
            <input
              value={draft?.language ?? "javascript"}
              onChange={(e) => onChange({ language: e.target.value })}
              className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
              placeholder="Langage principal"
            />
          )}
          <textarea
            value={draft?.content ?? ""}
            onChange={(e) => onChange({ content: e.target.value })}
            className={`min-h-[200px] w-full rounded-[18px] border-[1.5px] border-ink px-4 py-3 text-sm outline-none focus:shadow-hard-sm ${
              isCode ? "bg-ink font-mono text-paper" : "bg-card leading-relaxed"
            }`}
            placeholder={
              isCode
                ? "Colle ici ton snippet de code, ton explication, ta solution..."
                : "Rédige ici ta réponse..."
            }
          />
          <button
            disabled={busy || !(draft?.content ?? "").trim()}
            onClick={onSubmit}
            className="w-fit rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            {busy ? "Envoi…" : submitted ? "Mettre à jour le rendu" : "Livrer le devoir"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Onglet Interrogations ---------------- */

function InterrosTab({
  interrogations,
  interroSubmissions,
  submitInterro,
  loading,
}: {
  interrogations: Interrogation[];
  interroSubmissions: InterroSubmission[];
  submitInterro: (id: string, content: string, language: string, final: boolean) => Promise<boolean>;
  loading: boolean;
}) {
  if (!loading && interrogations.length === 0) {
    return (
      <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-16 text-center text-sm text-ink-faint">
        Aucune interrogation lancée. Quand ton enseignant en démarre une, elle apparaît ici avec
        un compte à rebours.
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {loading && interrogations.length === 0 && (
        <>
          <Skeleton className="h-24 w-full rounded-[18px]" />
          <Skeleton className="h-24 w-full rounded-[18px]" />
        </>
      )}
      {interrogations.map((i) => (
        <InterroCard
          key={i.id}
          interro={i}
          mySub={interroSubmissions.find((s) => s.interroId === i.id)}
          submitInterro={submitInterro}
        />
      ))}
    </div>
  );
}

function InterroCard({
  interro,
  mySub,
  submitInterro,
}: {
  interro: Interrogation;
  mySub?: InterroSubmission;
  submitInterro: (id: string, content: string, language: string, final: boolean) => Promise<boolean>;
}) {
  const remaining = useCountdown(interro.status === "running" ? interro.endsAt : null);
  const isCode = interro.kind === "code";
  const timeUp = interro.status !== "running" || remaining <= 0;
  const handedIn = Boolean(mySub?.submittedAt);
  const locked = timeUp || handedIn;

  const [content, setContent] = useState(mySub?.content ?? "");
  const [language, setLanguage] = useState(mySub?.language ?? "javascript");
  const [busy, setBusy] = useState(false);

  // Synchronise une seule fois le contenu existant.
  useEffect(() => {
    if (mySub) {
      setContent((c) => (c ? c : mySub.content));
      setLanguage((l) => (l && l !== "javascript" ? l : mySub.language || "javascript"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySub?.id]);

  async function save(final: boolean) {
    setBusy(true);
    await submitInterro(interro.id, content, language, final);
    setBusy(false);
  }

  const danger = remaining > 0 && remaining < 60_000;

  return (
    <div
      className={`card-paper rounded-[18px] p-5 shadow-hard ${
        interro.status === "running" && !locked ? "ring-2 ring-lime" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border-[1.5px] border-ink bg-paper2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
              {KIND_LABEL[interro.kind]}
            </span>
            <span className="rounded-full border-[1.5px] border-ink bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink-soft">
              {interro.durationMinutes} min
            </span>
          </div>
          <h3 className="display-tight text-2xl font-bold">{interro.title}</h3>
        </div>

        {interro.status === "running" && !handedIn ? (
          <div
            className={`rounded-xl border-[1.5px] border-ink px-4 py-2 text-center ${
              danger ? "animate-blink bg-vermilion text-paper" : "bg-lime text-ink"
            }`}
          >
            <div className="font-mono text-[9px] uppercase tracking-widest opacity-70">
              Temps restant
            </div>
            <div className="display-tight text-2xl font-extrabold tabular-nums">
              {formatRemaining(remaining)}
            </div>
          </div>
        ) : (
          <span className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-bold text-ink-soft">
            {handedIn ? "Rendue ✓" : "Terminée"}
          </span>
        )}
      </div>

      {interro.instructions && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {interro.instructions}
        </p>
      )}

      {locked ? (
        <div className="mt-4 rounded-xl border-[1.5px] border-ink bg-paper2/60 px-3 py-3 text-sm text-ink-soft">
          {handedIn
            ? `Tu as rendu cette interrogation le ${fmtDateTime(mySub!.submittedAt as number)}.`
            : "Le temps est écoulé — les rendus sont fermés."}
          {mySub && mySub.content && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-ink p-3 font-mono text-xs text-paper">
              {mySub.content}
            </pre>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {isCode && (
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
              placeholder="Langage principal"
            />
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`min-h-[240px] w-full rounded-[18px] border-[1.5px] border-ink px-4 py-3 text-sm outline-none focus:shadow-hard-sm ${
              isCode ? "bg-ink font-mono text-paper" : "bg-card leading-relaxed"
            }`}
            placeholder={isCode ? "Écris ton code ici…" : "Rédige ta réponse ici…"}
          />
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => save(false)}
              className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2 disabled:opacity-50"
            >
              {busy ? "…" : "Enregistrer le brouillon"}
            </button>
            <button
              disabled={busy || !content.trim()}
              onClick={() => {
                if (confirm("Rendre définitivement ? Tu ne pourras plus modifier.")) save(true);
              }}
              className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
            >
              Rendre définitivement →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
