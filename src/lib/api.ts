"use client";

/** En-tête d'authentification basé sur le JWT stocké côté client. */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return {
    ...(extra ?? {}),
    ...(token ? { "x-student-token": token } : {}),
  };
}

/** fetch avec en-tête JWT + Content-Type JSON injectés. */
export function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: authHeaders({ "Content-Type": "application/json", ...(options.headers as object) }),
  });
}

/** Récupère le PDF d'un cours (data URL base64) et l'ouvre dans un nouvel onglet. */
export async function openCourseFile(courseId: string): Promise<boolean> {
  const res = await fetch(`/api/course/file?id=${courseId}`, { headers: authHeaders() });
  if (!res.ok) return false;
  const json = await res.json();
  if (!json.fileData) return false;
  // Convertit le data URL en blob pour un affichage fiable du PDF.
  const blob = await (await fetch(json.fileData)).blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
