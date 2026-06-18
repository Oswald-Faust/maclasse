"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { InterrogationsWorkspace } from "@/components/workspace/DevoirsWorkspace";

export default function InterrogationsPage() {
  return (
    <AuthedPage next="/interrogations">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <InterrogationsWorkspace />
        </main>
      )}
    </AuthedPage>
  );
}
