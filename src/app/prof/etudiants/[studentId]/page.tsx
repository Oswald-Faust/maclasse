"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GROUP_PROJECTS, SOLO_PROJECTS } from "@/data/projects";
import { AuthedPage } from "@/components/AuthedPage";
import { PageSkeleton } from "@/components/Skeleton";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { Student } from "@/lib/useAuth";

type StudentDetail = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: number;
  };
  stats: {
    notesCount: number;
    snippetsCount: number;
    assignmentsSubmitted: number;
    assignmentsOpen: number;
    interrogationsSubmitted: number;
    interrogationsTotal: number;
  };
  soloProjectId: string | null;
  group: {
    id: string;
    name: string;
    projectId: string | null;
    members: { firstName: string; lastName: string }[];
  } | null;
  notes: {
    id: string;
    title: string;
    updatedAt: number;
    snippetsCount: number;
  }[];
  assignments: {
    id: string;
    title: string;
    dueDate: number | null;
    isOpen: boolean;
    submitted: boolean;
    updatedAt: number | null;
  }[];
  interrogations: {
    id: string;
    title: string;
    status: "draft" | "running" | "ended";
    submittedAt: number | null;
    updatedAt: number | null;
  }[];
};

export default function Page() {
  return (
    <AuthedPage next="/prof">
      {(student) => <TeacherStudentDetail student={student} />}
    </AuthedPage>
  );
}

