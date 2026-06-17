"use client";

import { motion } from "framer-motion";
import type { SoloProject } from "@/data/projects";
import type { SoloClaim } from "@/lib/useStore";

const diffStyles: Record<string, string> = {
  Facile: "bg-lime text-ink",
  Intermédiaire: "bg-cobalt text-paper",
  Avancé: "bg-vermilion text-paper",
};

export function SoloCard({
  project,
  claim,
  index,
  onPick,
}: {
  project: SoloProject;
  claim?: SoloClaim;
  index: number;
  onPick: (p: SoloProject) => void;
}) {
  const taken = Boolean(claim);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={taken ? undefined : { y: -5, x: -2 }}
      className={`group relative flex flex-col rounded-[14px] border-[1.5px] border-ink p-5 transition-shadow duration-200 ${
        taken
          ? "bg-paper2/60 shadow-none"
          : "bg-card shadow-hard hover:shadow-hard-lg"
      }`}
    >
      {/* En-tête : numéro mono + difficulté */}
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-xs font-medium text-ink-faint">
          /{String(project.number).padStart(2, "0")}
        </span>
        <span
          className={`rounded-full border-[1.5px] border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
            taken ? "bg-transparent text-ink-faint" : diffStyles[project.difficulty]
          }`}
        >
          {project.difficulty}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink text-2xl transition-transform duration-300 ${
            taken ? "opacity-50" : "group-hover:-rotate-6 bg-paper2"
          }`}
        >
          {project.emoji}
        </span>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {project.tag}
          </div>
          <h3
            className={`display-tight text-xl font-bold leading-none ${
              taken ? "text-ink-faint line-through decoration-[1.5px]" : "text-ink"
            }`}
          >
            {project.title}
          </h3>
        </div>
      </div>

      <p className={`mb-4 text-sm leading-relaxed ${taken ? "text-ink-faint" : "text-ink-soft"}`}>
        {project.tagline}
      </p>

      <ul className="mb-5 flex flex-wrap gap-1.5">
        {project.notions.slice(0, 4).map((n) => (
          <li
            key={n}
            className="rounded-full border border-ink/15 bg-paper2 px-2 py-0.5 font-mono text-[10px] text-ink-soft"
          >
            {n}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {taken ? (
          <div className="flex items-center gap-2 border-t-[1.5px] border-dashed border-ink/25 pt-3 text-sm">
            <span className="text-base">🔒</span>
            <span className="text-ink-soft">
              Réservé par{" "}
              <strong className="font-semibold text-ink">
                {claim!.firstName} {claim!.lastName}
              </strong>
            </span>
          </div>
        ) : (
          <button
            onClick={() => onPick(project)}
            className="flex w-full items-center justify-between rounded-full border-[1.5px] border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-lime hover:text-ink"
          >
            Prendre ce projet
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
