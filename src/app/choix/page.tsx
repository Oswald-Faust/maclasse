"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SOLO_PROJECTS } from "@/data/projects";
import { useStore } from "@/lib/useStore";
import { useAuth } from "@/lib/useAuth";
import { ToastProvider } from "@/components/Toast";
import { AppHeader } from "@/components/AppHeader";
import { SoloSection } from "@/components/SoloSection";
import { GroupSection } from "@/components/GroupSection";

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
      <Board />
    </>
  );
}

function Board() {
  const [tab, setTab] = useState<Tab>("solo");
  const { data, loading, refresh } = useStore();

  const soloTaken = Object.keys(data.soloClaims).length;
  const soloTotal = SOLO_PROJECTS.length;

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
            <SoloSection data={data} refresh={refresh} />
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
