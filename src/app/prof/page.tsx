"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";
import { AuthedPage } from "@/components/AuthedPage";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import type { Student } from "@/lib/useAuth";

type ClassSummary = {
  id: string;
  name: string;
  description: string;
  school: string;
  logo: string;
  accessCode: string;
  studentCount?: number;
  createdAt: number;
};

type Overview = {
  classInfo: ClassSummary;
  students: { id: string; firstName: string; lastName: string; email: string; createdAt: number }[];
  soloClaims: Record<string, { projectId: string; firstName: string; lastName: string }>;
  groups: { id: string; name: string; members: { firstName: string; lastName: string }[]; projectId: string | null }[];
  assignments: {
    id: string;
    title: string;
    description: string;
    expectedFormat: string;
    isOpen: boolean;
    submissionCount: number;
  }[];
};

export default function Page() {
  return (
    <AuthedPage next="/prof">{(student) => <TeacherGate student={student} />}</AuthedPage>
  );
}

function TeacherGate({ student }: { student: Student }) {
  const router = useRouter();
  useEffect(() => {
    if (student.role !== "teacher") router.replace("/dashboard");
  }, [student.role, router]);
  if (student.role !== "teacher") return null;
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />
      <TeacherDashboard firstName={student.firstName} />
    </main>
  );
}

