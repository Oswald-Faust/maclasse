"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { openCourseFile } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useWorkspace, type Course, type CourseSession } from "@/lib/useWorkspace";

const KIND_BADGE: Record<Course["kind"], string> = {
  pdf: "📄 PDF",
  resume: "📝 Résumé",
  lien: "🔗 Lien",
};

function dayLabel(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function CoursWorkspace() {
  const { courses, sessions, loading } = useWorkspace();

  // Regroupe les cours par séance (jour). Les cours non datés vont dans "Autres".
  const sessionsSorted = [...sessions].sort((a, b) => a.date - b.date);
  const grouped: { session: CourseSession | null; items: Course[] }[] = sessionsSorted.map((s) => ({
    session: s,
    items: courses.filter((c) => c.sessionId === s.id),
  }));
  const orphans = courses.filter((c) => !c.sessionId || !sessions.some((s) => s.id === c.sessionId));
  if (orphans.length) grouped.push({ session: null, items: orphans });

  const hasContent = courses.length > 0 || sessions.length > 0;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace de travail · Cours
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4rem)] font-extrabold">
          Tes cours & supports
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Retrouve les supports partagés par ton enseignant, organisés par séance.
        </p>
      </motion.div>

      {!loading && !hasContent && (
        <div className="rounded-[18px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-16 text-center text-sm text-ink-faint">
          Aucun cours partagé pour le moment.
        </div>
      )}

      <div className="flex flex-col gap-8">
        {grouped.map((g, i) => (
          <section key={g.session?.id ?? `orphan-${i}`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-lime font-display text-lg font-extrabold">
                {g.session ? new Date(g.session.date).getDate() : "•"}
              </span>
              <div>
                <h2 className="display-tight text-xl font-bold leading-none">
                  {g.session ? g.session.title : "Autres supports"}
                </h2>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  {g.session ? dayLabel(g.session.date) : "Non rattachés à une séance"}
                </div>
              </div>
            </div>
            {g.session?.description && (
              <p className="mb-3 text-sm text-ink-soft">{g.session.description}</p>
            )}
            {g.items.length === 0 ? (
              <p className="rounded-xl border-[1.5px] border-dashed border-ink/20 bg-card/40 px-4 py-5 text-center text-sm text-ink-faint">
                Aucun support pour cette séance.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {g.items.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openPdf() {
    setBusy(true);
    const ok = await openCourseFile(course.id);
    if (!ok) toast("Impossible d'ouvrir le fichier.", "error");
    setBusy(false);
  }

  return (
    <motion.div
      layout
      className="card-paper rounded-[16px] p-5 shadow-hard-sm"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full border-[1.5px] border-ink bg-paper2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
          {KIND_BADGE[course.kind]}
        </span>
      </div>
      <h3 className="display-tight text-lg font-bold">{course.title}</h3>

      {course.kind === "resume" && course.summary && (
        <>
          <p className={`mt-2 whitespace-pre-wrap text-sm text-ink-soft ${open ? "" : "line-clamp-4"}`}>
            {course.summary}
          </p>
          {course.summary.length > 180 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-1 font-mono text-[11px] uppercase tracking-wider text-lime-deep underline-grow"
            >
              {open ? "Réduire" : "Lire la suite"}
            </button>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {course.kind === "pdf" && course.hasFile && (
          <button
            onClick={openPdf}
            disabled={busy}
            className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            {busy ? "Ouverture…" : "Ouvrir le PDF →"}
          </button>
        )}
        {course.kind === "lien" && course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2"
          >
            Ouvrir le lien ↗
          </a>
        )}
      </div>
    </motion.div>
  );
}
