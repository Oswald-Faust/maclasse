"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { SOLO_PROJECTS } from "@/data/projects";
import { AuthedPage } from "@/components/AuthedPage";
import { useStore } from "@/lib/useStore";
import { useWorkspace } from "@/lib/useWorkspace";
import type { Student } from "@/lib/useAuth";

const norm = (s: string) => s.trim().toLowerCase();

export default function Page() {
  return (
    <AuthedPage next="/choix/projet-personnel">
      {(student) => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <ProjectDetail student={student} />
        </main>
      )}
    </AuthedPage>
  );
}

function ProjectDetail({ student }: { student: Student }) {
  const { data } = useStore();
  const { assignments, submissions, notes, sessions, courses } = useWorkspace();

  const soloClaim = useMemo(
    () =>
      Object.values(data.soloClaims).find(
        (claim) =>
          norm(claim.firstName) === norm(student.firstName) &&
          norm(claim.lastName) === norm(student.lastName)
      ),
    [data.soloClaims, student.firstName, student.lastName]
  );

  const project = soloClaim ? SOLO_PROJECTS.find((item) => item.id === soloClaim.projectId) : undefined;
  const openAssignments = assignments.filter((assignment) => assignment.isOpen);
  const submittedCount = openAssignments.filter((assignment) =>
    submissions.some((submission) => submission.assignmentId === assignment.id)
  ).length;

  if (!project) {
    return (
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border-[1.5px] border-ink bg-card p-8 shadow-hard"
        >
          <div className="max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              Projet personnel
            </div>
            <h1 className="display-tight mt-3 text-4xl font-extrabold">Aucun projet choisi pour le moment</h1>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Cette page affichera tous les détails de ton projet dès que tu auras réservé un sujet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/choix"
                className="rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-lime hover:text-ink"
              >
                Choisir mon projet
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border-[1.5px] border-ink bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-paper2"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace projet personnel
        </div>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span className="rounded-full border-[1.5px] border-ink bg-lime px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                Réservé
              </span>
              <span className="font-mono uppercase tracking-[0.14em]">
                /{String(project.number).padStart(2, "0")} · {project.tag} · {project.difficulty}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[26px] border-[1.5px] border-ink bg-paper2 text-5xl">
                {project.emoji}
              </span>
              <div>
                <h1 className="display-tight text-[clamp(2.4rem,7vw,4.8rem)] font-extrabold leading-none">
                  {project.title}
                </h1>
                <p className="mt-3 text-lg text-lime-deep">{project.tagline}</p>
              </div>
            </div>
            <p className="mt-6 text-base leading-relaxed text-ink-soft">{project.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border-[1.5px] border-ink bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-paper2"
            >
              Retour dashboard
            </Link>
            <Link
              href="/choix"
              className="rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-lime hover:text-ink"
            >
              Ouvrir l’espace projet
            </Link>
          </div>
        </div>
      </motion.section>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={project.features.length} label="Livrables" tone="lime" />
        <Stat value={project.notions.length} label="Notions clés" />
        <Stat value={`${submittedCount}/${openAssignments.length}`} label="Devoirs rendus" />
        <Stat value={`${notes.length}`} label="Notes de travail" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Panel title="Livrables attendus" subtitle="Les éléments à produire pour ce projet">
          <ul className="grid gap-2 sm:grid-cols-2">
            {project.features.map((feature) => (
              <li key={feature} className="rounded-[18px] border border-ink/10 bg-paper2/60 px-4 py-3 text-sm">
                <span className="mr-2 text-lime-deep">▸</span>
                {feature}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Vue d’ensemble" subtitle="Repères utiles pour avancer">
          <div className="grid gap-3">
            <QuickInfo label="Tag" value={project.tag} />
            <QuickInfo label="Difficulté" value={project.difficulty} />
            <QuickInfo label="Séances planifiées" value={`${sessions.length}`} />
            <QuickInfo
              label="Supports disponibles"
              value={`${courses.length} document${courses.length > 1 ? "s" : ""}`}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="Notions et technologies" subtitle="Les concepts à mobiliser dans le projet" dark>
          <div className="flex flex-wrap gap-2">
            {project.notions.map((notion) => (
              <span
                key={notion}
                className="rounded-full border border-paper/15 bg-paper/10 px-3 py-1.5 text-xs font-semibold text-paper"
              >
                {notion}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Pages suggérées" subtitle="Une base d’organisation si tu structures ton interface">
          {project.pages?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {project.pages.map((page) => (
                <div key={page} className="rounded-[18px] border border-ink/10 bg-card px-4 py-3 text-sm font-medium">
                  {page}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              Ce sujet n’impose pas de pages précises. Appuie-toi sur les livrables et les notions
              pour construire ton interface.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  dark,
  children,
}: {
  title: string;
  subtitle: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[28px] border-[1.5px] border-ink p-6 shadow-hard ${
        dark ? "bg-ink text-paper" : "bg-card"
      }`}
    >
      <div
        className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
          dark ? "text-paper/65" : "text-ink-soft"
        }`}
      >
        {title}
      </div>
      <p className={`mt-2 mb-5 text-sm ${dark ? "text-paper/80" : "text-ink-soft"}`}>{subtitle}</p>
      {children}
    </motion.section>
  );
}

function QuickInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-ink/10 bg-paper2/60 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
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
      className={`rounded-[16px] border-[1.5px] border-ink p-4 shadow-hard-sm ${
        tone === "lime" ? "bg-lime" : "bg-card"
      }`}
    >
      <div className="display-tight text-4xl font-extrabold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}
