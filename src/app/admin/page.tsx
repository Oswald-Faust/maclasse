"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { GROUP_PROJECTS, SOLO_PROJECTS } from "@/data/projects";
import { ToastProvider, useToast } from "@/components/Toast";
import { useStore, type Assignment } from "@/lib/useStore";

export default function AdminPage() {
  return (
    <ToastProvider>
      <Admin />
    </ToastProvider>
  );
}

function Admin() {
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setKey(localStorage.getItem("adminKey"));
    setReady(true);
  }, []);

  function logout() {
    localStorage.removeItem("adminKey");
    setKey(null);
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />
      {ready && (key ? <Dashboard adminKey={key} onLogout={logout} /> : <Login onAuth={setKey} />)}
    </main>
  );
}

function Login({ onAuth }: { onAuth: (key: string) => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem("adminKey", json.key);
        onAuth(json.key);
        toast("Bienvenue dans l'espace admin ✦", "success");
      } else {
        toast(json.error ?? "Mot de passe incorrect.", "error");
      }
    } catch {
      toast("Erreur réseau.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="card-paper w-full max-w-sm rounded-[18px] p-7 shadow-hard"
      >
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          Espace réservé
        </div>
        <h1 className="display-tight text-3xl font-extrabold">Console admin</h1>
        <p className="mb-6 mt-1.5 text-sm text-ink-soft">
          Entre le mot de passe enseignant pour piloter StudEasy.
        </p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="mb-4 w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Entrer →"}
        </button>
        <Link
          href="/"
          className="mt-4 block text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint underline-grow"
        >
          ← Retour au site
        </Link>
      </motion.form>
    </div>
  );
}

type SoloFilter = "all" | "taken" | "free";

