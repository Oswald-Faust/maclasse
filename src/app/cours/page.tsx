"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { CoursWorkspace } from "@/components/workspace/CoursWorkspace";

export default function CoursPage() {
  return (
    <AuthedPage next="/cours">
      {() => (
        <main className="relative min-h-screen overflow-x-clip">
          <div className="bg-paper-grid" />
          <div className="bg-glow" />
          <div className="bg-grain" />
          <CoursWorkspace />
        </main>
      )}
    </AuthedPage>
  );
}
