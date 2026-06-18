"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GROUP_PROJECTS, SOLO_PROJECTS } from "@/data/projects";
import { AuthedPage } from "@/components/AuthedPage";
import { useStore } from "@/lib/useStore";
import { useWorkspace } from "@/lib/useWorkspace";
import type { Student } from "@/lib/useAuth";

export default function Page() {
  return (
    <AuthedPage next="/dashboard">
      {(student) => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <DashboardView student={student} />
        </main>
      )}
    </AuthedPage>
  );
}

const norm = (s: string) => s.trim().toLowerCase();

function DashboardView({ student }: { student: Student }) {
  const { firstName, lastName, email } = student;
  const { data } = useStore();
  const { notes, assignments, submissions, interrogations, sessions } = useWorkspace();

  const soloClaim = useMemo(
    () =>
      Object.values(data.soloClaims).find(
        (c) => norm(c.firstName) === norm(firstName) && norm(c.lastName) === norm(lastName)
      ),
    [data.soloClaims, firstName, lastName]
  );
  const soloProject = soloClaim ? SOLO_PROJECTS.find((p) => p.id === soloClaim.projectId) : undefined;

  const myGroup = useMemo(
    () =>
      data.groups.find((g) =>
        g.members.some(
          (m) => norm(m.firstName) === norm(firstName) && norm(m.lastName) === norm(lastName)
        )
      ),
    [data.groups, firstName, lastName]
  );
  const groupProject = myGroup?.projectId
    ? GROUP_PROJECTS.find((p) => p.id === myGroup.projectId)
    : undefined;

  const soloTaken = Object.keys(data.soloClaims).length;
  const soloTotal = SOLO_PROJECTS.length;
  const done = (soloProject ? 1 : 0) + (groupProject ? 1 : 0);

  const openAssignments = assignments.filter((a) => a.isOpen);
  const submittedCount = openAssignments.filter((a) =>
    submissions.some((s) => s.assignmentId === a.id)
  ).length;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace étudiant · {email}
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4.5rem)] font-extrabold">
          Salut {firstName} 👋
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Bienvenue sur ton espace StudEasy. Gère tes projets, organise tes notes et rends tes
          devoirs — tout est rassemblé ici.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${done}/2`} label="Choix complétés" tone="lime" />
        <Stat value={notes.length} label="Notes" />
        <Stat value={`${submittedCount}/${openAssignments.length}`} label="Devoirs rendus" />
        <Stat value={`${soloTaken}/${soloTotal}`} label="Projets perso pris" />
      </div>

      {/* Projets */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ProjectCard
          label="Projet personnel"
          state={soloProject ? "Réservé" : "À faire"}
          accent={Boolean(soloProject)}
        >
          {soloProject ? (
            <>
              <ProjectHeader
                emoji={soloProject.emoji}
                meta={`/${String(soloProject.number).padStart(2, "0")} · ${soloProject.tag}`}
                title={soloProject.title}
              />
              <p className="mt-3 text-sm text-ink-soft">{soloProject.description}</p>
              <CardLink href="/choix">Voir le tableau →</CardLink>
            </>
          ) : (
            <Empty emoji="🎯" text="Tu n'as pas encore réservé de projet personnel. Choisis vite." cta="Choisir mon projet" />
          )}
        </ProjectCard>

        <ProjectCard
          label="Projet de groupe"
          state={groupProject ? "Validé" : myGroup ? "Groupe créé" : "À faire"}
          accent={Boolean(groupProject)}
        >
          {myGroup ? (
            <>
              <ProjectHeader emoji={groupProject?.emoji ?? "👥"} meta="Groupe" title={myGroup.name} />
              <div className="mt-4 rounded-xl border-[1.5px] border-ink bg-paper2/60 p-3 text-sm">
                {groupProject ? (
                  <span>
                    Projet choisi :{" "}
                    <strong>
                      {groupProject.emoji} {groupProject.title}
                    </strong>
                  </span>
                ) : (
                  <span className="text-ink-soft">Aucun projet choisi pour l&apos;instant.</span>
                )}
              </div>
              <div className="mt-3">
                <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                  Membres ({myGroup.members.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {myGroup.members.map((m, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-ink/15 bg-paper2 px-2.5 py-0.5 text-xs text-ink-soft"
                    >
                      {m.firstName} {m.lastName}
                    </span>
                  ))}
                </div>
              </div>
              <CardLink href="/choix">
                {groupProject ? "Voir le groupe →" : "Choisir le projet de groupe →"}
              </CardLink>
            </>
          ) : (
            <Empty emoji="🤝" text="Crée ou rejoins un groupe pour avancer sur le projet collectif." cta="Gérer le groupe" />
          )}
        </ProjectCard>
      </div>

      {/* Raccourcis espace de travail */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <HubCard
          href="/agenda"
          emoji="🗓️"
          title="Mon agenda"
          desc={
            sessions.length > 0
              ? "Consulte les séances planifiées et les supports associés."
              : "Aucun agenda disponible pour le moment."
          }
          cta="Voir l'agenda"
        />
        <HubCard
          href="/notes"
          emoji="📝"
          title="Mes notes"
          desc={
            notes.length > 0
              ? `${notes.length} note${notes.length > 1 ? "s" : ""} · idées, structure et snippets`
              : "Aucune note pour l'instant — commence à écrire."
          }
          cta="Ouvrir mes notes"
        />
        <HubCard
          href="/devoirs"
          emoji="📦"
          title="Mes devoirs"
          desc={
            openAssignments.length > 0
              ? `${submittedCount}/${openAssignments.length} rendu${openAssignments.length > 1 ? "s" : ""} · devoirs publiés par le prof`
              : "Aucun devoir ouvert pour le moment."
          }
          cta="Voir les devoirs"
        />
        <HubCard
          href="/interrogations"
          emoji="⏱️"
          title="Mes interrogations"
          desc={
            interrogations.length > 0
              ? `${interrogations.filter((i) => i.status === "running").length} en cours · contrôles chronométrés`
              : "Aucune interrogation pour le moment."
          }
          cta="Voir les interrogations"
        />
      </div>
    </div>
  );
}

function HubCard({
  href,
  emoji,
  title,
  desc,
  cta,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, x: -2 }}
        className="card-paper flex h-full items-center gap-4 rounded-[18px] p-6 shadow-hard transition-shadow group-hover:shadow-hard-lg"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-3xl transition-transform group-hover:-rotate-6">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="display-tight text-xl font-bold">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>
        </div>
        <span className="shrink-0 font-mono text-lg transition-transform group-hover:translate-x-1">→</span>
      </motion.div>
    </Link>
  );
}

function ProjectCard({
  label,
  state,
  accent,
  children,
}: {
  label: string;
  state: string;
  accent: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-paper flex flex-col rounded-[18px] p-6 shadow-hard"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          {label}
        </span>
        <span
          className={`rounded-full border-[1.5px] border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
            accent ? "bg-lime text-ink" : "bg-card text-ink-faint"
          }`}
        >
          {state}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

function ProjectHeader({ emoji, meta, title }: { emoji: string; meta: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-14 w-14 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-3xl">
        {emoji}
      </span>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{meta}</div>
        <h3 className="display-tight text-2xl font-extrabold leading-none">{title}</h3>
      </div>
    </div>
  );
}

function Empty({ emoji, text, cta }: { emoji: string; text: string; cta: string }) {
  return (
    <>
      <div className="grid h-14 w-14 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-3xl">
        {emoji}
      </div>
      <p className="mt-3 text-sm text-ink-soft">{text}</p>
      <CardLink href="/choix">{cta} →</CardLink>
    </>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-auto pt-5">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2"
      >
        {children}
      </Link>
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
      <div className="display-tight text-4xl font-extrabold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}
