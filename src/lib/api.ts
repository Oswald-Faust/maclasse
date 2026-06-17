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
