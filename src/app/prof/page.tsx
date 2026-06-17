"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";
import { AuthedPage } from "@/components/AuthedPage";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { useCountdown, formatRemaining } from "@/lib/useCountdown";
import type { Student } from "@/lib/useAuth";
import type { WorkKind, CourseKind } from "@/lib/useStore";

const KIND_LABEL: Record<WorkKind, string> = {
  code: "💻 Informatique",
  redaction: "✍️ Rédaction",
  autre: "📋 Autre",
};

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
    id: string; title: string; description: string; expectedFormat: string;
    kind: WorkKind; dueDate: number | null; isOpen: boolean; submissionCount: number;
  }[];
  interrogations: {
    id: string; title: string; instructions: string; kind: WorkKind; durationMinutes: number;
    status: "draft" | "running" | "ended"; startedAt: number | null; endsAt: number | null; submissionCount: number;
  }[];
  sessions: { id: string; date: number; title: string; description: string }[];
  courses: {
    id: string; sessionId: string | null; title: string; kind: CourseKind;
    summary: string; fileName: string; url: string; hasFile: boolean; createdAt: number;
  }[];
};

type Action = (body: Record<string, unknown>, okMsg?: string) => Promise<{ accessCode?: string }>;

const SECTIONS = [
  { key: "overview", label: "Vue d'ensemble", icon: "📊" },
  { key: "students", label: "Étudiants", icon: "👥" },
  { key: "assignments", label: "Devoirs", icon: "📦" },
  { key: "interros", label: "Interrogations", icon: "⏱️" },
  { key: "agenda", label: "Agenda", icon: "🗓️" },
  { key: "courses", label: "Cours", icon: "📚" },
  { key: "settings", label: "Réglages", icon: "⚙️" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Page() {
  return <AuthedPage next="/prof">{(student) => <TeacherGate student={student} />}</AuthedPage>;
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
  const [section, setSection] = useState<SectionKey>("overview");

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
    if (!selectedId) return;
    loadOverview(selectedId);
    const id = setInterval(() => loadOverview(selectedId), 5000);
    return () => clearInterval(id);
  }, [selectedId, loadOverview]);

  const action: Action = async (body, okMsg) => {
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
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center font-mono text-xs uppercase tracking-widest text-ink-faint">
        Chargement…
      </div>
    );
  }

  if (classes.length === 0 || creating) {
    return (
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
        <Welcome firstName={firstName} />
        <CreateClassForm
          firstTime={classes.length === 0}
          onCancel={classes.length > 0 ? () => setCreating(false) : undefined}
          onCreated={async (id) => {
            setCreating(false);
            await loadClasses();
            setSelectedId(id);
            setSection("overview");
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[320px_1fr]">
      <Sidebar
        classes={classes}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSection("overview");
        }}
        onNew={() => setCreating(true)}
        overview={overview}
        section={section}
        setSection={setSection}
      />
      <div className="min-w-0">
        {overview ? (
          <SectionContent section={section} overview={overview} action={action} setSection={setSection} />
        ) : (
          <div className="py-20 text-center font-mono text-xs uppercase tracking-widest text-ink-faint">
            Chargement de la promo…
          </div>
        )}
      </div>
    </div>
  );
}

function Welcome({ firstName }: { firstName: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
        Espace enseignant
      </div>
      <h1 className="display-tight text-[clamp(2.2rem,6vw,3.5rem)] font-extrabold">
        Bonjour {firstName} 🧑‍🏫
      </h1>
    </motion.div>
  );
}

/* ---------------- Sidebar ---------------- */

