import { supabase } from "@/integrations/supabase/client";

const MOCK_FEI = [
  {
    date_evenement: "2025-09-14",
    type_fei: "Fugue",
    lieu: "Jardin thérapeutique",
    gravite: 5,
    description:
      "M. Bernard, résident de la chambre 4, a tenté de franchir la clôture du jardin thérapeutique lors de la promenade de 14h. Retrouvé par l'agent de surveillance à 50m de l'établissement. Aucune blessure physique constatée mais forte agitation résiduelle.",
    actions_correctives:
      "Alerte immédiate de la famille. Renforcement de la surveillance lors des sorties. Révision du protocole de promenade. Pose d'une alarme supplémentaire sur la porte d'accès au jardin.",
    declarant_nom: "Infirmière Martin",
    statut: "cloture",
    analyse:
      "Facteur causal : comportement déambulant lié à la démence sévère de stade avancé. Facteur favorisant : sous-effectif ce jour (2 soignants pour 18 résidents). L'entretien annuel de sécurité du jardin n'avait pas été réalisé.",
    plan_action:
      "1. Revoir la composition des équipes lors des sorties jardins. 2. Former tous les soignants au protocole fugue. 3. Vérifier l'état des clôtures chaque semaine. 4. Réviser le projet de soin du résident.",
    retour_declarant:
      "Incident analysé et clôturé. Protocole mis à jour et diffusé à l'équipe. Merci de votre vigilance.",
    date_cloture: "2025-10-01",
  },
  {
    date_evenement: "2025-10-08",
    type_fei: "Erreur médicamenteuse",
    lieu: "Salle de soins - RDC",
    gravite: 4,
    description:
      "Administration d'un comprimé de Ramipril 10mg à Mme Lefebvre (chambre 9) à la place de son traitement Ramipril 5mg habituel. L'erreur a été détectée lors du passage de l'infirmière de nuit. Surveillance tensionnelle renforcée mise en place. Tension mesurée à 85/55 à 3h du matin.",
    actions_correctives:
      "Surveillance tensionnelle toutes les 2 heures pendant 12h. Appel du médecin traitant. Information de la famille. Déclaration ANSM effectuée.",
    declarant_nom: "Infirmière Martin",
    statut: "cloture",
    analyse:
      "L'erreur provient d'une mauvaise vérification du pilulier préparé la veille. Le pilulier n'a pas été contre-validé par une deuxième infirmière comme stipulé dans le protocole. Surcharge de travail identifiée comme facteur favorisant.",
    plan_action:
      "1. Réintroduction obligatoire de la double-validation des piluliers. 2. Réunion d'équipe sur la gestion des médicaments. 3. Mise à jour du protocole de préparation des piluliers. 4. Affichage du protocole en salle de soins.",
    retour_declarant:
      "Erreur analysée, aucune conséquence grave pour la résidente. Protocoles renforcés, merci de votre réactivité.",
    date_cloture: "2025-10-20",
  },
  {
    date_evenement: "2025-11-15",
    type_fei: "Chute",
    lieu: "Chambre 12",
    gravite: 3,
    description:
      "Mme Dupont, 84 ans, retrouvée au sol à côté de son lit lors du passage de nuit à 3h15. Se plaint de douleur à la hanche droite. Aucune plaie visible. La patiente a tenté de se lever seule pour aller aux toilettes sans appeler. Bilan radiologique effectué au CH : fracture du col du fémur confirmée.",
    actions_correctives:
      "Appel du médecin de garde et transfert en urgence au CH de Melun. Information de la famille à 3h30. Rédaction du compte-rendu d'incident.",
    declarant_nom: "Aide-soignante Leclerc",
    statut: "actions_en_cours",
    analyse:
      "La résidente présente un risque de chute élevé (score de Morse 65). Le plan de prévention avait identifié ce risque mais les barrières de lit n'avaient pas été remontées après le coucher. Facteur de risque supplémentaire : prise d'hypnotiques.",
    plan_action:
      "1. Revoir le plan de prévention des chutes. 2. Installer un tapis anti-dérapant et un détecteur de lever au lit. 3. Sensibiliser l'équipe de nuit. 4. Réévaluation du traitement médicamenteux.",
    retour_declarant:
      "FEI prise en charge, plan de prévention des chutes révisé pour tous les résidents à risque élevé.",
    date_cloture: null,
  },
  {
    date_evenement: "2025-12-02",
    type_fei: "Infection",
    lieu: "Chambre 7",
    gravite: 2,
    description:
      "Détection d'une infection urinaire récurrente chez M. Garcia (chambre 7). Troisième épisode en deux mois. ECBU positif à E. coli résistant aux fluoroquinolones. Antibiothérapie adaptée prescrite selon antibiogramme. Surveillance rapprochée mise en place.",
    actions_correctives:
      "Mise en place d'une antibiothérapie ciblée par voie orale. Hydratation renforcée à 1,5L/jour. Soins d'hygiène intime renforcés. Information de la famille.",
    declarant_nom: "Infirmière Petit",
    statut: "cloture",
    analyse:
      "Récurrence liée à une sonde vésicale à demeure posée depuis 6 semaines. Évaluation de la nécessité du maintien de la sonde non réalisée à la date prévue. Révision urgente indiquée.",
    plan_action:
      "1. Réévaluation systématique de l'indication de la sonde vésicale à J15. 2. Protocole de soins de la sonde renforcé. 3. Déclaration au CPIAS si nouvelle récidive sous 3 mois.",
    retour_declarant:
      "Infection traitée avec succès. Sonde retirée et alternative thérapeutique mise en place. Aucune récidive depuis 6 semaines.",
    date_cloture: "2026-01-10",
  },
  {
    date_evenement: "2026-01-20",
    type_fei: "Agressivité",
    lieu: "Couloir Est - Étage 2",
    gravite: 2,
    description:
      "M. Rousseau (chambre 18) a eu un comportement agressif envers l'aide-soignante lors de la toilette du matin. Il a bousculé l'agent et proféré des insultes. Le soin a été interrompu et repris 20 minutes plus tard par un autre soignant. Aucune blessure physique constatée. Le résident présente des troubles cognitifs modérés.",
    actions_correctives:
      "Report du soin et reprise avec un autre soignant. Appel du médecin pour réévaluation du traitement anxiolytique. Soutien proposé à l'aide-soignante concernée. Inscription au cahier de liaison.",
    declarant_nom: "Aide-soignante Bernard",
    statut: "en_cours_analyse",
    analyse: null,
    plan_action: null,
    retour_declarant: null,
    date_cloture: null,
  },
  {
    date_evenement: "2026-02-05",
    type_fei: "Autre",
    lieu: "Chambre 3",
    gravite: 3,
    description:
      "Découverte d'une escarre de stade II au niveau sacré lors du soin de Mme Lambert (chambre 3). La résidente est alitée depuis 15 jours suite à une pneumonie. Le plan de prévention anti-escarre préconisait des soins de positionnement toutes les 3h, non réalisés de façon systématique selon le cahier de transmissions.",
    actions_correctives:
      "Pansement hydrocolloïde posé par l'infirmière. Matelas anti-escarre commandé en urgence. Protocole de repositionnement intensifié toutes les 2h. Information de la famille et du médecin traitant.",
    declarant_nom: "Infirmière Martin",
    statut: "nouveau",
    analyse: null,
    plan_action: null,
    retour_declarant: null,
    date_cloture: null,
  },
];

