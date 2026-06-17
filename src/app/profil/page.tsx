"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AuthedPage } from "@/components/AuthedPage";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/useAuth";
import { useStore } from "@/lib/useStore";
import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";
import { fmtDateTime } from "@/lib/format";

export default function ProfilPage() {
  return (
    <AuthedPage next="/profil">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <ProfileView />
        </main>
      )}
    </AuthedPage>
  );
}

const norm = (s: string) => s.trim().toLowerCase();

function ProfileView() {
  const { student, updateStudent } = useAuth();
  const { data } = useStore();
  const toast = useToast();

  const [firstName, setFirstName] = useState(student?.firstName ?? "");
  const [lastName, setLastName] = useState(student?.lastName ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [seeded, setSeeded] = useState(Boolean(student));
  const [savingInfo, setSavingInfo] = useState(false);

  // L'étudiant est chargé de façon asynchrone : on pré-remplit les champs une fois disponible.
  useEffect(() => {
    if (student && !seeded) {
      setFirstName(student.firstName);
      setLastName(student.lastName);
      setEmail(student.email);
      setSeeded(true);
    }
  }, [student, seeded]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const soloProject = useMemo(() => {
    if (!student) return undefined;
    const claim = Object.values(data.soloClaims).find(
      (c) => norm(c.firstName) === norm(student.firstName) && norm(c.lastName) === norm(student.lastName)
    );
    return claim ? SOLO_PROJECTS.find((p) => p.id === claim.projectId) : undefined;
  }, [data.soloClaims, student]);

  const myGroup = useMemo(() => {
    if (!student) return undefined;
    return data.groups.find((g) =>
      g.members.some(
        (m) => norm(m.firstName) === norm(student.firstName) && norm(m.lastName) === norm(student.lastName)
      )
    );
  }, [data.groups, student]);

  const groupProject = myGroup?.projectId
    ? GROUP_PROJECTS.find((p) => p.id === myGroup.projectId)
    : undefined;

  async function update(body: Record<string, unknown>): Promise<boolean> {
    const token = localStorage.getItem("authToken");
    if (!token) return false;
    const res = await fetch("/api/auth/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-student-token": token },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) {
      updateStudent(json.student);
      return true;
    }
    toast(json.error ?? "Mise à jour impossible.", "error");
    return false;
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    const ok = await update({ firstName, lastName, email });
    if (ok) toast("Informations mises à jour ✦", "success");
    setSavingInfo(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Les deux mots de passe ne correspondent pas.", "error");
      return;
    }
    setSavingPwd(true);
    const ok = await update({ firstName, lastName, email, currentPassword, newPassword });
    if (ok) {
      toast("Mot de passe modifié ✦", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPwd(false);
  }

  if (!student) return null;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      {/* En-tête profil */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Mon compte
        </div>
        <div className="flex items-center gap-4">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-[1.5px] border-ink bg-lime font-display text-3xl font-extrabold shadow-hard-sm">
            {student.firstName.charAt(0)}
            {student.lastName.charAt(0)}
          </span>
          <div>
            <h1 className="display-tight text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-none">
              {student.firstName} {student.lastName}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {student.email} · membre depuis {fmtDateTime(student.createdAt)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Résumé d'activité */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Projet personnel"
          value={soloProject ? `${soloProject.emoji} ${soloProject.title}` : "Aucun"}
          tone={soloProject ? "lime" : undefined}
        />
        <SummaryCard
          label="Groupe"
          value={myGroup ? myGroup.name : "Aucun"}
          tone={myGroup ? "lime" : undefined}
        />
        <SummaryCard
          label="Projet de groupe"
          value={groupProject ? `${groupProject.emoji} ${groupProject.title}` : "—"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Infos personnelles */}
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={saveInfo}
          className="card-paper rounded-[18px] p-6 shadow-hard"
        >
          <h2 className="display-tight text-2xl font-bold">Informations</h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            Modifie ton identité et ton adresse e-mail.
          </p>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" value={firstName} onChange={setFirstName} />
              <Field label="Nom" value={lastName} onChange={setLastName} />
            </div>
            <Field label="E-mail" type="email" value={email} onChange={setEmail} />
          </div>

          <button
            type="submit"
            disabled={savingInfo}
            className="mt-5 rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            {savingInfo ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </motion.form>

        {/* Mot de passe */}
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onSubmit={savePassword}
          className="card-paper rounded-[18px] p-6 shadow-hard"
        >
          <h2 className="display-tight text-2xl font-bold">Mot de passe</h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            Pour changer ton mot de passe, confirme d&apos;abord l&apos;actuel.
          </p>

          <div className="grid gap-3">
            <Field
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <Field
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Field
              label="Confirmer le nouveau"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>

          <button
            type="submit"
            disabled={savingPwd || !currentPassword || !newPassword}
            className="mt-5 rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-lime hover:text-ink disabled:opacity-50"
          >
            {savingPwd ? "Mise à jour…" : "Changer le mot de passe"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "lime";
}) {
  return (
    <div
      className={`rounded-[14px] border-[1.5px] border-ink p-4 shadow-hard-sm ${
        tone === "lime" ? "bg-lime" : "bg-card"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </div>
  );
}
