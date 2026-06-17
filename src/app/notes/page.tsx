"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { NotesWorkspace } from "@/components/workspace/NotesWorkspace";

export default function NotesPage() {
  return (
    <AuthedPage next="/notes">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <NotesWorkspace />
        </main>
      )}
    </AuthedPage>
  );
}