const MOCK_PLAINTES = [
  {
    date_plainte: "2025-09-22",
    demandeur: "Famille",
    objet: "Absence de communication avec le médecin coordonnateur",
    description:
      "La famille de Mme Girard signale ne pas avoir eu de contact avec le médecin depuis 3 mois malgré plusieurs demandes téléphoniques et courriels. Ils souhaitent un bilan complet de l'état de santé de leur mère et une discussion sur l'évolution du projet de soins individualisé.",
    reponse_apportee:
      "Rendez-vous organisé avec le médecin coordonnateur dans les 72h. Mise en place d'un point trimestriel systématique avec les familles. Création d'une adresse mail dédiée famille-médecin.",
    declarant_nom: "Marie Dubois",
    statut: "traite",
  },
  {
    date_plainte: "2025-10-05",
    demandeur: "Résident",
    objet: "Délai de réponse à la sonnette trop long",
    description:
      "M. Moreau (chambre 22) se plaint régulièrement d'attendre plus de 30 minutes avant qu'un soignant réponde à sa sonnette, notamment en soirée et le week-end. Il exprime une grande anxiété face à cette situation et craint de ne pas être secouru en cas de chute. La situation est documentée depuis 3 semaines.",
    reponse_apportee:
      "Analyse du planning de soirée réalisée. Redistribution des secteurs pour les agents de nuit. Objectif fixé : réponse sous 10 minutes. Installation d'un système de priorisation des sonnettes urgentes. Retour communiqué au résident.",
    declarant_nom: "Sophie Lambert",
    statut: "traite",
  },
  {
    date_plainte: "2025-11-20",
    demandeur: "Famille",
    objet: "Qualité et présentation des repas insuffisante",
    description:
      "La fille de Mme Simon signale que les repas sont souvent froids à l'arrivée dans les chambres et que la présentation laisse à désirer. Elle note également que sa mère, ayant des difficultés de mastication, ne reçoit pas systématiquement les repas en texture adaptée (mixé/haché) malgré les prescriptions diététiques en place.",
    reponse_apportee: null,
    declarant_nom: "Marie Dubois",
    statut: "en_cours",
  },
  {
    date_plainte: "2025-12-10",
    demandeur: "Résident",
    objet: "Nuisances sonores nocturnes récurrentes",
    description:
      "M. Leroy (chambre 14) se plaint de bruits récurrents la nuit entre 2h et 4h du matin, provenant de la chambre voisine où réside un résident présentant des troubles du comportement nocturne importants. Il indique que son sommeil est fortement perturbé depuis plusieurs semaines, impactant son état de santé général.",
    reponse_apportee: null,
    declarant_nom: "Sophie Lambert",
    statut: "en_cours",
  },
  {
    date_plainte: "2026-01-15",
    demandeur: "Visiteur",
    objet: "Manque d'information et accueil défaillant à l'entrée",
    description:
      "Un visiteur signale avoir attendu 25 minutes à l'accueil sans être pris en charge lors d'une visite à 14h30. Le panneau d'information sur les conditions de visite n'était pas à jour et les horaires affichés étaient incorrects. Il note également une absence de gel hydroalcoolique disponible à l'entrée principale.",
    reponse_apportee: null,
    declarant_nom: "Jean-Pierre Moreau",
    statut: "nouveau",
  },
  {
    date_plainte: "2026-02-01",
    demandeur: "Personnel",
    objet: "Matériel de transfert défectueux - risque sécurité immédiat",
    description:
      "Deux aides-soignantes signalent que le lève-patient du couloir Ouest est défectueux : la sangle principale présente une usure importante visible et le système de blocage est intermittent. Elles ont refusé de l'utiliser par sécurité pour les résidents et elles-mêmes, mais ne disposent pas d'équipement de remplacement sur ce secteur. Situation bloquante pour les soins.",
    reponse_apportee: null,
    declarant_nom: "Marie Dubois",
    statut: "nouveau",
  },
];

export const insertSeedData = async (userId: string) => {
  const feiToInsert = MOCK_FEI.map((f) => ({ ...f, user_id: userId }));
  const plaintesToInsert = MOCK_PLAINTES.map((p) => ({ ...p, user_id: userId }));

  const [feiResult, plaintesResult] = await Promise.all([
    supabase.from("fei").insert(feiToInsert),
    supabase.from("plaintes").insert(plaintesToInsert),
  ]);

  return { feiResult, plaintesResult };
};
