"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Student } from "@/lib/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { ToastProvider } from "@/components/Toast";

/**
 * Enveloppe les pages réservées aux étudiants connectés :
 * - fournit le contexte des toasts,
 * - redirige vers /login si non authentifié,
 * - affiche le header applicatif,
 * - passe l'étudiant courant au contenu.
 */
export function AuthedPage({
  next,
  children,
}: {
  next: string;
  children: (student: Student) => React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Guard next={next}>{children}</Guard>
    </ToastProvider>
  );
}

function Guard({
  next,
  children,
}: {
  next: string;
  children: (student: Student) => React.ReactNode;
}) {
  const { student, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !student) router.replace(`/login?next=${next}`);
  }, [loading, student, router, next]);

  if (loading || !student) {
    return (
      <div className="grid min-h-screen place-items-center font-mono text-xs uppercase tracking-widest text-ink-faint">
        Chargement…
      </div>
    );
  }

  return (
    <>
      <AppHeader student={student} onLogout={logout} />
      {children(student)}
    </>
  );
}
