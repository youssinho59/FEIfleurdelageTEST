import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Agent = { id: string; full_name: string };

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setAgents((data as Agent[]) || []));
  }, []);
  return agents;
}
