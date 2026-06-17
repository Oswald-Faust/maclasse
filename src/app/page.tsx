"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SOLO_PROJECTS, GROUP_PROJECTS } from "@/data/projects";

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="bg-paper-grid" />
      <div className="bg-glow" />
      <div className="bg-grain" />
      <Navbar />
      <Hero />
      <ForWho />
      <Features />
      <HowItWorks />
      <StudentSide />
      <ProjectsTeaser />
      <CTA />
      <Footer />
    </main>
  );
}

/* ---------------- Navbar ---------------- */

function Navbar() {
  const [authed, setAuthed] = useState(false);
  const [home, setHome] = useState("/dashboard");
  useEffect(() => {
    setAuthed(Boolean(localStorage.getItem("authToken")));
    try {
      const s = JSON.parse(localStorage.getItem("authStudent") || "null");
      if (s?.role === "teacher") setHome("/prof");
    } catch {}
  }, []);

  const links = [
    { href: "#produit", label: "Produit" },
    { href: "#fonctionnalites", label: "Fonctionnalités" },
    { href: "#etudiants", label: "Étudiants" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-[1.5px] border-ink bg-lime font-display text-lg font-extrabold">
            S
          </span>
          <span className="display-tight text-lg font-extrabold">StudEasy</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-ink-soft underline-grow hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <Link
              href={home}
              className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink"
            >
              Mon espace →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold transition hover:bg-paper2 sm:block"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft"
      >
        <span className="h-2 w-2 animate-blink rounded-full bg-lime-deep" />
        Le workspace SaaS pour gérer ta classe
      </motion.div>

      <h1 className="display-tight max-w-4xl text-[clamp(2.8rem,9vw,6.5rem)] font-extrabold">
        <Line delay={0}>Gère ta promo</Line>
        <Line delay={0.08}>
          en{" "}
          <span className="relative inline-block">
            <span className="relative z-10">un seul espace</span>
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-[-4px] bottom-[0.12em] z-0 h-[0.42em] origin-left bg-lime"
            />
          </span>
        </Line>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft"
      >
        StudEasy est le <span className="font-semibold text-ink">SaaS de gestion de classe</span>{" "}
        pour enseignants et encadrants. Distribue les projets, publie les devoirs, suis
        chaque étudiant — et offre à ta promo un espace de travail clair et motivant.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex flex-wrap gap-3"
      >
        <Link
          href="/register"
          className="rounded-full border-[1.5px] border-ink bg-ink px-6 py-3 text-sm font-bold text-paper shadow-hard-sm transition-colors hover:bg-lime hover:text-ink"
        >
          Démarrer gratuitement →
        </Link>
        <a
          href="#produit"
          className="rounded-full border-[1.5px] border-ink bg-card px-6 py-3 text-sm font-bold transition hover:bg-paper2"
        >
          Découvrir le produit
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <HeroStat value={`${SOLO_PROJECTS.length + GROUP_PROJECTS.length}`} label="Sujets prêts à l'emploi" />
        <HeroStat value="1 espace" label="Projets · notes · devoirs" tone="lime" />
        <HeroStat value="Temps réel" label="Suivi de la promo" />
        <HeroStat value="0€" label="Pour démarrer" tone="lime" />
      </motion.div>
    </section>
  );
}

function HeroStat({
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
      <div className="display-tight text-2xl font-extrabold sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </div>
    </div>
  );
}

/* ---------------- Pour qui ---------------- */

function ForWho() {
  const items = [
    {
      emoji: "🧑‍🏫",
      title: "Enseignants & encadrants",
      text: "Distribue les projets, publie les devoirs et garde une vue d'ensemble de toute la promo sans tableur ni groupe de messagerie.",
    },
    {
      emoji: "🎓",
      title: "Écoles & formations",
      text: "Un espace commun pour chaque classe : projets de réalisation, suivi des rendus et organisation des équipes au même endroit.",
    },
    {
      emoji: "👩‍💻",
      title: "Étudiants",
      text: "Chacun choisit son projet, organise ses notes et rend ses devoirs depuis un tableau de bord personnel clair.",
    },
  ];
  return (
    <Section id="produit" eyebrow="Pour qui" title="Un workspace pensé pour la classe">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08}>
            <div className="card-paper h-full rounded-[18px] p-6 shadow-hard">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-2xl">
                {it.emoji}
              </span>
              <h3 className="display-tight text-xl font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Fonctionnalités ---------------- */

function Features() {
  const feats = [
    { emoji: "🗂️", title: "Attribution de projets", text: "Des dizaines de sujets prêts à l'emploi. Premier arrivé, premier servi : un projet réservé disparaît du tableau." },
    { emoji: "👥", title: "Gestion des groupes", text: "Les étudiants créent ou rejoignent une équipe pour les projets collectifs. Tu vois les membres en direct." },
    { emoji: "📦", title: "Devoirs & rendus", text: "Publie des devoirs, fixe le format attendu et reçois les rendus (texte + snippets de code) de chaque étudiant." },
    { emoji: "📝", title: "Notes des étudiants", text: "Chaque étudiant dispose d'un bloc-notes avec snippets pour structurer son travail." },
    { emoji: "📊", title: "Suivi en temps réel", text: "Tableau de bord enseignant : choix, groupes, rendus et avancement, synchronisés en direct." },
    { emoji: "📤", title: "Export & administration", text: "Console enseignant pour gérer la promo, libérer un projet, modérer un groupe et exporter en CSV." },
  ];
  return (
    <Section id="fonctionnalites" eyebrow="Fonctionnalités" title="Tout pour piloter ta classe">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {feats.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.06}>
            <div className="card-paper flex h-full gap-3 rounded-[16px] p-5 shadow-hard-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-paper2 text-xl">
                {f.emoji}
              </span>
              <div>
                <h3 className="font-bold leading-tight">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{f.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Fonctionnement ---------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Crée ton espace",
      text: "Inscris-toi en quelques secondes. Tu obtiens un workspace prêt à accueillir ta promo, ses projets et ses devoirs.",
    },
    {
      n: "02",
      title: "Publie projets & devoirs",
      text: "Mets à disposition les sujets de réalisation et les devoirs. Les étudiants choisissent et travaillent en autonomie.",
    },
    {
      n: "03",
      title: "Suis l'avancement",
      text: "Visualise en direct les choix, les groupes et les rendus. Exporte les données quand tu en as besoin.",
    },
  ];
  return (
    <Section eyebrow="Fonctionnement" title="Opérationnel en trois étapes">
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div className="relative h-full rounded-[18px] border-[1.5px] border-ink bg-card p-6 shadow-hard">
              <span className="display-tight text-5xl font-extrabold text-lime-deep">{s.n}</span>
              <h3 className="display-tight mt-2 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Côté étudiant ---------------- */

function StudentSide() {
  const points = [
    { emoji: "🎯", text: "Choisir un projet personnel et rejoindre une équipe" },
    { emoji: "📝", text: "Organiser ses notes et ses snippets de code" },
    { emoji: "📦", text: "Rendre ses devoirs en quelques clics" },
    { emoji: "📈", text: "Suivre son avancement sur un tableau de bord clair" },
  ];
  return (
    <section id="etudiants" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-16 sm:px-8">
      <div className="grid items-center gap-8 rounded-[24px] border-[1.5px] border-ink bg-card p-8 shadow-hard lg:grid-cols-2 lg:p-12">
        <Reveal>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-lime-deep">
              Côté étudiant
            </div>
            <h2 className="display-tight text-[clamp(1.9rem,5vw,3rem)] font-extrabold">
              Un espace qui leur donne envie de s&apos;y mettre
            </h2>
            <p className="mt-3 max-w-md text-ink-soft">
              Pas qu&apos;un outil pour le prof : chaque étudiant dispose d&apos;un véritable
              tableau de bord personnel, motivant et simple à utiliser.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-full border-[1.5px] border-ink bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink"
            >
              Rejoindre ma classe →
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="grid gap-3">
            {points.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-ink bg-paper2/60 px-4 py-3 text-sm font-medium"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[1.5px] border-ink bg-card text-lg">
                  {p.emoji}
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Aperçu projets ---------------- */

function ProjectsTeaser() {
  const preview = SOLO_PROJECTS.slice(0, 10);
  return (
    <Section eyebrow="Bibliothèque" title="Des sujets prêts à distribuer">
      <div className="flex flex-wrap gap-2.5">
        {preview.map((p, i) => (
          <Reveal key={p.id} delay={(i % 5) * 0.04}>
            <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-semibold shadow-hard-sm transition hover:bg-lime">
              <span className="text-base">{p.emoji}</span>
              {p.title}
            </span>
          </Reveal>
        ))}
        <Reveal delay={0.2}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-lime hover:text-ink"
          >
            + {SOLO_PROJECTS.length - preview.length} autres sujets →
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------------- CTA ---------------- */

function CTA() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-ink bg-ink p-10 text-center shadow-hard-lg sm:p-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(40% 60% at 80% 0%, rgba(198,247,81,0.6), transparent 60%)",
            }}
          />
          <h2 className="display-tight relative text-[clamp(2rem,6vw,3.5rem)] font-extrabold text-paper">
            Donne à ta classe le <span className="text-lime">workspace</span> qu&apos;elle mérite
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-paper/70">
            Crée ton espace StudEasy maintenant. Gratuit pour démarrer, prêt en deux minutes.
          </p>
          <Link
            href="/register"
            className="relative mt-7 inline-flex items-center gap-2 rounded-full border-[1.5px] border-lime bg-lime px-7 py-3.5 text-sm font-bold text-ink transition-transform hover:scale-[1.03]"
          >
            Créer mon espace →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t-[1.5px] border-ink">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg border-[1.5px] border-ink bg-lime font-display text-sm font-extrabold">
            S
          </span>
          <span className="display-tight font-bold">StudEasy · Workspace de classe</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
          <Link href="/login" className="underline-grow hover:text-ink">
            Connexion
          </Link>
          <Link href="/register" className="underline-grow hover:text-ink">
            Créer un compte
          </Link>
          <Link href="/admin" className="underline-grow hover:text-ink">
            Espace enseignant
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Helpers ---------------- */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-16 sm:px-8">
      <Reveal>
        <div className="mb-8">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-lime-deep">
            {eyebrow}
          </div>
          <h2 className="display-tight text-[clamp(1.9rem,5vw,3rem)] font-extrabold">{title}</h2>
        </div>
      </Reveal>
      {children}
    </section>
  );
}

function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