function Sidebar({
  classes,
  selectedId,
  onSelect,
  onNew,
  overview,
  section,
  setSection,
}: {
  classes: ClassSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  overview: Overview | null;
  section: SectionKey;
  setSection: (s: SectionKey) => void;
}) {
  const info = overview?.classInfo;
  return (
    <aside className="lg:sticky lg:top-6 lg:h-fit">
      <div className="card-paper rounded-[18px] p-5 shadow-hard">
        {/* Sélecteur de promo */}
        {classes.length > 1 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => onSelect(e.target.value)}
            className="mb-3 w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm font-semibold outline-none"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {info && (
          <div className="mb-4 flex items-center gap-3 border-b-[1.5px] border-ink/10 pb-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border-[1.5px] border-ink bg-paper2 text-xl">
              {info.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                "🎓"
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate font-bold leading-tight">{info.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Code {info.accessCode}
              </div>
            </div>
          </div>
        )}

        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition lg:w-full ${
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper2 hover:text-ink"
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onNew}
          className="mt-3 w-full rounded-xl border-[1.5px] border-ink bg-lime px-3 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper"
        >
          + Nouvelle promo
        </button>
      </div>
    </aside>
  );
}

/* ---------------- Routeur de sections ---------------- */

function SectionContent({
  section,
  overview,
  action,
  setSection,
}: {
  section: SectionKey;
  overview: Overview;
  action: Action;
  setSection: (s: SectionKey) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        {section === "overview" && <OverviewSection overview={overview} action={action} setSection={setSection} />}
        {section === "students" && <StudentsPanel students={overview.students} action={action} />}
        {section === "assignments" && <AssignmentsPanel assignments={overview.assignments} action={action} />}
        {section === "interros" && <InterrosPanel interrogations={overview.interrogations} action={action} />}
        {section === "agenda" && <AgendaPanel sessions={overview.sessions} courses={overview.courses} action={action} />}
        {section === "courses" && <CoursesPanel courses={overview.courses} sessions={overview.sessions} action={action} />}
        {section === "settings" && <SettingsPanel classInfo={overview.classInfo} action={action} />}
      </motion.div>
    </AnimatePresence>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="display-tight text-3xl font-extrabold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

/* ---------------- Vue d'ensemble ---------------- */

function OverviewSection({
  overview,
  action,
  setSection,
}: {
  overview: Overview;
  action: Action;
  setSection: (s: SectionKey) => void;
}) {
  const { classInfo, students, soloClaims, groups, assignments, interrogations, sessions } = overview;
  const soloTaken = Object.keys(soloClaims).length;
  const running = interrogations.filter((i) => i.status === "running").length;

  return (
    <div>
      <SectionTitle title={classInfo.name} sub={classInfo.school || "Vue d'ensemble de la promo"} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={students.length} label="Étudiants" tone="lime" />
        <Stat value={`${soloTaken}/${SOLO_PROJECTS.length}`} label="Projets perso" />
        <Stat value={groups.length} label="Groupes" />
        <Stat value={assignments.length} label="Devoirs" />
        <Stat value={running} label="Interros en cours" tone={running ? "lime" : undefined} />
        <Stat value={sessions.length} label="Séances" />
      </div>
      <BoardPanel soloClaims={soloClaims} groups={groups} action={action} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Quick label="Publier un devoir" onClick={() => setSection("assignments")} />
        <Quick label="Lancer une interro" onClick={() => setSection("interros")} />
        <Quick label="Ajouter un cours" onClick={() => setSection("courses")} />
      </div>
    </div>
  );
}

function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-lime"
    >
      {label} →
    </button>
  );
}

/* ---------------- Étudiants ---------------- */

function StudentsPanel({
  students,
  action,
}: {
  students: Overview["students"];
  action: Action;
}) {
  return (
    <div>
      <SectionTitle title="Étudiants" sub={`${students.length} inscrit${students.length > 1 ? "s" : ""} dans la promo`} />
      {students.length === 0 ? (
        <Empty text="Aucun étudiant inscrit. Partage le code promo (onglet Réglages)." />
      ) : (
        <div className="grid gap-2">
          {students.map((s) => (
            <div
              key={s.id}
              className="card-paper flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 shadow-hard-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-lime font-mono text-[11px] font-bold text-ink">
                  {s.firstName.charAt(0)}
                  {s.lastName.charAt(0)}
                </span>
                <div>
                  <div className="text-sm font-semibold">
                    {s.firstName} {s.lastName}
                  </div>
                  <div className="font-mono text-[10px] text-ink-faint">{s.email}</div>
                </div>
              </div>
              <button
                onClick={() =>
                  confirm(`Retirer ${s.firstName} de la promo ?`) &&
                  action({ action: "removeStudent", studentId: s.id }, "Étudiant retiré")
                }
                className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Devoirs ---------------- */

function AssignmentsPanel({
  assignments,
  action,
}: {
  assignments: Overview["assignments"];
  action: Action;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedFormat, setExpectedFormat] = useState("");
  const [kind, setKind] = useState<WorkKind>("code");
  const [due, setDue] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    await action(
      { action: "createAssignment", title, description, expectedFormat, kind, dueDate: due ? new Date(due).getTime() : null },
      "Devoir publié"
    );
    setTitle(""); setDescription(""); setExpectedFormat(""); setKind("code"); setDue(""); setOpen(false);
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <SectionTitle title="Devoirs" sub="Publie des devoirs à rendre avant une date limite." />
        <button onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper">
          {open ? "× Annuler" : "+ Publier"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={create} className="card-paper mb-5 grid gap-2 overflow-hidden rounded-[16px] p-4 shadow-hard-sm">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du devoir" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Consigne / description" className="min-h-[70px] rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <input value={expectedFormat} onChange={(e) => setExpectedFormat(e.target.value)} placeholder="Format attendu (ex. snippet JS + explication)" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as WorkKind)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none">
                <option value="code">💻 Informatique</option>
                <option value="redaction">✍️ Rédaction</option>
                <option value="autre">📋 Autre</option>
              </select>
              <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none" />
            </div>
            <button type="submit" className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink">Publier →</button>
          </motion.form>
        )}
      </AnimatePresence>

      {assignments.length === 0 ? (
        <Empty text="Aucun devoir publié." />
      ) : (
        <div className="grid gap-2">
          {assignments.map((a) => (
            <div key={a.id} className="card-paper rounded-[14px] px-4 py-3 shadow-hard-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{KIND_LABEL[a.kind].split(" ")[0]} {a.title}</div>
                  <div className="font-mono text-[10px] text-ink-faint">
                    {a.submissionCount} rendu{a.submissionCount > 1 ? "s" : ""} · {a.isOpen ? "ouvert" : "fermé"}
                    {a.dueDate ? ` · avant ${fmtDateTime(a.dueDate)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <button onClick={() => setDetailId(a.id)} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-lime">
                    Rendus
                  </button>
                  <button onClick={() => action({ action: "updateAssignment", assignmentId: a.id, title: a.title, description: a.description, expectedFormat: a.expectedFormat, kind: a.kind, dueDate: a.dueDate, isOpen: !a.isOpen }, a.isOpen ? "Devoir fermé" : "Devoir rouvert")} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-paper2">
                    {a.isOpen ? "Fermer" : "Ouvrir"}
                  </button>
                  <button onClick={() => confirm("Supprimer ce devoir et ses rendus ?") && action({ action: "deleteAssignment", assignmentId: a.id }, "Devoir supprimé")} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper">
                    Suppr
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubmissionsModal kind="assignment" id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

/* ---------------- Interrogations ---------------- */

function InterrosPanel({
  interrogations,
  action,
}: {
  interrogations: Overview["interrogations"];
  action: Action;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [kind, setKind] = useState<WorkKind>("code");
  const [duration, setDuration] = useState(30);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    await action({ action: "createInterro", title, instructions, kind, durationMinutes: duration }, "Interrogation créée");
    setTitle(""); setInstructions(""); setKind("code"); setDuration(30); setOpen(false);
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <SectionTitle title="Interrogations" sub="Contrôles chronométrés : lance, toute la classe a le même timer." />
        <button onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper">
          {open ? "× Annuler" : "+ Créer"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={create} className="card-paper mb-5 grid gap-2 overflow-hidden rounded-[16px] p-4 shadow-hard-sm">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'interrogation" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Énoncé / consignes" className="min-h-[80px] rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as WorkKind)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none">
                <option value="code">💻 Informatique</option>
                <option value="redaction">✍️ Rédaction</option>
                <option value="autre">📋 Autre</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm">
                <input type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-16 bg-transparent outline-none" />
                <span className="text-ink-soft">minutes</span>
              </label>
            </div>
            <button type="submit" className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink">Créer (brouillon) →</button>
          </motion.form>
        )}
      </AnimatePresence>

      {interrogations.length === 0 ? (
        <Empty text="Aucune interrogation. Crée-en une puis lance-la quand la classe est prête." />
      ) : (
        <div className="grid gap-2">
          {interrogations.map((i) => (
            <InterroRow key={i.id} interro={i} action={action} onDetail={() => setDetailId(i.id)} />
          ))}
        </div>
      )}

      <SubmissionsModal kind="interro" id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function InterroRow({
  interro,
  action,
  onDetail,
}: {
  interro: Overview["interrogations"][number];
  action: Action;
  onDetail: () => void;
}) {
  const remaining = useCountdown(interro.status === "running" ? interro.endsAt : null);
  const statusLabel =
    interro.status === "running"
      ? remaining > 0 ? `En cours · ${formatRemaining(remaining)}` : "Temps écoulé"
      : interro.status === "ended" ? "Terminée" : "Brouillon";

  return (
    <div className="card-paper rounded-[14px] px-4 py-3 shadow-hard-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{KIND_LABEL[interro.kind].split(" ")[0]} {interro.title}</div>
          <div className="font-mono text-[10px] text-ink-faint">
            {interro.durationMinutes} min · {interro.submissionCount} rendu{interro.submissionCount > 1 ? "s" : ""} ·{" "}
            <span className={interro.status === "running" ? "font-bold text-lime-deep" : ""}>{statusLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <button onClick={onDetail} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-lime">Rendus</button>
          {interro.status === "draft" && (
            <button onClick={() => action({ action: "launchInterro", interroId: interro.id }, "Interrogation lancée !")} className="rounded-full border-[1.5px] border-ink bg-lime px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-ink hover:text-paper">Lancer</button>
          )}
          {interro.status === "running" && (
            <button onClick={() => confirm("Terminer maintenant ?") && action({ action: "endInterro", interroId: interro.id }, "Interrogation terminée")} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-paper2">Terminer</button>
          )}
          <button onClick={() => confirm("Supprimer cette interro et ses rendus ?") && action({ action: "deleteInterro", interroId: interro.id }, "Interrogation supprimée")} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper">Suppr</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Détail des rendus ---------------- */

function SubmissionsModal({
  kind,
  id,
  onClose,
}: {
  kind: "assignment" | "interro";
  id: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ title: string; submissions: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    setLoading(true);
    const param = kind === "assignment" ? `assignmentId=${id}` : `interroId=${id}`;
    apiFetch(`/api/teacher/submissions?${param}`)
      .then((r) => r.json())
      .then((j) => setData(j.ok ? j : { title: "", submissions: [] }))
      .finally(() => setLoading(false));
  }, [id, kind]);

  return (
    <Modal open={Boolean(id)} onClose={onClose}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Rendus</div>
      <h3 className="display-tight mb-4 text-2xl font-extrabold">{data?.title ?? "…"}</h3>
      {loading ? (
        <p className="py-8 text-center font-mono text-xs uppercase tracking-widest text-ink-faint">Chargement…</p>
      ) : !data || data.submissions.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-10 text-center text-sm text-ink-faint">Aucun rendu pour le moment.</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto pr-1">
          {data.submissions.map((s, idx) => {
            const sub = s as { student: string; content: string; language?: string; submittedAt?: number | null; updatedAt: number };
            return (
              <div key={idx} className="rounded-xl border-[1.5px] border-ink bg-paper2/50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{sub.student}</span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {kind === "interro"
                      ? sub.submittedAt ? `Rendu ${fmtDateTime(sub.submittedAt)}` : "Brouillon"
                      : fmtDateTime(sub.updatedAt)}
                  </span>
                </div>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-ink p-3 font-mono text-xs text-paper">
                  {sub.content || "(vide)"}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Agenda ---------------- */

function AgendaPanel({
  sessions,
  courses,
  action,
}: {
  sessions: Overview["sessions"];
  courses: Overview["courses"];
  action: Action;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!date || title.trim().length < 2) return;
    await action({ action: "createSession", date: new Date(date).getTime(), title, description }, "Séance ajoutée");
    setDate(""); setTitle(""); setDescription(""); setOpen(false);
  }

  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  const monthStart = new Date(monthAnchor);
  const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const firstVisibleDay = new Date(monthStart);
  const dayOffset = (firstVisibleDay.getDay() + 6) % 7;
  firstVisibleDay.setDate(firstVisibleDay.getDate() - dayOffset);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const session of sorted) {
      const key = isoDay(session.date);
      const items = map.get(key) ?? [];
      items.push(session);
      map.set(key, items);
    }
    return map;
  }, [sorted]);

  const visibleDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDay);
    day.setDate(firstVisibleDay.getDate() + index);
    return day;
  });

  function openCreateForm(forDay?: Date) {
    if (forDay) {
      const preset = new Date(forDay);
      preset.setHours(9, 0, 0, 0);
      setDate(toDateTimeLocal(preset));
    }
    setOpen(true);
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <SectionTitle title="Agenda" sub="Le calendrier sert de base pour ajouter les séances de cours et rattacher les supports." />
        <button onClick={() => (open ? setOpen(false) : openCreateForm())} className="shrink-0 rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper">
          {open ? "× Annuler" : "+ Séance"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={create} className="card-paper mb-5 grid gap-2 overflow-hidden rounded-[16px] p-4 shadow-hard-sm">
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intitulé de la séance (ex. Introduction à React)" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails / programme de la séance" className="min-h-[70px] rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <button type="submit" className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink">Ajouter la séance →</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="card-paper mb-5 rounded-[18px] p-4 shadow-hard-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Calendrier</div>
            <h3 className="display-tight text-2xl font-extrabold capitalize">{monthLabel}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMonthAnchor(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).getTime())} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2">
              ← Mois précédent
            </button>
            <button onClick={() => setMonthAnchor(new Date().setDate(1))} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2">
              Aujourd&apos;hui
            </button>
            <button onClick={() => setMonthAnchor(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).getTime())} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2">
              Mois suivant →
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="px-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {visibleDays.map((day) => {
            const key = isoDay(day.getTime());
            const entries = sessionsByDay.get(key) ?? [];
            const inMonth = day.getMonth() === monthStart.getMonth();
            const isToday = key === isoDay(Date.now());
            return (
              <button
                key={key}
                type="button"
                onClick={() => openCreateForm(day)}
                className={`min-h-[148px] rounded-[16px] border-[1.5px] p-3 text-left shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-paper2 ${
                  inMonth ? "border-ink bg-card" : "border-ink/20 bg-paper2/60 text-ink-faint"
                } ${isToday ? "ring-2 ring-lime" : ""}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="display-tight text-xl font-extrabold">{day.getDate()}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    {day.toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                </div>
                <div className="space-y-2">
                  {entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-ink/20 px-2 py-2 text-xs text-ink-faint">
                      Ajouter une séance
                    </div>
                  ) : (
                    entries.slice(0, 3).map((session) => {
                      const count = courses.filter((c) => c.sessionId === session.id).length;
                      return (
                        <div key={session.id} className="rounded-xl border-[1.5px] border-ink bg-paper px-2 py-2">
                          <div className="truncate text-xs font-bold text-ink">{session.title}</div>
                          <div className="mt-1 font-mono text-[10px] text-ink-soft">
                            {new Date(session.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}{count} support{count > 1 ? "s" : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {entries.length > 3 && (
                    <div className="text-xs font-semibold text-ink-soft">+ {entries.length - 3} autre(s)</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {sorted.length === 0 ? <Empty text="Aucune séance planifiée." /> : (
        <div className="grid gap-2">
          {sorted.map((s) => {
            const count = courses.filter((c) => c.sessionId === s.id).length;
            return (
              <div key={s.id} className="card-paper flex items-center gap-4 rounded-[14px] px-4 py-3 shadow-hard-sm">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-lime text-center leading-none">
                  <div className="display-tight text-xl font-extrabold">{new Date(s.date).getDate()}</div>
                  <div className="font-mono text-[8px] uppercase">
                    {new Date(s.date).toLocaleDateString("fr-FR", { month: "short" })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.title}</div>
                  <div className="font-mono text-[10px] text-ink-faint">
                    {new Date(s.date).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{count} support{count > 1 ? "s" : ""}
                  </div>
                  {s.description && <p className="mt-1 text-sm text-ink-soft">{s.description}</p>}
                </div>
                <button onClick={() => confirm("Supprimer cette séance ? Les cours rattachés seront détachés.") && action({ action: "deleteSession", sessionId: s.id }, "Séance supprimée")} className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper">
                  Suppr
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Cours ---------------- */

function CoursesPanel({
  courses,
  sessions,
  action,
}: {
  courses: Overview["courses"];
  sessions: Overview["sessions"];
  action: Action;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CourseKind>("resume");
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [fileData, setFileData] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) {
      toast("Fichier trop lourd (max ~4 Mo).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    if (kind === "pdf" && !fileData) {
      toast("Choisis un fichier PDF.", "error");
      return;
    }
    setBusy(true);
    await action(
      { action: "createCourse", sessionId: sessionId || null, title, kind, summary, fileData, fileName, url },
      "Cours ajouté"
    );
    setTitle(""); setKind("resume"); setSessionId(""); setSummary(""); setUrl(""); setFileData(""); setFileName("");
    setBusy(false); setOpen(false);
  }

  const sessionName = (sid: string | null) => sessions.find((s) => s.id === sid)?.title ?? "Non rattaché";

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <SectionTitle title="Cours & supports" sub="Partage des résumés, des PDF ou des liens, rattachés à une séance." />
        <button onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper">
          {open ? "× Annuler" : "+ Ajouter"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={create} className="card-paper mb-5 grid gap-2 overflow-hidden rounded-[16px] p-4 shadow-hard-sm">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du cours" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as CourseKind)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none">
                <option value="resume">📝 Résumé</option>
                <option value="pdf">📄 PDF</option>
                <option value="lien">🔗 Lien</option>
              </select>
              <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none">
                <option value="">Séance : aucune</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {s.title}
                  </option>
                ))}
              </select>
            </div>
            {kind === "resume" && (
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Contenu du résumé…" className="min-h-[120px] rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            )}
            {kind === "pdf" && (
              <label className="grid cursor-pointer gap-3 rounded-xl border-[1.5px] border-dashed border-ink bg-card px-4 py-4 text-sm transition hover:bg-paper2">
                <div>
                  <div className="font-semibold text-ink">Uploader le document PDF</div>
                  <div className="mt-1 text-xs text-ink-soft">Dépose ou sélectionne le support de cours. Taille max : 4 Mo.</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-ink-soft">{fileName || "Aucun document sélectionné"}</span>
                  <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper">Choisir un fichier</span>
                </div>
                <input type="file" accept="application/pdf" onChange={onFile} className="hidden" />
              </label>
            )}
            {kind === "lien" && (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm" />
            )}
            <button type="submit" disabled={busy} className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50">
              {busy ? "Ajout…" : "Ajouter le cours →"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {courses.length === 0 ? (
        <Empty text="Aucun cours partagé." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="card-paper rounded-[14px] p-4 shadow-hard-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="rounded-full border-[1.5px] border-ink bg-paper2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                  {c.kind === "pdf" ? "📄 PDF" : c.kind === "lien" ? "🔗 Lien" : "📝 Résumé"}
                </span>
                <button onClick={() => confirm("Supprimer ce cours ?") && action({ action: "deleteCourse", courseId: c.id }, "Cours supprimé")} className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper">
                  Suppr
                </button>
              </div>
              <h4 className="display-tight text-lg font-bold leading-tight">{c.title}</h4>
              <div className="mt-0.5 font-mono text-[10px] text-ink-faint">{sessionName(c.sessionId)}</div>
              {c.kind === "resume" && c.summary && <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{c.summary}</p>}
              {c.kind === "pdf" && <p className="mt-2 text-sm text-ink-soft">{c.fileName}</p>}
              {c.kind === "lien" && c.url && <p className="mt-2 truncate text-sm text-cobalt">{c.url}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Réglages ---------------- */

function SettingsPanel({ classInfo, action }: { classInfo: ClassSummary; action: Action }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(classInfo.name);
  const [school, setSchool] = useState(classInfo.school);
  const [description, setDescription] = useState(classInfo.description);
  const [logo, setLogo] = useState(classInfo.logo);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400000) {
      toast("Logo trop lourd (max ~400 Ko).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <SectionTitle title="Réglages de la promo" />

      <div className="card-paper mb-5 rounded-[16px] p-5 shadow-hard">
        <div className="mb-4 flex items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Code d&apos;accès</div>
          <span className="display-tight rounded-xl border-[1.5px] border-ink bg-lime px-4 py-1.5 text-2xl font-extrabold tracking-widest">
            {classInfo.accessCode}
          </span>
          <button onClick={() => { navigator.clipboard?.writeText(classInfo.accessCode); toast("Code copié ✦", "success"); }} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2">Copier</button>
          <button onClick={() => confirm("Régénérer le code ? L'ancien ne marchera plus.") && action({ action: "regenerateCode" }, "Nouveau code généré")} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2">Régénérer</button>
        </div>
      </div>

      <div className="card-paper mb-5 grid gap-3 rounded-[16px] p-5 shadow-hard sm:grid-cols-[120px_1fr]">
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-square w-full place-items-center overflow-hidden rounded-[16px] border-[1.5px] border-dashed border-ink bg-paper2 text-center transition hover:bg-card">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-xs font-semibold text-ink-soft">📷<br />Logo</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
        </div>
        <div className="grid gap-3">
          <Field label="Nom de la promo" value={name} onChange={setName} />
          <Field label="École" value={school} onChange={setSchool} />
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm" />
          </label>
          <button onClick={() => action({ action: "updateClass", name, school, description, logo }, "Promo mise à jour")} className="justify-self-start rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink">
            Enregistrer
          </button>
        </div>
      </div>

      <div className="rounded-[16px] border-[1.5px] border-vermilion bg-vermilion/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-vermilion">Supprimer la promo</h3>
            <p className="text-sm text-ink-soft">Supprime la promo et détache les étudiants. Irréversible.</p>
          </div>
          <button onClick={() => confirm("Supprimer définitivement cette promo ?") && action({ action: "deleteClass" }, "Promo supprimée")} className="rounded-full border-[1.5px] border-vermilion bg-vermilion px-4 py-2 text-sm font-bold text-paper transition hover:border-ink hover:bg-ink">
            Supprimer la promo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Board (projets) ---------------- */

function BoardPanel({
  soloClaims,
  groups,
  action,
}: {
  soloClaims: Overview["soloClaims"];
  groups: Overview["groups"];
  action: Action;
}) {
  const claimed = SOLO_PROJECTS.filter((p) => soloClaims[p.id]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-paper rounded-[16px] p-5 shadow-hard">
        <h3 className="display-tight mb-3 text-lg font-bold">Projets perso pris <span className="font-mono text-sm text-ink-faint">({claimed.length})</span></h3>
        {claimed.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-6 text-center text-sm text-ink-faint">Aucun projet réservé.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claimed.map((p) => {
              const c = soloClaims[p.id];
              return (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2 text-sm">
                  <span>{p.emoji} <strong>{p.title}</strong> — <span className="text-ink-soft">{c.firstName} {c.lastName}</span></span>
                  <button onClick={() => action({ action: "releaseSolo", projectId: p.id }, "Projet libéré")} className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold transition hover:bg-vermilion hover:text-paper">Libérer</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card-paper rounded-[16px] p-5 shadow-hard">
        <h3 className="display-tight mb-3 text-lg font-bold">Groupes <span className="font-mono text-sm text-ink-faint">({groups.length})</span></h3>
        {groups.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-card/50 py-6 text-center text-sm text-ink-faint">Aucun groupe créé.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map((g) => {
              const proj = GROUP_PROJECTS.find((p) => p.id === g.projectId);
              return (
                <li key={g.id} className="rounded-xl border-[1.5px] border-ink/15 bg-paper2/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <button onClick={() => confirm(`Supprimer le groupe ${g.name} ?`) && action({ action: "deleteGroup", groupId: g.id }, "Groupe supprimé")} className="shrink-0 rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper">Suppr</button>
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    {proj ? `${proj.emoji} ${proj.title}` : "Pas de projet"} · {g.members.map((m) => `${m.firstName} ${m.lastName}`).join(", ")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Création de promo ---------------- */

function CreateClassForm({
  firstTime,
  onCancel,
  onCreated,
}: {
  firstTime: boolean;
  onCancel?: () => void;
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
      toast("Logo trop lourd (max ~400 Ko).", "error");
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
    <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="card-paper rounded-[20px] p-7 shadow-hard">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="display-tight text-2xl font-extrabold">{firstTime ? "Crée ta première promo" : "Nouvelle promo"}</h2>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Un code d&apos;accès unique sera généré pour tes étudiants.</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-sm font-semibold transition hover:bg-paper2">Annuler</button>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] border-[1.5px] border-dashed border-ink bg-paper2 text-center transition hover:bg-card">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-xs font-semibold text-ink-soft">📷<br />Ajouter un logo</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
        </div>
        <div className="grid gap-3">
          <Field label="Nom de la promo" value={name} onChange={setName} placeholder="Ex. Master 1 Dev Web 2026" />
          <Field label="École / établissement" value={school} onChange={setSchool} placeholder="Ex. Epitech" />
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objectifs, contexte, infos pratiques…" className="min-h-[90px] w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm" />
          </label>
        </div>
      </div>

      <button type="submit" disabled={busy} className="mt-6 rounded-full border-[1.5px] border-ink bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50">
        {busy ? "Création…" : "Créer la promo →"}
      </button>
    </motion.form>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm" />
    </label>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "lime" }) {
  return (
    <div className={`rounded-[14px] border-[1.5px] border-ink p-4 shadow-hard-sm ${tone === "lime" ? "bg-lime" : "bg-card"}`}>
      <div className="display-tight text-3xl font-extrabold">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[16px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-12 text-center text-sm text-ink-faint">
      {text}
    </div>
  );
}

function isoDay(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
