"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SOLO_PROJECTS } from "@/data/projects";
import { useStore } from "@/lib/useStore";
import { useAuth } from "@/lib/useAuth";
import { useWorkspace } from "@/lib/useWorkspace";
import { ToastProvider } from "@/components/Toast";
import { AppHeader } from "@/components/AppHeader";
import { SoloSection } from "@/components/SoloSection";
import { GroupSection } from "@/components/GroupSection";
import type { Student } from "@/lib/useAuth";

type Tab = "solo" | "group";

export default function Page() {
  return (
    <ToastProvider>
      <Guard />
    </ToastProvider>
  );
}

function Guard() {
  const { student, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !student) router.replace("/login?next=/choix");
  }, [loading, student, router]);

  if (loading || !student) {
    return (
      <div className="grid min-h-screen place-items-center font-mono text-xs uppercase tracking-widest text-ink-faint">
        Chargement…
      </div>
    );
  }

  return (
    <>
      <AppHeader student={student} onLogout={logout} />
      <Board student={student} />
    </>
  );
}

const norm = (s: string) => s.trim().toLowerCase();

function Board({ student }: { student: Student }) {
  const [tab, setTab] = useState<Tab>("solo");
  const { data, loading, refresh } = useStore();
  const { assignments, submissions, sessions, courses } = useWorkspace();

  const soloTaken = Object.keys(data.soloClaims).length;
  const soloTotal = SOLO_PROJECTS.length;
  const soloClaim = useMemo(
    () =>
      Object.values(data.soloClaims).find(
        (claim) =>
          norm(claim.firstName) === norm(student.firstName) &&
          norm(claim.lastName) === norm(student.lastName)
      ),
    [data.soloClaims, student.firstName, student.lastName]
  );
  const personalProject = soloClaim
    ? SOLO_PROJECTS.find((project) => project.id === soloClaim.projectId)
    : undefined;
  const openAssignments = assignments.filter((assignment) => assignment.isOpen);
  const submittedCount = openAssignments.filter((assignment) =>
    submissions.some((submission) => submission.assignmentId === assignment.id)
  ).length;

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />

      <Ticker live={!loading} items={data.uiSettings.boardTickerItems} />

      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
        <header className="mb-12">
          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            <span className="inline-flex h-2 w-2 animate-blink rounded-full bg-lime-deep" />
            Sélection {new Date().getFullYear()} · Réalisations étudiantes
          </div>

          <h1 className="display-tight text-[clamp(2.8rem,9vw,6.5rem)] font-extrabold">
            <Reveal delay={0}>Choisis ton</Reveal>
            <Reveal delay={0.08}>
              projet de{" "}
              <span className="relative inline-block">
                <span className="relative z-10">réalisation</span>
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-[-4px] bottom-[0.12em] z-0 h-[0.42em] origin-left bg-lime"
                />
              </span>
            </Reveal>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            Chaque étudiant choisit un projet.{" "}
            <span className="font-semibold text-ink">
              Les premiers qui sélectionnent un projet le prennent.
            </span>{" "}
            Une fois réservé, il disparaît du tableau — pour tout le monde.
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b-[1.5px] border-ink pb-5"
        >
          <div className="flex flex-wrap gap-2.5">
            <TabButton active={tab === "solo"} onClick={() => setTab("solo")} index="01" label="Projet personnel" />
            <TabButton active={tab === "group"} onClick={() => setTab("group")} index="02" label="Projet de groupe" />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            {tab === "solo"
              ? `${soloTaken} / ${soloTotal} projets réservés`
              : `${data.groups.length} groupe${data.groups.length > 1 ? "s" : ""} inscrit${
                  data.groups.length > 1 ? "s" : ""
                }`}
          </div>
        </motion.div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "solo" ? (
            personalProject ? (
              <PersonalProjectSpace
                project={personalProject}
                submittedCount={submittedCount}
                openAssignmentsCount={openAssignments.length}
                sessionsCount={sessions.length}
                coursesCount={courses.length}
              />
            ) : (
              <SoloSection data={data} refresh={refresh} />
            )
          ) : (
            <GroupSection data={data} refresh={refresh} />
          )}
        </motion.div>

        <footer className="mt-20 flex flex-col gap-2 border-t-[1.5px] border-ink pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>Tableau synchronisé en direct</span>
          <Link href="/admin" className="underline-grow hover:text-ink">
            Espace enseignant →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function PersonalProjectSpace({
  project,
  submittedCount,
  openAssignmentsCount,
  sessionsCount,
  coursesCount,
}: {
  project: (typeof SOLO_PROJECTS)[number];
  submittedCount: number;
  openAssignmentsCount: number;
  sessionsCount: number;
  coursesCount: number;
}) {
  return (
    <section className="rounded-[32px] border-[1.5px] border-ink bg-card p-6 shadow-hard sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <span className="rounded-full border border-ink px-3 py-1 text-ink">
              Projet personnel réservé
            </span>
            <span>
              /{String(project.number).padStart(2, "0")} · {project.tag}
            </span>
            <span>{project.difficulty}</span>
          </div>

          <div className="mb-5 flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] border-[1.5px] border-ink bg-paper2 text-4xl">
              {project.emoji}
            </span>
            <div>
              <h2 className="display-tight text-3xl font-extrabold sm:text-4xl">{project.title}</h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-lime-deep">{project.tagline}</p>
            </div>
          </div>

          <p className="max-w-3xl text-base leading-relaxed text-ink-soft">{project.description}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <MiniStat value={project.features.length} label="Livrables attendus" />
            <MiniStat value={`${submittedCount}/${openAssignmentsCount}`} label="Devoirs rendus" />
            <MiniStat value={project.pages?.length ?? project.notions.length} label="Pistes de travail" />
          </div>

          <div className="mt-6">
            <Link
              href="/choix/projet-personnel"
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-lime hover:text-ink"
            >
              Voir la fiche projet →
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border-[1.5px] border-ink bg-paper2/70 p-5">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            Accès rapide
          </div>
          <div className="grid gap-3">
            <QuickLink href="/dashboard" title="Tableau de bord" meta="Vue globale de ton avancement" />
            <QuickLink href="/notes" title="Mes notes" meta="Prépare ton plan, tes idées et tes snippets" />
            <QuickLink href="/devoirs" title="Mes devoirs" meta={`${submittedCount}/${openAssignmentsCount} rendus en cours`} />
            <QuickLink href="/cours" title="Supports de cours" meta={`${coursesCount} support${coursesCount > 1 ? "s" : ""} disponible${coursesCount > 1 ? "s" : ""}`} />
            <QuickLink href="/agenda" title="Agenda" meta={`${sessionsCount} séance${sessionsCount > 1 ? "s" : ""} planifiée${sessionsCount > 1 ? "s" : ""}`} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-[28px] border-[1.5px] border-ink bg-paper p-5">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            Livrables du projet
          </div>
          <ul className="grid gap-2 text-sm text-ink sm:grid-cols-2">
            {project.features.map((feature) => (
              <li key={feature} className="flex gap-2 rounded-2xl border border-ink/10 bg-card px-3 py-2.5">
                <span className="text-lime-deep">▸</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border-[1.5px] border-ink bg-ink p-5 text-paper">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/70">
            Technologies / notions
          </div>
          <div className="flex flex-wrap gap-2">
            {project.notions.map((notion) => (
              <span
                key={notion}
                className="rounded-full border border-paper/20 bg-paper/10 px-3 py-1 text-xs font-semibold"
              >
                {notion}
              </span>
            ))}
          </div>
          {project.pages?.length ? (
            <>
              <div className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/70">
                Pages suggérées
              </div>
              <ul className="grid gap-2 text-sm">
                {project.pages.map((page) => (
                  <li key={page} className="rounded-2xl border border-paper/15 px-3 py-2">
                    {page}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-[24px] border-[1.5px] border-ink bg-paper2/60 p-4">
      <div className="display-tight text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-sm text-ink-soft">{label}</div>
    </div>
  );
}

function QuickLink({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border-[1.5px] border-ink bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:bg-lime"
    >
      <div className="text-sm font-bold text-ink">{title}</div>
      <div className="mt-1 text-xs text-ink-soft">{meta}</div>
    </Link>
  );
}

function Reveal({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function TabButton({
  active,
  onClick,
  index,
  label,
}: {
  active: boolean;
  onClick: () => void;
  index: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-full border-[1.5px] border-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
        active ? "text-paper" : "text-ink hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="tab-fill"
          className="absolute inset-0 z-0 bg-ink"
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        />
      )}
      {!active && (
        <span className="absolute inset-0 z-0 origin-bottom scale-y-0 bg-lime transition-transform duration-300 group-hover:scale-y-100" />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <span className="font-mono text-[11px] opacity-60">{index}</span>
        {label}
      </span>
    </button>
  );
}

function Ticker({ live, items }: { live: boolean; items: string[] }) {
  const source = items.length > 0 ? items : [live ? "● EN DIRECT" : "○ SYNCHRO…"];
  const row = [...source, ...source];
  return (
    <div className="relative z-10 overflow-hidden border-b-[1.5px] border-ink bg-ink">
      <div className="flex w-max animate-marquee">
        {row.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-3 whitespace-nowrap px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper"
          >
            {t}
            <span className="text-lime">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
