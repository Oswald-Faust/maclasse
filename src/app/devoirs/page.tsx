"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { DevoirsWorkspace } from "@/components/workspace/DevoirsWorkspace";

export default function DevoirsPage() {
  return (
    <AuthedPage next="/devoirs">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <DevoirsWorkspace />
        </main>
      )}
    </AuthedPage>
  );
}
