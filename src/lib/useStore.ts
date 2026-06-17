"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SoloClaim = {
  projectId: string;
  firstName: string;
  lastName: string;
  claimedAt: number;
};

export type GroupMember = { firstName: string; lastName: string };

export type Group = {
  id: string;
  name: string;
  members: GroupMember[];
  projectId: string | null;
  createdAt: number;
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  expectedFormat: string;
  createdAt: number;
  updatedAt: number;
  isOpen: boolean;
};

export type UiSettings = {
  boardTickerItems: string[];
};

export type StoreData = {
  soloClaims: Record<string, SoloClaim>;
  groups: Group[];
  assignments: Assignment[];
  uiSettings: UiSettings;
};

export function useStore(pollMs = 4000) {
  const [data, setData] = useState<StoreData>({
    soloClaims: {},
    groups: [],
    assignments: [],
    uiSettings: { boardTickerItems: [] },
  });
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as StoreData;
      if (mounted.current) setData(json);
    } catch {
      /* hors-ligne : on garde l'état courant */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { data, loading, refresh, setData };
}
