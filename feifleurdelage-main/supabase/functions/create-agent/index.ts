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

    // Vérifier le rôle admin via REST
    const rolesRes = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${caller.id}&role=eq.admin&select=role`,
      { headers: adminHeaders }
    );
    const roles = await rolesRes.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return json({ error: "Accès refusé : vous n'êtes pas administrateur" });
    }

    const { nom, prenom, password, role, services, agentService } = await req.json();
    if (!nom || !prenom || !password) {
      return json({ error: "Nom, prénom et mot de passe sont requis" });
    }
    if (role === "responsable" && (!Array.isArray(services) || services.length === 0)) {
      return json({ error: "Au moins un service est requis pour le rôle Responsable" });
    }

    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const fakeEmail = `${normalize(prenom)}.${normalize(nom)}@agent.internal`;
    const fullName = `${prenom.trim()} ${nom.trim()}`;

    // Créer l'utilisateur via l'API admin Auth
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email: fakeEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });
    const newUser = await createRes.json();
    if (!createRes.ok) {
      return json({ error: "Création impossible : " + (newUser.message || newUser.error_description || JSON.stringify(newUser)) });
    }

    // Appliquer le rôle si différent de 'user' (le trigger met 'user' par défaut)
    if (role === "admin" || role === "responsable") {
      await fetch(
        `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${newUser.id}`,
        { method: "DELETE", headers: adminHeaders }
      );
      await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ user_id: newUser.id, role }),
      });
    }

    // Insérer les services dans user_services (responsable = multi, agent = mono)
    if (role === "responsable" && Array.isArray(services) && services.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/user_services`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(services.map((s: string) => ({ user_id: newUser.id, service: s }))),
      });
    }
    if (role === "user" && agentService) {
      await fetch(`${supabaseUrl}/rest/v1/user_services`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify([{ user_id: newUser.id, service: agentService }]),
      });
    }

    return json({
      success: true,
      user_id: newUser.id,
      identifiant: fakeEmail.replace("@agent.internal", ""),
    });

  } catch (err) {
    return json({ error: "Erreur serveur : " + err.message });
  }
});
