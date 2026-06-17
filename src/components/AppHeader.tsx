"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Student } from "@/lib/useAuth";

export function AppHeader({
  student,
  onLogout,
}: {
  student: Student | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: "/notes", label: "Notes" },
    { href: "/devoirs", label: "Devoirs" },
    { href: "/choix", label: "Projets" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-[1.5px] border-ink bg-lime font-display text-lg font-extrabold">
            S
          </span>
          <span className="display-tight text-lg font-extrabold">StudEasy</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center overflow-x-auto px-2 sm:flex">
          <div className="flex min-w-max items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active ? "text-paper" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 z-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {student && (
            <Link
              href="/profil"
              className={`hidden items-center gap-2 rounded-full border-[1.5px] border-ink px-3 py-1.5 text-sm font-semibold transition sm:flex ${
                pathname === "/profil" ? "bg-ink text-paper" : "bg-card hover:bg-paper2"
              }`}
              title="Mon profil"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-lime font-mono text-[11px] text-ink">
                {student.firstName.charAt(0)}
                {student.lastName.charAt(0)}
              </span>
              {student.firstName}
            </Link>
          )}
          <button
            onClick={() => {
              onLogout();
              router.push("/");
            }}
            className="rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:bg-vermilion hover:text-paper"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
