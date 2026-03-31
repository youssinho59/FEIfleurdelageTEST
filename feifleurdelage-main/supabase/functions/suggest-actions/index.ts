import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(apiKey: string, system: string, userContent: string, maxTokens = 1000) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { context_type, data } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY non configuré dans les secrets Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseSystem = "Tu es un expert qualité dans un EHPAD français. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.";

    // ── Dictée vocale FEI ───────────────────────────────────────────────────

    if (context_type === "voice_fei") {
      const prompt = `À partir de cette dictée vocale d'un soignant, extrait les informations de l'événement indésirable.

Dictée : "${data.transcript}"

Types d'événements possibles : Chute, Erreur médicamenteuse, Fugue, Agressivité, Maltraitance, Infection, Autre
Services possibles : Administration, Cuisine, Technique, Lingerie, Animation, Soins/Hôtellerie

Réponds UNIQUEMENT avec ce JSON exact sans markdown ni backticks :
{
  "type_fei": "Chute",
  "service": "Soins/Hôtellerie",
  "lieu": "Chambre 12",
  "description": "texte reformulé proprement et objectivement"
}

Si une information n'est pas mentionnée, mets null.`;

      const response = await callAnthropic(apiKey, baseSystem, prompt, 500);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text);
      return new Response(JSON.stringify({ extracted: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Dictée vocale Plainte ───────────────────────────────────────────────

    if (context_type === "voice_plainte") {
      const prompt = `À partir de cette dictée vocale, extrait les informations de la plainte ou réclamation dans un EHPAD.

Dictée : "${data.transcript}"

Réponds UNIQUEMENT avec ce JSON exact sans markdown ni backticks :
{
  "objet": "résumé court de l'objet de la plainte",
  "description": "description reformulée proprement et objectivement"
}

Si une information n'est pas mentionnée, mets null.`;

      const response = await callAnthropic(apiKey, baseSystem, prompt, 500);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text);
      return new Response(JSON.stringify({ extracted: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Suggestions actions FEI ─────────────────────────────────────────────

    let userContent = "";

    if (context_type === "fei") {
      userContent = `Voici une fiche d'événement indésirable :

Type : ${data.type_fei}
Description : ${data.description}
Gravité : ${data.gravite}/5
Lieu : ${data.lieu}
Service : ${data.service ?? "Non précisé"}
Actions correctives initiales : ${data.actions_correctives || "Aucune"}

Propose 3 actions correctives adaptées à cet événement.
Pour chaque action, indique l'objectif PACQ stratégique associé parmi ces thématiques HAS/AVS : "La personne et ses droits", "L'accompagnement à l'autonomie", "L'accompagnement à la santé", "Les interactions avec l'environnement", "Le management et les ressources humaines", "La gestion et la qualité".
Réponds avec ce JSON exact :
{
"actions": [
{
"titre": "...",
"description": "...",
"priorite": "haute|moyenne|faible",
"thematique_pacq": "...",
"objectif_pacq": "..."
}
]
}`;
    } else if (context_type === "plainte") {
      userContent = `Voici une plainte ou réclamation dans un EHPAD :

Motif : ${data.objet}
Description : ${data.description}
Demandeur : ${data.demandeur}
Service : ${data.service || "Non précisé"}

Propose 3 actions correctives adaptées à cette plainte.
Pour chaque action, indique l'objectif PACQ stratégique associé parmi ces thématiques HAS/AVS : "La personne et ses droits", "L'accompagnement à l'autonomie", "L'accompagnement à la santé", "Les interactions avec l'environnement", "Le management et les ressources humaines", "La gestion et la qualité".
Réponds avec ce JSON exact :
{
"actions": [
{
"titre": "...",
"description": "...",
"priorite": "haute|moyenne|faible",
"thematique_pacq": "...",
"objectif_pacq": "..."
}
]
}`;
    // ── DUERP — Auto-complétion d'un risque ────────────────────────────────

    } else if (context_type === "duerp_complete") {
      const system = "Tu es un expert en prévention des risques professionnels en EHPAD (établissement d'hébergement pour personnes âgées dépendantes). Tu dois analyser une situation dangereuse et compléter une fiche DUERP. Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.";
      const prompt = `Unité de travail : ${data.unite_travail}\nSituation dangereuse : ${data.situation_dangereuse}\nComplète la fiche DUERP en JSON avec exactement ces champs :\n{\n"risques": "description des risques identifiés",\n"dommages": "dommages potentiels pour les agents",\n"effectif_expose": nombre entier estimé,\n"probabilite": nombre entre 1 et 4,\n"gravite": nombre entre 1 et 4,\n"criticite": nombre entre 1 et 16 (probabilite x gravite),\n"mesures_existantes": "mesures de prévention déjà en place typiquement dans un EHPAD",\n"mesures_proposees": "actions correctives recommandées",\n"priorite": "Faible" ou "Modérée" ou "Élevée" ou "Critique"\n}`;
      const response = await callAnthropic(apiKey, system, prompt, 1000);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── DUERP — Propositions de risques par unité de travail ────────────────

    } else if (context_type === "duerp_propositions") {
      const system = "Tu es un expert en prévention des risques professionnels en EHPAD (établissement d'hébergement pour personnes âgées dépendantes). Tu dois analyser une situation dangereuse et compléter une fiche DUERP. Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.";
      const prompt = `Unité de travail : ${data.unite_travail}\nGénère une liste de 10 risques professionnels typiques pour cette unité de travail dans un EHPAD.\nRéponds UNIQUEMENT en JSON valide, sans markdown :\n{\n"risques": [\n{\n"situation_dangereuse": "...",\n"risques": "...",\n"dommages": "...",\n"effectif_expose": nombre,\n"probabilite": 1-4,\n"gravite": 1-4,\n"criticite": nombre,\n"mesures_existantes": "...",\n"mesures_proposees": "...",\n"priorite": "Faible ou Modérée ou Élevée ou Critique"\n}\n]\n}`;
      const response = await callAnthropic(apiKey, system, prompt, 2000);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── Suggestion action CVS ────────────────────────────────────────────────

    } else if (context_type === "cvs_demande") {
      const system = "Tu es un expert qualité en EHPAD. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.";
      const prompt = `Une demande a été formulée lors d'une réunion du Conseil de la Vie Sociale (CVS) d'un EHPAD.

Catégorie : ${data.categorie}
Description : ${data.description}

Propose une action corrective concrète et réaliste (2-3 phrases maximum) pour répondre à cette demande.
Réponds UNIQUEMENT avec ce JSON exact :
{
  "suggestion": "texte de l'action proposée"
}`;
      const response = await callAnthropic(apiKey, system, prompt, 300);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text.trim());
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (context_type === 'audit_analyse') {
      const system = "Tu es un expert qualité en EHPAD. Réponds UNIQUEMENT en JSON valide sans markdown ni backticks.";
      const prompt = `Un audit a été réalisé dans un EHPAD.
Titre : ${data.titre}
Thème : ${data.theme}
Service : ${data.service}
Conformité globale : ${data.pourcentage_global}% (${data.total_conformes}/${data.total_audite})

Critères détaillés :
${data.criteres}

Analyse ces résultats et réponds UNIQUEMENT avec ce JSON exact :
{
  "constat": "Constat qualitatif en 3-4 phrases sur les résultats de l'audit",
  "propositions": [
    {
      "titre": "Titre court de l'action",
      "description": "Description concrète de l'action corrective à mener",
      "priorite": "haute|moyenne|faible"
    }
  ]
}
Propose 3 actions maximum, ciblées sur les critères en non-conformité.`;
      const response = await callAnthropic(apiKey, system, prompt, 800);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (context_type === 'audit_rapport') {
      const system = "Tu es un expert qualité en EHPAD. Rédige un rapport d'audit professionnel, structuré et complet.";
      const prompt = `Rédige un rapport d'audit complet pour un EHPAD.

DONNÉES DE L'AUDIT :
- Intitulé : ${data.intitule}
- Auditeur : ${data.qui}
- Thème : ${data.theme}
- Service : ${data.service}
- Période : ${data.date_debut} au ${data.date_fin}
- Référentiels : ${data.referentiels}
- Modalités : ${data.modalites}
- Échantillon : ${data.echantillon}

RÉSULTATS :
- Conformité globale : ${data.pourcentage_global}% (${data.total_conformes}/${data.total_audite})

Critères :
${data.criteres}

Points forts : ${data.points_forts || 'Non renseigné'}
Axes d'amélioration : ${data.points_amelioration || 'Non renseigné'}
Constat : ${data.constat || 'Non renseigné'}
Propositions d'actions : ${data.propositions}
Rédacteur : ${data.redacteur}

Rédige un rapport structuré avec introduction, résultats, analyse, conclusion et recommandations. Ton professionnel, adapté à un EHPAD.`;
      const response = await callAnthropic(apiKey, system, prompt, 1500);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const rapport = anthropicData.content[0].text.trim();
      return new Response(JSON.stringify({ rapport }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (context_type === "analyse_financiere") {
      const { periode, gf_courant, gf_precedent, top5_fournisseurs, nb_mandats } = data;
      const system = "Tu es un expert en gestion financière d'EHPAD public (établissement d'hébergement pour personnes âgées dépendantes). Tu analyses les dépenses de mandatement et proposes des commentaires de gestion pertinents. Réponds en texte structuré clair, en français, sans JSON ni markdown.";
      const prompt = `Analyse les dépenses de mandatement de l'EHPAD La Fleur de l'Âge pour la période ${periode}.

Données de la période :
- Total TTC : ${gf_courant.total.toFixed(2)} €
- GF1 (soins & hébergement) : ${gf_courant.GF1.toFixed(2)} €
- GF2 (personnel) : ${gf_courant.GF2.toFixed(2)} €
- GF3 (gestion courante) : ${gf_courant.GF3.toFixed(2)} €
- Nombre de mandats : ${nb_mandats}

Comparaison avec le mois précédent :
- Total TTC M-1 : ${gf_precedent.total.toFixed(2)} €
- GF1 M-1 : ${gf_precedent.GF1.toFixed(2)} €
- GF2 M-1 : ${gf_precedent.GF2.toFixed(2)} €
- GF3 M-1 : ${gf_precedent.GF3.toFixed(2)} €

Top 5 fournisseurs :
${top5_fournisseurs.map((f: any, i: number) => `${i + 1}. ${f.tiers} — ${f.montant_ttc.toFixed(2)} €`).join('\n')}

Rédige une analyse de gestion structurée avec :
1. Synthèse globale du mois
2. Analyse par groupe fonctionnel (évolutions notables vs mois précédent)
3. Observations sur les principaux fournisseurs
4. Points de vigilance éventuels
5. Recommandations concrètes pour la direction

Sois concis, factuel et orienté gestion publique hospitalière.`;
      const response = await callAnthropic(apiKey, system, prompt, 1500);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const analyse = anthropicData.content[0].text.trim();
      return new Response(JSON.stringify({ analyse }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (context_type === "cartographie_risque") {
      const system = "Tu es expert en gestion des risques en EHPAD. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.";
      const prompt = `Tu es expert en gestion des risques en EHPAD. Pour la catégorie de risques '${data.categorie}' dans un EHPAD, génère entre 3 et 6 risques typiques avec pour chacun : intitulé, descriptif, facteurs favorisants, mesures en place habituelles, une note de probabilité (1-5), une note de gravité (1-5), une note de niveau de maîtrise (1-5), et une proposition d'amélioration concrète. Réponds uniquement en JSON valide avec la clé 'risques' contenant un tableau.`;
      const response = await callAnthropic(apiKey, system, prompt, 2500);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const anthropicData = await response.json();
      const parsed = JSON.parse(anthropicData.content[0].text.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (context_type === "retex") {
      const system = "Tu es un expert qualité et gestion des risques dans un EHPAD français. Tu rédiges des comptes-rendus de RETEX (Retour d'EXpérience) structurés, professionnels et exploitables. Réponds en texte structuré clair, sans JSON.";
      const prompt = `Rédige un compte-rendu de RETEX structuré pour l'événement suivant dans un EHPAD.

ÉVÉNEMENT :
- Type : ${data.type_fei || "Non précisé"}
- Date : ${data.date_evenement || "Non précisée"}
- Lieu : ${data.lieu || "Non précisé"}
- Description : ${data.description || "Non précisée"}
- Actions correctives initiales : ${data.actions_correctives || "Aucune"}

ANALYSE RETEX SAISIE :
- Causes immédiates : ${data.causes_immediates || "Non renseigné"}
- Causes profondes : ${data.causes_profondes || "Non renseigné"}
- Facteurs contributifs : ${data.facteurs_contributifs || "Non renseigné"}
- Enseignements tirés : ${data.enseignements || "Non renseigné"}
- Actions préventives envisagées : ${data.actions_preventives || "Non renseigné"}
- Personnes impliquées : ${data.personnes_impliquees || "Non renseigné"}

Sur la base de ces éléments, rédige un compte-rendu RETEX complet avec les sections suivantes :
1. Résumé de l'événement
2. Analyse causale (causes immédiates, profondes, facteurs contributifs)
3. Enseignements tirés
4. Plan d'actions préventives recommandées
5. Conclusion

Adopte un ton professionnel adapté à un rapport qualité d'EHPAD.`;

      const response = await callAnthropic(apiKey, system, prompt, 1200);
      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anthropicData = await response.json();
      const compte_rendu = anthropicData.content[0].text.trim();
      return new Response(JSON.stringify({ compte_rendu }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(
        JSON.stringify({ error: "context_type invalide — attendu: fei | plainte | voice_fei | voice_plainte | duerp_complete | duerp_propositions | cvs_demande | audit_analyse | audit_rapport | retex | cartographie_risque | analyse_financiere" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await callAnthropic(
      apiKey,
      "Tu es un expert qualité dans un EHPAD français. Tu proposes des actions correctives concrètes et des objectifs qualité associés selon le référentiel HAS/AVS ESSMS. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.",
      userContent,
      1000
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Erreur API Anthropic ${response.status}: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await response.json();
    const text = anthropicData.content[0].text;
    const parsed = JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
