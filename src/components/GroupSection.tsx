"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GROUP_PROJECTS } from "@/data/projects";
import type { Group, GroupMember, StoreData } from "@/lib/useStore";
import { useToast } from "./Toast";
import { authHeaders } from "@/lib/api";

export function GroupSection({
  data,
  refresh,
}: {
  data: StoreData;
  refresh: () => Promise<void>;
}) {
  const [myGroupId, setMyGroupId] = useState<string | null>(null);

  useEffect(() => {
    setMyGroupId(localStorage.getItem("myGroupId"));
  }, []);

  const myGroup = useMemo(
    () => data.groups.find((g) => g.id === myGroupId) ?? null,
    [data.groups, myGroupId]
  );

  useEffect(() => {
    if (myGroupId && data.groups.length > 0 && !data.groups.some((g) => g.id === myGroupId)) {
      localStorage.removeItem("myGroupId");
      setMyGroupId(null);
    }
  }, [data.groups, myGroupId]);

  const step = !myGroup ? 1 : myGroup.projectId ? 3 : 2;

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <Steps step={step} />

        <AnimatePresence mode="wait">
          {!myGroup ? (
            <JoinOrCreate
              key="onboard"
              data={data}
              onReady={(g) => {
                localStorage.setItem("myGroupId", g.id);
                setMyGroupId(g.id);
              }}
            />
          ) : myGroup.projectId ? (
            <ChosenRecap key="recap" group={myGroup} />
          ) : (
            <ChooseProject key="choose" group={myGroup} data={data} refresh={refresh} />
          )}
        </AnimatePresence>
      </div>

      <GroupsBoard data={data} myGroupId={myGroupId} />
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Créer le groupe", "Choisir le projet", "Validé"];
  return (
    <div className="mb-7 flex flex-wrap items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full border-[1.5px] border-ink px-3 py-1.5 text-xs font-semibold transition ${
                done
                  ? "bg-lime text-ink"
                  : active
                  ? "bg-ink text-paper"
                  : "bg-card text-ink-faint"
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-current font-mono text-[10px]">
                {done ? "✓" : n}
              </span>
              {l}
            </div>
            {n < labels.length && <span className="font-mono text-ink-faint">—</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Étape 1 : créer OU rejoindre ---------- */

function JoinOrCreate({
  data,
  onReady,
}: {
  data: StoreData;
  onReady: (g: Group) => void;
}) {
  const [mode, setMode] = useState<"create" | "join">("create");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div className="mb-4 flex w-full gap-1 rounded-full border-[1.5px] border-ink bg-card p-1">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === m ? "text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="onboard-fill"
                className="absolute inset-0 z-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              />
            )}
            <span className="relative z-10">
              {m === "create" ? "Créer un groupe" : "Rejoindre un groupe"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === "create" ? (
          <CreateGroupForm key="create" onCreated={onReady} />
        ) : (
          <JoinGroup key="join" data={data} onJoined={onReady} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function JoinGroup({
  data,
  onJoined,
}: {
  data: StoreData;
  onJoined: (g: Group) => void;
}) {
  const toast = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("student");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setFirstName(s.firstName ?? "");
        setLastName(s.lastName ?? "");
      } catch {}
    }
  }, []);

  async function join(groupId: string) {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast("Renseigne d'abord ton prénom et ton nom en haut.", "error");
      return;
    }
    setJoining(groupId);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ groupId, firstName, lastName }),
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem("student", JSON.stringify({ firstName, lastName }));
        toast(`Tu as rejoint « ${json.group.name} » 🎉`, "success");
        onJoined(json.group);
      } else {
        toast(json.error ?? "Impossible de rejoindre ce groupe.", "error");
      }
    } catch {
      toast("Erreur réseau, réessaie.", "error");
    } finally {
      setJoining(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-paper rounded-[18px] p-6 shadow-hard"
    >
      <h3 className="display-tight text-2xl font-extrabold">Rejoignez un groupe</h3>
      <p className="mb-5 mt-1.5 text-sm leading-relaxed text-ink-soft">
        Indique ton identité, puis choisis le groupe que tu veux rejoindre dans la liste.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ton prénom"
          className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Ton nom"
          className="rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
        />
      </div>

      {data.groups.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-ink/30 bg-paper2/40 py-8 text-center text-sm text-ink-faint">
          Aucun groupe à rejoindre pour l&apos;instant.
          <br />
          Crée le premier dans l&apos;onglet « Créer un groupe ».
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.groups.map((g) => {
            const proj = GROUP_PROJECTS.find((p) => p.id === g.projectId);
            return (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink bg-paper2/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{g.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {g.members.length} membre{g.members.length > 1 ? "s" : ""}
                    {proj ? ` · ${proj.emoji} ${proj.title}` : " · sans projet"}
                  </div>
                </div>
                <button
                  onClick={() => join(g.id)}
                  disabled={joining !== null}
                  className="shrink-0 rounded-full border-[1.5px] border-ink bg-ink px-4 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
                >
                  {joining === g.id ? "…" : "Rejoindre"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

/* ---------- Étape 1 : formulaire de création ---------- */

function CreateGroupForm({ onCreated }: { onCreated: (g: Group) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([
    { firstName: "", lastName: "" },
    { firstName: "", lastName: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function update(i: number, field: keyof GroupMember, value: string) {
    setMembers((m) => m.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  }
  function addMember() {
    setMembers((m) => [...m, { firstName: "", lastName: "" }]);
  }
  function removeMember(i: number) {
    setMembers((m) => (m.length > 1 ? m.filter((_, idx) => idx !== i) : m));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, members }),
      });
      const json = await res.json();
      if (res.ok) {
        toast(`Groupe « ${json.group.name} » créé ! Choisissez votre projet.`, "success");
        onCreated(json.group);
      } else {
        toast(json.error ?? "Impossible de créer le groupe.", "error");
      }
    } catch {
      toast("Erreur réseau, réessayez.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      onSubmit={submit}
      className="card-paper rounded-[18px] p-6 shadow-hard"
    >
      <h3 className="display-tight text-2xl font-extrabold">Créez votre groupe</h3>
      <p className="mb-5 mt-1.5 text-sm leading-relaxed text-ink-soft">
        Donnez un nom à votre équipe et ajoutez tous ses membres. Vous choisirez le projet
        juste après.
      </p>

      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        Nom du groupe
      </label>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex. Les Codeurs Masqués"
        className="mb-5 w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none focus:shadow-hard-sm"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          Membres
        </span>
        <button
          type="button"
          onClick={addMember}
          className="rounded-full border-[1.5px] border-ink bg-lime px-3 py-1 text-xs font-semibold text-ink transition hover:bg-ink hover:text-paper"
        >
          + Ajouter
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {members.map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2"
            >
              <input
                value={m.firstName}
                onChange={(e) => update(i, "firstName", e.target.value)}
                placeholder={`Prénom ${i + 1}`}
                className="w-1/2 rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
              />
              <input
                value={m.lastName}
                onChange={(e) => update(i, "lastName", e.target.value)}
                placeholder="Nom"
                className="w-1/2 rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-sm outline-none focus:shadow-hard-sm"
              />
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="grid w-10 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-card text-ink-faint transition hover:bg-vermilion hover:text-paper"
                aria-label="Retirer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
      >
        {submitting ? "Création…" : "Créer le groupe →"}
      </button>
    </motion.form>
  );
}

/* ---------- Étape 2 ---------- */

function ChooseProject({
  group,
  data,
  refresh,
}: {
  group: Group;
  data: StoreData;
  refresh: () => Promise<void>;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function choose(projectId: string) {
    setSubmitting(projectId);
    try {
      const res = await fetch("/api/groups/claim", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ groupId: group.id, projectId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast("Projet de groupe réservé ! ✦", "success");
      } else {
        toast(json.error ?? "Impossible de choisir ce projet.", "error");
      }
      await refresh();
    } catch {
      toast("Erreur réseau, réessayez.", "error");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <div className="mb-5 rounded-xl border-[1.5px] border-ink bg-lime px-4 py-3 text-sm font-medium text-ink shadow-hard-sm">
        Groupe <strong>{group.name}</strong> · {group.members.length} membre
        {group.members.length > 1 ? "s" : ""}. Choisissez votre projet — premier groupe
        arrivé, premier servi.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GROUP_PROJECTS.map((p, idx) => {
          const taken = data.groups.filter((g) => g.projectId === p.id).length;
          const isTaken = taken >= p.capacity;
          const takenBy = data.groups.find((g) => g.projectId === p.id);
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={isTaken ? undefined : { y: -5, x: -2 }}
              className={`flex flex-col rounded-[14px] border-[1.5px] border-ink p-5 transition-shadow ${
                isTaken ? "bg-paper2/60" : "bg-card shadow-hard hover:shadow-hard-lg"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-2xl">
                  {p.emoji}
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    Groupe · {p.tag}
                  </div>
                  <h4 className={`display-tight text-lg font-bold leading-none ${isTaken ? "text-ink-faint" : "text-ink"}`}>
                    {p.title}
                  </h4>
                </div>
              </div>
              <p className={`mb-3 text-sm leading-relaxed ${isTaken ? "text-ink-faint" : "text-ink-soft"}`}>
                {p.description}
              </p>
              <ul className="mb-5 grid gap-1 text-sm text-ink-soft">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <span className="text-lime-deep">▸</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {isTaken ? (
                  <div className="flex items-center gap-2 border-t-[1.5px] border-dashed border-ink/25 pt-3 text-sm text-ink-soft">
                    🔒 Pris par <strong className="text-ink">{takenBy?.name}</strong>
                  </div>
                ) : (
                  <button
                    onClick={() => choose(p.id)}
                    disabled={submitting !== null}
                    className="flex w-full items-center justify-between rounded-full border-[1.5px] border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
                  >
                    {submitting === p.id ? "Réservation…" : "Choisir ce projet"}
                    <span>→</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ---------- Étape 3 ---------- */

function ChosenRecap({ group }: { group: Group }) {
  const project = GROUP_PROJECTS.find((p) => p.id === group.projectId);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="card-paper rounded-[18px] p-8 text-center shadow-hard"
    >
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
        className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl border-[1.5px] border-ink bg-lime text-4xl shadow-hard-sm"
      >
        {project?.emoji ?? "🎉"}
      </motion.div>
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-lime-deep">
        Projet validé
      </div>
      <h3 className="display-tight mt-1.5 text-3xl font-extrabold">{project?.title}</h3>
      <p className="mt-2 text-sm text-ink-soft">
        Le groupe <strong className="text-ink">{group.name}</strong> a réservé ce projet de
        groupe.
      </p>
      <div className="mx-auto mt-5 flex flex-wrap justify-center gap-2">
        {group.members.map((m, i) => (
          <span
            key={i}
            className="rounded-full border-[1.5px] border-ink bg-paper2 px-3 py-1 text-sm text-ink"
          >
            {m.firstName} {m.lastName}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Tableau des groupes ---------- */

function GroupsBoard({ data, myGroupId }: { data: StoreData; myGroupId: string | null }) {
  return (
    <aside className="card-paper h-fit rounded-[18px] p-5 shadow-hard lg:sticky lg:top-6">
      <h3 className="display-tight text-lg font-bold">Groupes inscrits</h3>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        {data.groups.length} groupe{data.groups.length > 1 ? "s" : ""} ·{" "}
        {data.groups.filter((g) => g.projectId).length} avec projet
      </p>
      {data.groups.length === 0 ? (
        <p className="text-sm text-ink-faint">Aucun groupe pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.groups.map((g) => {
            const project = GROUP_PROJECTS.find((p) => p.id === g.projectId);
            const mine = g.id === myGroupId;
            return (
              <li
                key={g.id}
                className={`rounded-xl border-[1.5px] px-3 py-2.5 text-sm ${
                  mine ? "border-ink bg-lime" : "border-ink/15 bg-paper2"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {g.name} {mine && <span className="font-mono text-[10px]">(vous)</span>}
                  </span>
                  <span className="font-mono text-[10px] text-ink-soft">{g.members.length}👤</span>
                </div>
                <div className="mt-0.5 text-xs">
                  {project ? (
                    <span className="font-medium text-ink">
                      {project.emoji} {project.title}
                    </span>
                  ) : (
                    <span className="text-ink-faint">Pas encore de projet</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
