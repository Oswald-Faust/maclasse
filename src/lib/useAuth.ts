"use client";

import { useCallback, useEffect, useState } from "react";

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: number;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export function useAuth() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    // Revalidation du token côté serveur.
    fetch("/api/auth/me", { headers: { "x-student-token": token } })
      .then(async (r) => {
        if (r.ok) {
          const json = await r.json();
          setStudent(json.student);
          localStorage.setItem("authStudent", JSON.stringify(json.student));
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authStudent");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, s: Student) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authStudent", JSON.stringify(s));
    // Pré-remplit l'identité utilisée par les réservations de projet.
    localStorage.setItem(
      "student",
      JSON.stringify({ firstName: s.firstName, lastName: s.lastName })
    );
    setStudent(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authStudent");
    setStudent(null);
  }, []);

  const updateStudent = useCallback((s: Student) => {
    localStorage.setItem("authStudent", JSON.stringify(s));
    localStorage.setItem(
      "student",
      JSON.stringify({ firstName: s.firstName, lastName: s.lastName })
    );
    setStudent(s);
  }, []);

  return { student, loading, login, logout, updateStudent };
}
