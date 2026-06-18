"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PageSkeleton, Skeleton } from "@/components/Skeleton";
import { ToastProvider, useToast } from "@/components/Toast";
import { fmtDateTime } from "@/lib/format";

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
      {!ready ? <PageSkeleton /> : key ? <Console adminKey={key} onLogout={logout} /> : <Login onAuth={setKey} />}
    </main>
  );
}

/* ---------------- Login ---------------- */

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
        toast("Bienvenue dans la console plateforme ✦", "success");
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
          Console plateforme
        </div>
        <h1 className="display-tight text-3xl font-extrabold">Super-admin</h1>
        <p className="mb-6 mt-1.5 text-sm text-ink-soft">
          Supervise toutes les promos, enseignants et étudiants de StudEasy.
        </p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe admin"
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

/* ---------------- Console ---------------- */

type AdminClass = {
  id: string;
  name: string;
  school: string;
  logo: string;
  accessCode: string;
  teacher: string;
  teacherEmail: string;
  studentCount: number;
  groupCount: number;
  assignmentCount: number;
  createdAt: number;
};

function Console({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const toast = useToast();
  const [stats, setStats] = useState({ classes: 0, students: 0, teachers: 0 });
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview", { headers: { "x-admin-key": adminKey } });
    if (res.status === 401) {
      toast("Session expirée.", "error");
      onLogout();
      return;
    }
    const json = await res.json();
    if (res.ok) {
      setStats(json.stats);
      setClasses(json.classes);
    }
    setLoading(false);
  }, [adminKey, onLogout, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(body: Record<string, unknown>, okMsg: string) {
    const res = await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast(okMsg, "success");
      await load();
    } else {
      toast("Action impossible.", "error");
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-5">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Console plateforme
          </div>
          <h1 className="display-tight text-4xl font-extrabold sm:text-5xl">Super-admin</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2"
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

      <div className="mb-10 grid grid-cols-3 gap-3">
        <Stat value={stats.classes} label="Promos" />
        <Stat value={stats.teachers} label="Enseignants" tone="lime" />
        <Stat value={stats.students} label="Étudiants" tone="lime" />
      </div>

      <h2 className="display-tight mb-4 text-2xl font-bold">Toutes les promos</h2>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-paper rounded-[16px] p-4 shadow-hard-sm">
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-2 h-3 w-32" />
                  <Skeleton className="mt-2 h-3 w-48" />
                </div>
              </div>
              <Skeleton className="mt-4 h-12 w-full" />
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-[14px] border-[1.5px] border-dashed border-ink/30 bg-card/50 py-12 text-center font-mono text-xs uppercase tracking-widest text-ink-faint">
          Aucune promo créée
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {classes.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="card-paper rounded-[16px] p-4 shadow-hard-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper2 text-xl">
                    {c.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🎓"
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="display-tight truncate text-lg font-bold leading-tight">
                      {c.name}
                    </h3>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      {c.school || "—"} · code {c.accessCode}
                    </div>
                    <div className="mt-1 text-xs text-ink-soft">
                      {c.teacher} · {c.teacherEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3 text-xs text-ink-soft">
                  <span className="rounded-full bg-paper2 px-2 py-0.5">{c.studentCount} 👤</span>
                  <span className="rounded-full bg-paper2 px-2 py-0.5">{c.groupCount} groupes</span>
                  <span className="rounded-full bg-paper2 px-2 py-0.5">{c.assignmentCount} devoirs</span>
                  <span className="ml-auto font-mono text-[10px] text-ink-faint">
                    {fmtDateTime(c.createdAt)}
                  </span>
                  <button
                    onClick={() =>
                      confirm(`Supprimer la promo « ${c.name} » ? Les étudiants seront détachés.`) &&
                      action({ action: "deleteClass", classId: c.id }, "Promo supprimée")
                    }
                    className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 font-semibold transition hover:bg-vermilion hover:text-paper"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <section className="mt-12 rounded-[14px] border-[1.5px] border-vermilion bg-vermilion/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-vermilion">Zone sensible</h3>
            <p className="text-sm text-ink-soft">
              Réinitialise toute la plateforme : promos, comptes, projets, devoirs. Irréversible.
            </p>
          </div>
          <button
            onClick={() =>
              confirm("TOUT réinitialiser (comptes inclus) ? Action irréversible.") &&
              action({ action: "resetAll" }, "Plateforme réinitialisée")
            }
            className="rounded-full border-[1.5px] border-vermilion bg-vermilion px-4 py-2 text-sm font-bold text-paper transition hover:border-ink hover:bg-ink"
          >
            Tout réinitialiser
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "lime" }) {
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