function Dashboard({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const toast = useToast();
  const { data, refresh } = useStore(5000);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SoloFilter>("all");
  const [busy, setBusy] = useState(false);
  const [tickerText, setTickerText] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState({
    title: "",
    description: "",
    expectedFormat: "Snippet de code + explication",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setTickerText((data.uiSettings.boardTickerItems ?? []).join("\n"));
  }, [data.uiSettings.boardTickerItems]);

  const takenCount = Object.keys(data.soloClaims).length;
  const total = SOLO_PROJECTS.length;
  const groupsWithProject = data.groups.filter((g) => g.projectId).length;
  const studentsEngaged =
    takenCount + data.groups.reduce((acc, g) => acc + g.members.length, 0);

  async function act(body: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        toast("Session expirée, reconnecte-toi.", "error");
        onLogout();
        return false;
      }
      if (!res.ok) {
        toast("Action impossible.", "error");
        return false;
      }
      toast(okMsg, "success");
      await refresh();
      return true;
    } catch {
      toast("Erreur réseau.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SOLO_PROJECTS.map((p) => ({ p, claim: data.soloClaims[p.id] }))
      .filter(({ p, claim }) => {
        if (filter === "taken" && !claim) return false;
        if (filter === "free" && claim) return false;
        if (!q) return true;
        const who = claim ? `${claim.firstName} ${claim.lastName}` : "";
        return (
          p.title.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q) ||
          who.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.claim?.claimedAt ?? 0) - (a.claim?.claimedAt ?? 0));
  }, [data.soloClaims, search, filter]);

  function exportCsv() {
    const lines: string[] = ["Type;Projet;Etudiant/Groupe;Membres;Reserve_le"];
    for (const p of SOLO_PROJECTS) {
      const c = data.soloClaims[p.id];
      if (c) lines.push(`Solo;${p.title};${c.firstName} ${c.lastName};1;${fmt(c.claimedAt)}`);
    }
    for (const g of data.groups) {
      const proj = GROUP_PROJECTS.find((x) => x.id === g.projectId);
      const members = g.members.map((m) => `${m.firstName} ${m.lastName}`).join(" / ");
      lines.push(`Groupe;${proj?.title ?? "(aucun)"};${g.name};"${members}";${fmt(g.createdAt)}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studeasy-projets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-5">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Console enseignant · en direct
          </div>
          <h1 className="display-tight text-4xl font-extrabold sm:text-5xl">Dashboard admin</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
          >
            ↓ Exporter CSV
          </button>
          <Link
            href="/"
            className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper2"
          >
            Voir le site
          </Link>
          <button
            onClick={onLogout}
            className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold text-ink-soft transition hover:text-ink"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={`${takenCount}/${total}`} label="Projets perso pris" />
        <StatCard value={total - takenCount} label="Projets perso libres" tone="lime" />
        <StatCard value={`${data.groups.length}`} label="Groupes inscrits" />
        <StatCard value={data.assignments.length} label="Devoirs créés" tone="lime" />
      </div>

      <section className="mb-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-paper rounded-[18px] p-6 shadow-hard">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Bandeau dynamique
          </div>
          <h2 className="display-tight text-2xl font-bold">Texte affiché en haut du tableau</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Une ligne = un message. Le bandeau étudiant n&apos;affiche plus le texte en dur.
          </p>
          <textarea
            value={tickerText}
            onChange={(e) => setTickerText(e.target.value)}
            className="mt-4 min-h-[220px] w-full rounded-[18px] border-[1.5px] border-ink bg-card px-4 py-3 text-sm outline-none focus:shadow-hard-sm"
            placeholder={"Bienvenue sur StudEasy\nProjet final en ligne\nRendu vendredi 18h"}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() =>
                act(
                  {
                    action: "updateTicker",
                    items: tickerText.split("\n").map((item) => item.trim()).filter(Boolean),
                  },
                  "Bandeau mis à jour"
                )
              }
              className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
            >
              Enregistrer le bandeau
            </button>
            <button
              disabled={busy}
              onClick={() => setTickerText("")}
              className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2 disabled:opacity-50"
            >
              Vider l&apos;éditeur
            </button>
          </div>
        </div>

        <div className="card-paper rounded-[18px] p-6 shadow-hard">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Devoirs
          </div>
          <h2 className="display-tight text-2xl font-bold">Créer un nouveau devoir</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={assignmentDraft.title}
              onChange={(e) =>
                setAssignmentDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Titre du devoir"
              className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
            />
            <textarea
              value={assignmentDraft.description}
              onChange={(e) =>
                setAssignmentDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Consigne, contexte, ce qui est attendu..."
              className="min-h-[120px] rounded-[18px] border-[1.5px] border-ink bg-card px-3 py-3 text-sm outline-none focus:shadow-hard-sm"
            />
            <input
              value={assignmentDraft.expectedFormat}
              onChange={(e) =>
                setAssignmentDraft((prev) => ({ ...prev, expectedFormat: e.target.value }))
              }
              placeholder="Format attendu"
              className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
            />
            <button
              disabled={busy || !assignmentDraft.title.trim()}
              onClick={async () => {
                const ok = await act(
                  { action: "createAssignment", ...assignmentDraft },
                  "Devoir créé"
                );
                if (ok) {
                  setAssignmentDraft({
                    title: "",
                    description: "",
                    expectedFormat: "Snippet de code + explication",
                  });
                }
              }}
              className="rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              Créer le devoir
            </button>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 display-tight text-2xl font-bold">Devoirs publiés</h2>
        {data.assignments.length === 0 ? (
          <EmptyState text="Aucun devoir créé pour l'instant." />
        ) : (
          <div className="grid gap-3">
            {data.assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                busy={busy}
                editing={editingId === assignment.id}
                onEdit={() => setEditingId(assignment.id)}
                onClose={() => setEditingId(null)}
                onDelete={() =>
                  act(
                    { action: "deleteAssignment", assignmentId: assignment.id },
                    "Devoir supprimé"
                  )
                }
                onSave={(next) =>
                  act(
                    { action: "updateAssignment", assignmentId: assignment.id, ...next },
                    "Devoir mis à jour"
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="display-tight text-2xl font-bold">
            Choix individuels{" "}
            <span className="font-mono text-sm font-normal text-ink-faint">({takenCount} réservés)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-48 rounded-full border-[1.5px] border-ink bg-card py-2 pl-8 pr-3 text-sm outline-none focus:shadow-hard-sm"
              />
            </div>
            <div className="flex gap-1 rounded-full border-[1.5px] border-ink bg-card p-1">
              {(["all", "taken", "free"] as SoloFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === f ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {f === "all" ? "Tous" : f === "taken" ? "Pris" : "Libres"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-card shadow-hard">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-[1.5px] border-ink bg-paper2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Étudiant</th>
                <th className="px-4 py-3">Réservé le</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map(({ p, claim }) => (
                  <motion.tr
                    key={p.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-ink/10 last:border-0 hover:bg-paper2/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink-faint">
                      /{String(p.number).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mr-1.5">{p.emoji}</span>
                      <span className="font-semibold">{p.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      {claim ? (
                        <span className="rounded-full border-[1.5px] border-ink bg-vermilion px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-paper">
                          Pris
                        </span>
                      ) : (
                        <span className="rounded-full border-[1.5px] border-ink bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
                          Libre
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {claim ? (
                        <strong>
                          {claim.firstName} {claim.lastName}
                        </strong>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {claim ? fmt(claim.claimedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {claim ? (
                        <button
                          disabled={busy}
                          onClick={() =>
                            act({ action: "releaseSolo", projectId: p.id }, `« ${p.title} » libéré`)
                          }
                          className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold transition hover:bg-vermilion hover:text-paper disabled:opacity-50"
                        >
                          Libérer
                        </button>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="Aucun résultat" compact />}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 display-tight text-2xl font-bold">
          Groupes{" "}
          <span className="font-mono text-sm font-normal text-ink-faint">
            ({data.groups.length} · {groupsWithProject} avec projet)
          </span>
        </h2>

        {data.groups.length === 0 ? (
          <EmptyState text="Aucun groupe inscrit" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {data.groups.map((g) => {
                const proj = GROUP_PROJECTS.find((x) => x.id === g.projectId);
                return (
                  <motion.div
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="card-paper rounded-[14px] p-4 shadow-hard-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="display-tight text-lg font-bold leading-tight">{g.name}</h3>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                          {g.members.length} membres · {fmt(g.createdAt)}
                        </div>
                      </div>
                      {proj ? (
                        <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-lime px-2.5 py-1 text-xs font-semibold text-ink">
                          {proj.emoji} {proj.title}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border-[1.5px] border-ink/30 px-2.5 py-1 text-xs text-ink-faint">
                          Pas de projet
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        Membres ({g.members.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.members.map((m, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper2 px-2 py-0.5 text-xs text-ink-soft"
                          >
                            <span className="font-mono text-[9px] text-ink-faint">{i + 1}</span>
                            {m.firstName} {m.lastName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-ink/10 pt-3">
                      {proj && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            act({ action: "resetGroupProject", groupId: g.id }, "Projet du groupe retiré")
                          }
                          className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold transition hover:bg-paper2 disabled:opacity-50"
                        >
                          Retirer le projet
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => act({ action: "deleteGroup", groupId: g.id }, "Groupe supprimé")}
                        className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="rounded-[14px] border-[1.5px] border-vermilion bg-vermilion/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-vermilion">Zone sensible</h3>
            <p className="text-sm text-ink-soft">
              Réinitialise les projets, les groupes, les notes, les devoirs et les rendus.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Tout réinitialiser ? Cette action est irréversible.")) {
                act({ action: "resetAll" }, "Tableau réinitialisé");
              }
            }}
            className="rounded-full border-[1.5px] border-vermilion bg-vermilion px-4 py-2 text-sm font-bold text-paper transition hover:border-ink hover:bg-ink disabled:opacity-50"
          >
            Tout réinitialiser
          </button>
        </div>
      </section>
    </div>
  );
}

function AssignmentCard({
  assignment,
  busy,
  editing,
  onEdit,
  onClose,
  onDelete,
  onSave,
}: {
  assignment: Assignment;
  busy: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: (next: Omit<Assignment, "id" | "createdAt" | "updatedAt">) => void;
}) {
  const [draft, setDraft] = useState({
    title: assignment.title,
    description: assignment.description,
    expectedFormat: assignment.expectedFormat,
    isOpen: assignment.isOpen,
  });

  useEffect(() => {
    setDraft({
      title: assignment.title,
      description: assignment.description,
      expectedFormat: assignment.expectedFormat,
      isOpen: assignment.isOpen,
    });
  }, [assignment]);

  return (
    <div className="card-paper rounded-[18px] p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {assignment.isOpen ? "Ouvert" : "Fermé"} · {fmt(assignment.updatedAt)}
          </div>
          <h3 className="display-tight text-xl font-bold">{assignment.title}</h3>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button
              onClick={onEdit}
              className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2"
            >
              Modifier
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2"
            >
              Fermer
            </button>
          )}
          <button
            disabled={busy}
            onClick={onDelete}
            className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[120px] rounded-[18px] border-[1.5px] border-ink bg-card px-3 py-3 text-sm outline-none focus:shadow-hard-sm"
          />
          <input
            value={draft.expectedFormat}
            onChange={(e) => setDraft((prev) => ({ ...prev, expectedFormat: e.target.value }))}
            className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
          />
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={draft.isOpen}
              onChange={(e) => setDraft((prev) => ({ ...prev, isOpen: e.target.checked }))}
            />
            Devoir ouvert aux étudiants
          </label>
          <button
            disabled={busy}
            onClick={() => onSave(draft)}
            className="w-fit rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{assignment.description}</p>
          <div className="mt-3 rounded-xl border-[1.5px] border-ink bg-paper2/60 px-3 py-2 text-sm">
            Format attendu : <strong>{assignment.expectedFormat}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
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
      <div className="display-tight text-3xl font-extrabold sm:text-4xl">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-[14px] border-[1.5px] border-dashed border-ink/30 bg-card/50 text-center font-mono text-xs uppercase tracking-widest text-ink-faint ${
        compact ? "py-6" : "py-10"
      }`}
    >
      {text}
    </div>
  );
}

function fmt(ts: number): string {
  try {
    return new Date(ts).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
