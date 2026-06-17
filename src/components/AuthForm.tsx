"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";

type Role = "student" | "teacher";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { login } = useAuth();

  const [role, setRole] = useState<Role>("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? { firstName, lastName, email, password, role, accessCode }
            : { email, password }
        ),
      });
      const json = await res.json();
      if (res.ok) {
        login(json.token, json.student);
        const home = json.student.role === "teacher" ? "/prof" : "/dashboard";
        router.push(next || home);
      } else {
        setError(json.error ?? "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link href="/" className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-[1.5px] border-ink bg-lime font-display text-lg font-extrabold">
            S
          </span>
          <span className="display-tight text-lg font-extrabold">StudEasy</span>
        </Link>

        <div className="card-paper rounded-[20px] p-7 shadow-hard-lg">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {isRegister ? "Nouveau compte" : "Connexion"}
          </div>
          <h1 className="display-tight text-3xl font-extrabold">
            {isRegister ? "Crée ton espace" : "Bon retour 👋"}
          </h1>
          <p className="mb-6 mt-1.5 text-sm text-ink-soft">
            {isRegister
              ? "Rejoins ta promo en tant qu'étudiant, ou crée ton espace enseignant."
              : "Connecte-toi pour accéder à ton tableau de bord."}
          </p>

          {isRegister && (
            <div className="mb-4 flex gap-1 rounded-full border-[1.5px] border-ink bg-card p-1">
              {(["student", "teacher"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    role === r ? "text-paper" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {role === r && (
                    <motion.span
                      layoutId="role-fill"
                      className="absolute inset-0 z-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">
                    {r === "student" ? "🎓 Étudiant" : "🧑‍🏫 Enseignant"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <Field placeholder="Prénom" value={firstName} onChange={setFirstName} autoFocus />
                <Field placeholder="Nom" value={lastName} onChange={setLastName} />
              </div>
            )}
            <Field
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={setEmail}
              autoFocus={!isRegister}
            />
            <Field
              type="password"
              placeholder={isRegister ? "Mot de passe (6+ caractères)" : "Mot de passe"}
              value={password}
              onChange={setPassword}
            />

            {isRegister && role === "student" && (
              <div>
                <Field
                  placeholder="Code de la promo (ex. 4F7K2P)"
                  value={accessCode}
                  onChange={(v) => setAccessCode(v.toUpperCase())}
                />
                <p className="mt-1.5 px-1 text-xs text-ink-faint">
                  Ce code t&apos;est communiqué par ton enseignant.
                </p>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-[1.5px] border-vermilion bg-vermilion/10 px-3 py-2 text-sm text-vermilion"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink disabled:opacity-50"
            >
              {loading
                ? "Un instant…"
                : isRegister
                ? role === "teacher"
                  ? "Créer mon espace enseignant →"
                  : "Rejoindre ma promo →"
                : "Se connecter →"}
            </button>
          </form>

          <div className="mt-5 border-t border-ink/10 pt-4 text-center text-sm text-ink-soft">
            {isRegister ? (
              <>
                Déjà un compte ?{" "}
                <Link href="/login" className="font-semibold text-ink underline-grow">
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                Pas encore de compte ?{" "}
                <Link href="/register" className="font-semibold text-ink underline-grow">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-5 block text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint underline-grow"
        >
          ← Retour à l&apos;accueil
        </Link>
      </motion.div>
    </main>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border-[1.5px] border-ink bg-card px-3 py-2.5 text-sm outline-none transition focus:shadow-hard-sm"
    />
  );
}
