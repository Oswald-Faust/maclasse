"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SOLO_PROJECTS, type SoloProject } from "@/data/projects";
import type { StoreData } from "@/lib/useStore";
import { SoloCard } from "./SoloCard";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

const DIFFS = ["Tous", "Facile", "Intermédiaire", "Avancé"] as const;

export function SoloSection({
  data,
  refresh,
}: {
  data: StoreData;
  refresh: () => Promise<void>;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("Tous");
  const [hideTaken, setHideTaken] = useState(false);
  const [picked, setPicked] = useState<SoloProject | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const takenCount = Object.keys(data.soloClaims).length;
  const total = SOLO_PROJECTS.length;
  const pct = Math.round((takenCount / total) * 100);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SOLO_PROJECTS.filter((p) => {
      if (diff !== "Tous" && p.difficulty !== diff) return false;
      if (hideTaken && data.soloClaims[p.id]) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        p.notions.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [search, diff, hideTaken, data.soloClaims]);

  function openPick(p: SoloProject) {
    setPicked(p);
    const saved = typeof window !== "undefined" ? localStorage.getItem("student") : null;
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setFirstName(s.firstName ?? "");
        setLastName(s.lastName ?? "");
      } catch {}
    }
  }

  async function confirmPick(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/solo/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: picked.id, firstName, lastName }),
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem("student", JSON.stringify({ firstName, lastName }));
        toast(`Bravo ${firstName}, « ${picked.title} » est à toi !`, "success");
        setPicked(null);
      } else {
        toast(json.error ?? "Impossible de prendre ce projet.", "error");
      }
      await refresh();
    } catch {
      toast("Erreur réseau, réessaie.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Barre de progression + filtres */}
      <div className="mb-8 flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <span className="display-tight text-5xl font-extrabold leading-none">
              {takenCount}
              <span className="text-ink-faint">/{total}</span>
            </span>
            <span className="pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              projets
              <br />
              réservés
            </span>
          </div>
          <span className="display-tight pb-1 text-3xl font-bold text-lime-deep">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full border-[1.5px] border-ink bg-paper2">
          <motion.div
            className="h-full bg-ink"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet, une techno…"
              className="w-full rounded-full border-[1.5px] border-ink bg-card py-2.5 pl-9 pr-4 text-sm outline-none transition focus:shadow-hard-sm"
            />
          </div>
          <div className="flex gap-1 rounded-full border-[1.5px] border-ink bg-card p-1">
            {DIFFS.map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  diff === d ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={() => setHideTaken((v) => !v)}
            className={`rounded-full border-[1.5px] border-ink px-4 py-2 text-xs font-semibold transition ${
              hideTaken ? "bg-lime text-ink" : "bg-card text-ink-soft hover:text-ink"
            }`}
          >
            {hideTaken ? "✓ " : ""}Masquer les pris
          </button>
        </div>
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => (
            <SoloCard
              key={p.id}
              project={p}
              index={i}
              claim={data.soloClaims[p.id]}
              onPick={openPick}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <p className="py-20 text-center font-mono text-sm uppercase tracking-widest text-ink-faint">
          Aucun projet ne correspond.
        </p>
      )}

      <Modal open={!!picked} onClose={() => !submitting && setPicked(null)}>
        {picked && (
          <form onSubmit={confirmPick}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-3xl">
                {picked.emoji}
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  Projet /{String(picked.number).padStart(2, "0")} · {picked.tag}
                </div>
                <h3 className="display-tight text-2xl font-extrabold">{picked.title}</h3>
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-ink-soft">{picked.description}</p>

            <div className="mb-5 rounded-xl border-[1.5px] border-ink bg-paper2/70 p-4">
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                Fonctionnalités attendues
              </div>
              <ul className="grid gap-1.5 text-sm text-ink sm:grid-cols-2">
                {picked.features.map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <span className="text-lime-deep">▸</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mb-3 text-sm text-ink-soft">
              Identifie-toi pour réserver. <strong className="text-ink">Premier arrivé,
              premier servi</strong> — une fois pris, ce projet disparaît pour tout le monde.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <input
                autoFocus
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
              />
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
            >
              {submitting ? "Réservation…" : "Confirmer et prendre le projet 🔒"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
