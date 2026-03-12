const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) return json({ error: "SUPABASE_URL manquant" });
    if (!serviceKey) return json({ error: "SUPABASE_SERVICE_ROLE_KEY manquant" });

    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
      "Prefer": "return=minimal",
    };

    // Vérifier le JWT de l'appelant
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" });

    const callerToken = authHeader.replace("Bearer ", "");
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { "Authorization": `Bearer ${callerToken}`, "apikey": serviceKey },
    });
    if (!userRes.ok) return json({ error: "Token invalide" });
    const caller = await userRes.json();

    // Vérifier le rôle admin
    const rolesRes = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${caller.id}&role=eq.admin&select=role`,
      { headers: adminHeaders }
    );
    const roles = await rolesRes.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return json({ error: "Accès refusé" });
    }

    const body = await req.json();
    const { action } = body;

    // --- LISTER tous les agents ---
    if (action === "list") {
      const [profilesRes, rolesListRes, usersRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?select=user_id,full_name,created_at`, { headers: adminHeaders }),
        fetch(`${supabaseUrl}/rest/v1/user_roles?select=user_id,role,service`, { headers: adminHeaders }),
        fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, { headers: adminHeaders }),
      ]);

      const profiles = await profilesRes.json();
      const allRoles = await rolesListRes.json();
      const usersData = await usersRes.json();
      const users = usersData.users ?? [];

      if (!Array.isArray(profiles)) return json({ error: "Erreur chargement profils : " + JSON.stringify(profiles) });
      const safeRoles = Array.isArray(allRoles) ? allRoles : [];

      const agents = profiles.map((p: any) => {
        const authUser = users.find((u: any) => u.id === p.user_id);
        const userRoles = safeRoles.filter((r: any) => r.user_id === p.user_id);
        const roleNames = userRoles.map((r: any) => r.role);
        const responsableRow = userRoles.find((r: any) => r.role === "responsable");
        const resolvedRole = roleNames.includes("admin")
          ? "admin"
          : roleNames.includes("responsable")
          ? "responsable"
          : "user";
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: authUser?.email || "",
          identifiant: (authUser?.email || "").replace("@agent.internal", ""),
          role: resolvedRole,
          service: responsableRow?.service ?? null,
          created_at: p.created_at,
        };
      });

      return json({ agents });
    }

    // --- MODIFIER un agent ---
    if (action === "update") {
      const { userId, fullName, role, service, password, nom, prenom } = body;
      if (!userId) return json({ error: "userId requis" });

      if (fullName !== undefined) {
        await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ full_name: fullName }),
        });
      }

      if (nom !== undefined && prenom !== undefined) {
        const normalize = (s: string) =>
          s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const newEmail = `${normalize(prenom)}.${normalize(nom)}@agent.internal`;
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: adminHeaders,
          body: JSON.stringify({ email: newEmail }),
        });
      }

      if (role !== undefined) {
        await fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=eq.${userId}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            user_id: userId,
            role,
            ...(role === "responsable" && service ? { service } : {}),
          }),
        });
      }

      if (password) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: adminHeaders,
          body: JSON.stringify({ password }),
        });
      }

      return json({ success: true });
    }

    return json({ error: "Action inconnue : " + action });

  } catch (err) {
    return json({ error: "Erreur serveur : " + err.message });
  }
});
