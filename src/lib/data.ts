import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BreakType } from "./breaks";

export type BreakRow = {
  id: string;
  sme_id: string | null;
  sme_name: string;
  floor: number;
  break_type: BreakType;
  started_at: string;
  ended_at: string | null;
  ended_by: string | null;
  business_date: string;
};
export type Sme = { id: string; name: string; active: boolean; created_at: string };

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong. Please try again.";
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSmes() {
  return useQuery({
    queryKey: ["smes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("smes").select("*").order("name");
      if (error) throw error;
      return data as Sme[];
    },
  });
}

export function useActiveBreaks() {
  return useQuery({
    queryKey: ["breaks", "active"],
    queryFn: async () => {
      await supabase.rpc("daily_rollover");
      const { data, error } = await supabase
        .from("breaks")
        .select("*")
        .is("ended_at", null)
        .order("started_at");
      if (error) throw error;
      return data as BreakRow[];
    },
    refetchInterval: 60000,
  });
}

export function useHistory(date: string | undefined) {
  return useQuery({
    queryKey: ["breaks", "history", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breaks")
        .select("*")
        .eq("business_date", date!)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as BreakRow[];
    },
  });
}

/** Keeps every open screen in sync when anyone starts/ends a break or edits SMEs. */
export function useLiveSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "breaks" }, () =>
        qc.invalidateQueries({ queryKey: ["breaks"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "smes" }, () =>
        qc.invalidateQueries({ queryKey: ["smes"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** Server clock offset so timers don't depend on the device clock. */
let offsetPromise: Promise<number> | null = null;
function getOffset() {
  if (!offsetPromise) {
    offsetPromise = (async () => {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc("server_now");
      const t1 = Date.now();
      if (error || !data) return 0;
      return new Date(data as string).getTime() - (t0 + t1) / 2;
    })();
  }
  return offsetPromise;
}

export function useServerNow(intervalMs = 1000) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    getOffset().then(setOffset);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now === null ? null : now + offset;
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["admin", "role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { user: null, isAdmin: false };
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return { user: u.user, isAdmin: !!data };
    },
  });
}