function TeacherDashboard({ firstName }: { firstName: string }) {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadClasses = useCallback(async () => {
    const res = await apiFetch("/api/teacher/class");
    const json = await res.json();
    if (res.ok) {
      setClasses(json.classes);
      setSelectedId((cur) => cur ?? json.classes[0]?.id ?? null);
    }
    setLoading(false);
  }, []);

  const loadOverview = useCallback(async (classId: string) => {
    const res = await apiFetch(`/api/teacher/overview?classId=${classId}`);
    const json = await res.json();
    if (res.ok) setOverview(json);
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedId) loadOverview(selectedId);
  }, [selectedId, loadOverview]);

  async function action(body: Record<string, unknown>, okMsg?: string) {
    const res = await apiFetch("/api/teacher/action", {
      method: "POST",
      body: JSON.stringify({ ...body, classId: selectedId }),
    });
    const json = await res.json();
    if (res.ok) {
      if (okMsg) toast(okMsg, "success");
      if (selectedId) await loadOverview(selectedId);
      await loadClasses();
    } else {
      toast(json.error ?? "Action impossible.", "error");
    }
    return json;
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center font-mono text-xs uppercase tracking-widest text-ink-faint">
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace enseignant
        </div>
        <h1 className="display-tight text-[clamp(2.2rem,6vw,4rem)] font-extrabold">
          Bonjour {firstName} 🧑‍🏫
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Crée et gère tes promos : partage le code d&apos;accès, publie des devoirs et suis
          l&apos;avancement de chaque étudiant.
        </p>
      </motion.div>

      {classes.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-full border-[1.5px] border-ink px-4 py-2 text-sm font-semibold transition ${
                selectedId === c.id ? "bg-ink text-paper" : "bg-card hover:bg-paper2"
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            {creating ? "× Fermer" : "+ Nouvelle promo"}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {classes.length === 0 || creating ? (
          <CreateClassForm
            key="create"
            firstTime={classes.length === 0}
            onCreated={async (id) => {
              setCreating(false);
              await loadClasses();
              setSelectedId(id);
            }}
          />
        ) : overview ? (
          <ClassOverview key={overview.classInfo.id} overview={overview} action={action} />
        ) : (
          <div className="py-20 text-center font-mono text-xs uppercase tracking-widest text-ink-faint">
            Chargement de la promo…
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Création de promo ---------------- */

function CreateClassForm({
  firstTime,
  onCreated,
}: {
  firstTime: boolean;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400000) {
      toast("Logo trop lourd (max ~400 Ko). Choisis une image plus légère.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/api/teacher/class", {
        method: "POST",
        body: JSON.stringify({ name, school, description, logo }),
      });
      const json = await res.json();
      if (res.ok) {
        toast(`Promo « ${json.class.name} » créée ✦`, "success");
        onCreated(json.class.id);
      } else {
        toast(json.error ?? "Création impossible.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      onSubmit={submit}
      className="card-paper rounded-[20px] p-7 shadow-hard"
    >
      <h2 className="display-tight text-2xl font-extrabold">
        {firstTime ? "Crée ta première promo" : "Nouvelle promo"}
      </h2>
      <p className="mb-6 mt-1 text-sm text-ink-soft">
        Un code d&apos;accès unique sera généré : transmets-le à tes étudiants pour qu&apos;ils
        rejoignent la promo à l&apos;inscription.
      </p>

      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] border-[1.5px] border-dashed border-ink bg-paper2 text-center transition hover:bg-card"
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-xs font-semibold text-ink-soft">
                📷<br />Ajouter un logo
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
        </div>

        <div className="grid gap-3">
          <Field label="Nom de la promo" value={name} onChange={setName} placeholder="Ex. Master 1 Dev Web 2026" />
          <Field label="École / établissement" value={school} onChange={setSchool} placeholder="Ex. Epitech" />
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectifs, contexte, infos pratiques…"
              className="min-h-[90px] w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 rounded-full border-[1.5px] border-ink bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
      >
        {busy ? "Création…" : "Créer la promo →"}
      </button>
    </motion.form>
  );
}

/* ---------------- Vue d'une promo ---------------- */

function ClassOverview({
  overview,
  action,
}: {
  overview: Overview;
  action: (body: Record<string, unknown>, okMsg?: string) => Promise<{ accessCode?: string }>;
}) {
  const toast = useToast();
  const { classInfo, students, soloClaims, groups, assignments } = overview;
  const soloTaken = Object.keys(soloClaims).length;

  function copyCode() {
    navigator.clipboard?.writeText(classInfo.accessCode);
    toast("Code copié ✦", "success");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* Carte promo */}
      <div className="card-paper mb-6 flex flex-wrap items-center gap-5 rounded-[20px] p-6 shadow-hard">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper2 text-3xl">
          {classInfo.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={classInfo.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            "🎓"
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="display-tight text-3xl font-extrabold leading-none">{classInfo.name}</h2>
          {classInfo.school && <p className="mt-1 text-sm text-ink-soft">{classInfo.school}</p>}
          {classInfo.description && (
            <p className="mt-1 text-sm text-ink-soft">{classInfo.description}</p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <div className="rounded-xl border-[1.5px] border-ink bg-lime px-4 py-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">
              Code promo
            </div>
            <div className="display-tight text-2xl font-extrabold tracking-widest">
              {classInfo.accessCode}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2"
            >
              Copier
            </button>
            <button
              onClick={() => {
                if (confirm("Régénérer le code ? L'ancien ne fonctionnera plus.")) {
                  action({ action: "regenerateCode" }, "Nouveau code généré");
                }
              }}
              className="flex-1 rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2"
            >
              Régénérer
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={students.length} label="Étudiants" tone="lime" />
        <Stat value={`${soloTaken}/${SOLO_PROJECTS.length}`} label="Projets perso pris" />
        <Stat value={groups.length} label="Groupes" />
        <Stat value={assignments.length} label="Devoirs publiés" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentsPanel students={students} action={action} />
        <AssignmentsPanel assignments={assignments} action={action} />
      </div>

      <BoardPanel soloClaims={soloClaims} groups={groups} action={action} />
    </motion.div>
  );
}

function StudentsPanel({
  students,
  action,
}: {
  students: Overview["students"];
  action: (body: Record<string, unknown>, okMsg?: string) => Promise<unknown>;
}) {
  return (
    <section className="card-paper rounded-[18px] p-5 shadow-hard">
      <h3 className="display-tight mb-3 text-xl font-bold">
        Étudiants <span className="font-mono text-sm text-ink-faint">({students.length})</span>
      </h3>
      {students.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-8 text-center text-sm text-ink-faint">
          Aucun étudiant inscrit. Partage le code promo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {students.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {s.firstName} {s.lastName}
                </div>
                <div className="truncate font-mono text-[10px] text-ink-faint">{s.email}</div>
              </div>
              <button
                onClick={() =>
                  confirm(`Retirer ${s.firstName} de la promo ?`) &&
                  action({ action: "removeStudent", studentId: s.id }, "Étudiant retiré")
                }
                className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AssignmentsPanel({
  assignments,
  action,
}: {
  assignments: Overview["assignments"];
  action: (body: Record<string, unknown>, okMsg?: string) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedFormat, setExpectedFormat] = useState("");
  const [open, setOpen] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    await action({ action: "createAssignment", title, description, expectedFormat }, "Devoir publié");
    setTitle("");
    setDescription("");
    setExpectedFormat("");
    setOpen(false);
  }

  return (
    <section className="card-paper rounded-[18px] p-5 shadow-hard">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="display-tight text-xl font-bold">
          Devoirs <span className="font-mono text-sm text-ink-faint">({assignments.length})</span>
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border-[1.5px] border-ink bg-lime px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-ink hover:text-paper"
        >
          {open ? "× Annuler" : "+ Publier"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={create}
            className="mb-4 grid gap-2 overflow-hidden"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du devoir"
              className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Consigne / description"
              className="min-h-[70px] rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
            />
            <input
              value={expectedFormat}
              onChange={(e) => setExpectedFormat(e.target.value)}
              placeholder="Format attendu (ex. snippet JS + explication)"
              className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
            />
            <button
              type="submit"
              className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink"
            >
              Publier le devoir →
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {assignments.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-8 text-center text-sm text-ink-faint">
          Aucun devoir publié.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignments.map((a) => (
            <li key={a.id} className="rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{a.title}</div>
                  <div className="font-mono text-[10px] text-ink-faint">
                    {a.submissionCount} rendu{a.submissionCount > 1 ? "s" : ""} ·{" "}
                    {a.isOpen ? "ouvert" : "fermé"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() =>
                      action(
                        {
                          action: "updateAssignment",
                          assignmentId: a.id,
                          title: a.title,
                          description: a.description,
                          expectedFormat: a.expectedFormat,
                          isOpen: !a.isOpen,
                        },
                        a.isOpen ? "Devoir fermé" : "Devoir rouvert"
                      )
                    }
                    className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-paper2"
                  >
                    {a.isOpen ? "Fermer" : "Ouvrir"}
                  </button>
                  <button
                    onClick={() =>
                      confirm("Supprimer ce devoir et ses rendus ?") &&
                      action({ action: "deleteAssignment", assignmentId: a.id }, "Devoir supprimé")
                    }
                    className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
                  >
                    Suppr
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BoardPanel({
  soloClaims,
  groups,
  action,
}: {
  soloClaims: Overview["soloClaims"];
  groups: Overview["groups"];
  action: (body: Record<string, unknown>, okMsg?: string) => Promise<unknown>;
}) {
  const claimed = SOLO_PROJECTS.filter((p) => soloClaims[p.id]);
  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card-paper rounded-[18px] p-5 shadow-hard">
        <h3 className="display-tight mb-3 text-xl font-bold">
          Projets perso pris{" "}
          <span className="font-mono text-sm text-ink-faint">({claimed.length})</span>
        </h3>
        {claimed.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-8 text-center text-sm text-ink-faint">
            Aucun projet réservé pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claimed.map((p) => {
              const c = soloClaims[p.id];
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2 text-sm"
                >
                  <span>
                    {p.emoji} <strong>{p.title}</strong> —{" "}
                    <span className="text-ink-soft">
                      {c.firstName} {c.lastName}
                    </span>
                  </span>
                  <button
                    onClick={() =>
                      action({ action: "releaseSolo", projectId: p.id }, "Projet libéré")
                    }
                    className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-vermilion hover:text-paper"
                  >
                    Libérer
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card-paper rounded-[18px] p-5 shadow-hard">
        <h3 className="display-tight mb-3 text-xl font-bold">
          Groupes <span className="font-mono text-sm text-ink-faint">({groups.length})</span>
        </h3>
        {groups.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-8 text-center text-sm text-ink-faint">
            Aucun groupe créé.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map((g) => {
              const proj = GROUP_PROJECTS.find((p) => p.id === g.projectId);
              return (
                <li key={g.id} className="rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <button
                      onClick={() =>
                        confirm(`Supprimer le groupe ${g.name} ?`) &&
                        action({ action: "deleteGroup", groupId: g.id }, "Groupe supprimé")
                      }
                      className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
                    >
                      Suppr
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    {proj ? `${proj.emoji} ${proj.title}` : "Pas de projet"} ·{" "}
                    {g.members.map((m) => `${m.firstName} ${m.lastName}`).join(", ")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
      />
    </label>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "lime" }) {
  return (
    <div
      className={`rounded-[14px] border-[1.5px] border-ink p-4 shadow-hard-sm ${
        tone === "lime" ? "bg-lime" : "bg-card"
      }`}
    >
      <div className="display-tight text-3xl font-extrabold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}
