"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { AgendaWorkspace } from "@/components/workspace/AgendaWorkspace";

export default function AgendaPage() {
  return (
    <AuthedPage next="/agenda">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <AgendaWorkspace />
        </main>
      )}
    </AuthedPage>
  );
}