function TeacherStudentDetail({ student }: { student: Student }) {
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const studentId = params.studentId;
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student.role !== "teacher") {
      router.replace("/dashboard");
      return;
    }
    if (!classId || typeof studentId !== "string") {
      setError("Informations de navigation manquantes.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/teacher/student-detail?classId=${classId}&studentId=${studentId}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Impossible de charger cet étudiant.");
          setData(null);
          return;
        }
        setData(json);
        setError("");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger cet étudiant.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, router, student.role, studentId]);

  if (loading) return <PageSkeleton />;

  if (student.role !== "teacher") return null;

  if (error || !data) {
    return (
      <main className="relative min-h-screen overflow-x-clip">
        <div className="bg-paper-grid" />
        <div className="bg-glow" />
        <div className="bg-grain" />
        <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
          <EmptyState message={error || "Étudiant introuvable."} classId={classId} />
        </div>
      </main>
    );
  }

  const soloProject = data.soloProjectId
    ? SOLO_PROJECTS.find((project) => project.id === data.soloProjectId)
    : undefined;
  const groupProject = data.group?.projectId
    ? GROUP_PROJECTS.find((project) => project.id === data.group?.projectId)
    : undefined;

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />

      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            href={classId ? `/prof?classId=${classId}&section=students` : "/prof"}
            className="mb-4 inline-flex rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-paper2"
          >
            ← Retour aux étudiants
          </Link>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Fiche étudiant
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full border-[1.5px] border-ink bg-lime text-lg font-bold text-ink">
                {data.student.firstName.charAt(0)}
                {data.student.lastName.charAt(0)}
              </span>
              <div>
                <h1 className="display-tight text-[clamp(2.2rem,7vw,4rem)] font-extrabold">
                  {data.student.firstName} {data.student.lastName}
                </h1>
                <p className="mt-2 text-sm text-ink-soft">{data.student.email}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  Inscrit le {fmtDateTime(data.student.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={`${data.stats.assignmentsSubmitted}/${data.stats.assignmentsOpen}`} label="Devoirs rendus" tone="lime" />
          <Stat value={`${data.stats.interrogationsSubmitted}/${data.stats.interrogationsTotal}`} label="Interrogations" />
          <Stat value={data.stats.notesCount} label="Notes" />
          <Stat value={data.stats.snippetsCount} label="Snippets" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Projet personnel" subtitle="Sujet choisi individuellement">
            {soloProject ? (
              <ProjectSummary
                emoji={soloProject.emoji}
                title={soloProject.title}
                meta={`${soloProject.tag} · ${soloProject.difficulty}`}
                description={soloProject.tagline}
              />
            ) : (
              <p className="text-sm text-ink-soft">Aucun projet personnel réservé.</p>
            )}
          </Panel>

          <Panel title="Projet de groupe" subtitle="Groupe et sujet collectif">
            {data.group ? (
              <div className="space-y-3">
                <ProjectSummary
                  emoji={groupProject?.emoji ?? "👥"}
                  title={data.group.name}
                  meta={groupProject ? `${groupProject.title} · ${groupProject.difficulty}` : "Groupe sans projet"}
                  description={
                    groupProject ? groupProject.tag : `${data.group.members.length} membre${data.group.members.length > 1 ? "s" : ""}`
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {data.group.members.map((member) => (
                    <span key={`${member.firstName}-${member.lastName}`} className="rounded-full border border-ink/15 bg-paper2 px-2.5 py-1 text-xs text-ink-soft">
                      {member.firstName} {member.lastName}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Aucun groupe rejoint pour le moment.</p>
            )}
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <Panel title="Devoirs" subtitle="Suivi des rendus par devoir">
            {data.assignments.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucun devoir publié dans cette promo.</p>
            ) : (
              <div className="grid gap-2">
                {data.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[18px] border border-ink/10 bg-paper2/60 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink">{assignment.title}</div>
                        <div className="mt-1 font-mono text-[10px] text-ink-faint">
                          {assignment.dueDate ? `Échéance ${fmtDateTime(assignment.dueDate)}` : "Sans date limite"}
                          {assignment.isOpen ? " · Ouvert" : " · Fermé"}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${assignment.submitted ? "border-ink bg-lime text-ink" : "border-ink bg-card text-ink-faint"}`}>
                        {assignment.submitted ? "Rendu" : "En attente"}
                      </span>
                    </div>
                    {assignment.updatedAt && (
                      <div className="mt-2 text-xs text-ink-soft">Dernière remise : {fmtDateTime(assignment.updatedAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Notes récentes" subtitle="Aperçu de l’activité personnelle">
            {data.notes.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucune note créée.</p>
            ) : (
              <div className="grid gap-2">
                {data.notes.map((note) => (
                  <div key={note.id} className="rounded-[18px] border border-ink/10 bg-paper2/60 px-4 py-3">
                    <div className="text-sm font-semibold text-ink">{note.title}</div>
                    <div className="mt-1 font-mono text-[10px] text-ink-faint">
                      {note.snippetsCount} snippet{note.snippetsCount > 1 ? "s" : ""} · mise à jour {fmtDateTime(note.updatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="mt-5">
          <Panel title="Interrogations" subtitle="Participation et remises">
            {data.interrogations.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucune interrogation créée.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.interrogations.map((interro) => (
                  <div key={interro.id} className="rounded-[18px] border border-ink/10 bg-paper2/60 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink">{interro.title}</div>
                        <div className="mt-1 font-mono text-[10px] text-ink-faint">
                          {interro.status === "running" ? "En cours" : interro.status === "ended" ? "Terminée" : "Brouillon"}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${interro.submittedAt ? "border-ink bg-lime text-ink" : "border-ink bg-card text-ink-faint"}`}>
                        {interro.submittedAt ? "Rendue" : "Sans rendu"}
                      </span>
                    </div>
                    {interro.submittedAt && (
                      <div className="mt-2 text-xs text-ink-soft">Rendue le {fmtDateTime(interro.submittedAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border-[1.5px] border-ink bg-card p-5 shadow-hard"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{title}</div>
      <p className="mt-1 mb-4 text-sm text-ink-soft">{subtitle}</p>
      {children}
    </motion.section>
  );
}

function ProjectSummary({
  emoji,
  title,
  meta,
  description,
}: {
  emoji: string;
  title: string;
  meta: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-14 w-14 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-3xl">
        {emoji}
      </span>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{meta}</div>
        <div className="mt-1 text-lg font-bold text-ink">{title}</div>
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      </div>
    </div>
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

function EmptyState({ message, classId }: { message: string; classId: string }) {
  return (
    <div className="rounded-[24px] border-[1.5px] border-ink bg-card p-8 shadow-hard">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Fiche étudiant</div>
      <h1 className="display-tight mt-3 text-3xl font-extrabold">Impossible d’ouvrir cette page</h1>
      <p className="mt-4 text-sm text-ink-soft">{message}</p>
      <Link
        href={classId ? `/prof?classId=${classId}&section=students` : "/prof"}
        className="mt-6 inline-flex rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-lime hover:text-ink"
      >
        Retour à la promo
      </Link>
    </div>
  );
}
