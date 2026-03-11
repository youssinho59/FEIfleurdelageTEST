import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Agent = { id: string; full_name: string };

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) {
          console.error("[useAgents] Erreur chargement profils :", error.message);
          return;
        }
        setAgents(
          (data ?? []).map((d) => ({ id: d.user_id, full_name: d.full_name }))
        );
      });
  }, []);
  return agents;
}
