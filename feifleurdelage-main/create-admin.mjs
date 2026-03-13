/**
 * Script de création du compte administrateur.
 *
 * 1. Copiez votre service_role key depuis :
 *    Supabase Dashboard → Settings → API → service_role (secret)
 * 2. Collez-la dans SERVICE_ROLE_KEY ci-dessous
 * 3. Lancez : node create-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL        = "https://ciflawnwdldeevabgnsk.supabase.co";
const SERVICE_ROLE_KEY    = "COLLER_ICI_LA_SERVICE_ROLE_KEY"; // ← à remplir

// ─── Données du compte ────────────────────────────────────────────────────────
const PRENOM    = "Youssef";
const NOM       = "BENABDELKARIM";
const PASSWORD  = "1234";
// ─────────────────────────────────────────────────────────────────────────────

if (SERVICE_ROLE_KEY === "COLLER_ICI_LA_SERVICE_ROLE_KEY") {
  console.error("❌  Veuillez d'abord renseigner SERVICE_ROLE_KEY dans ce fichier.");
  process.exit(1);
}

const normalize = (s) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const email     = `${normalize(PRENOM)}.${normalize(NOM)}@agent.internal`;
const fullName  = `${PRENOM} ${NOM}`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log(`\n📧 Email qui sera créé : ${email}`);
  console.log(`👤 Nom complet         : ${fullName}\n`);

  // 1. Créer l'utilisateur auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true, // pas besoin de validation par email
  });

  if (userError) {
    console.error("❌  Erreur création utilisateur :", userError.message);
    process.exit(1);
  }

  const userId = userData.user.id;
  console.log(`✅  Utilisateur créé  (id: ${userId})`);

  // 2. Créer le profil
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, full_name: fullName });

  if (profileError) {
    console.error("⚠️   Erreur profil (peut être ignorée si déjà existant) :", profileError.message);
  } else {
    console.log("✅  Profil créé");
  }

  // 3. Attribuer le rôle admin
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });

  if (roleError) {
    console.error("❌  Erreur attribution rôle admin :", roleError.message);
    process.exit(1);
  }

  console.log("✅  Rôle admin attribué");
  console.log(`\n🎉  Compte créé avec succès !`);
  console.log(`    Email    : ${email}`);
  console.log(`    Password : ${PASSWORD}`);
  console.log(`    Onglet   : "Agent" sur la page de login\n`);
}

run().catch((e) => {
  console.error("Erreur inattendue :", e);
  process.exit(1);
});
