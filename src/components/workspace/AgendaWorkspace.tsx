"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/Skeleton";
import { useWorkspace } from "@/lib/useWorkspace";

function isoDay(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AgendaWorkspace() {
  const { sessions, courses, loading } = useWorkspace();
  const monthAnchor = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }, []);

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
  }, [sorted, sessions]);

  const visibleDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDay);
    day.setDate(firstVisibleDay.getDate() + index);
    return day;
  });

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Espace de travail · Agenda
        </div>
        <h1 className="display-tight text-[clamp(2.4rem,7vw,4rem)] font-extrabold">
          Agenda des cours
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Retrouve le calendrier des séances planifiées et les supports rattachés à chaque jour.
        </p>
      </motion.div>

      <div className="card-paper mb-6 rounded-[18px] p-4 shadow-hard-sm">
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Calendrier</div>
          <h3 className="display-tight text-2xl font-extrabold capitalize">{monthLabel}</h3>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="px-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {loading
            ? Array.from({ length: 14 }).map((_, index) => (
                <Skeleton key={index} className="min-h-[148px] w-full rounded-[16px]" />
              ))
            : visibleDays.map((day) => {
                const key = isoDay(day.getTime());
                const entries = sessionsByDay.get(key) ?? [];
                const inMonth = day.getMonth() === monthStart.getMonth();
                const isToday = key === isoDay(Date.now());
                return (
                  <div
                    key={key}
                    className={`min-h-[148px] rounded-[16px] border-[1.5px] p-3 text-left shadow-hard-sm ${
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
                          Aucune séance
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
                  </div>
                );
              })}
        </div>
      </div>

      {!loading && sorted.length === 0 ? (
        <div className="rounded-[16px] border-[1.5px] border-dashed border-ink/30 bg-card/50 px-5 py-12 text-center text-sm text-ink-faint">
          Aucune séance planifiée pour le moment.
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((session) => {
            const attached = courses.filter((c) => c.sessionId === session.id);
            return (
              <div key={session.id} className="card-paper rounded-[16px] p-4 shadow-hard-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{session.title}</h3>
                    <div className="mt-1 font-mono text-[10px] text-ink-faint">
                      {new Date(session.date).toLocaleString("fr-FR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className="rounded-full border-[1.5px] border-ink bg-paper2 px-3 py-1 text-xs font-semibold">
                    {attached.length} support{attached.length > 1 ? "s" : ""}
                  </span>
                </div>
                {session.description && <p className="mt-3 text-sm text-ink-soft">{session.description}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
