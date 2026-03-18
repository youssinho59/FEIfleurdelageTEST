-- ============================================================
-- SEED PACQ Stratégique — 48 objectifs Ageval ESSMS
-- 6 thématiques × 8 objectifs, avec actions
-- ============================================================

-- ─── THÉMATIQUE : droits (La personne et ses droits) ─────────

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Renforcer l''expression des droits et libertés des personnes accompagnées', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réviser et diffuser le livret d''accueil et la charte des droits', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Organiser une réunion annuelle de présentation des droits aux résidents et familles', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Former les professionnels au respect des droits fondamentaux', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Garantir le respect de la dignité et de l''intimité des résidents', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réaliser un audit des pratiques professionnelles sur la dignité', 'en_cours', 'Audit interne', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place des protocoles d''accompagnement respectant l''intimité', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Sensibiliser les équipes aux bonnes pratiques bientraitance HAS', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Assurer la participation active des personnes aux décisions les concernant', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Systématiser le recueil du consentement pour chaque acte de soin', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un groupe d''expression des résidents (CVS renforcé)', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Intégrer les résidents dans la démarche qualité', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Développer la bientraitance et prévenir toute forme de maltraitance', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Déployer le plan bientraitance pluriannuel', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Organiser des formations obligatoires bientraitance pour tous les agents', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Actualiser la procédure de signalement de maltraitance', 'en_cours', 'Réglementation', 3 FROM obj
UNION ALL SELECT id, 'Réaliser une enquête annuelle de satisfaction auprès des résidents', 'en_cours', 'Audit interne', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Améliorer l''information délivrée aux personnes et à leur entourage', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Créer un guide famille mis à jour annuellement', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Organiser des réunions d''information trimestrielles avec les familles', 'en_cours', 'Instance', 2 FROM obj
UNION ALL SELECT id, 'Mettre en place un espace numérique d''information famille', 'en_cours', 'Projet d''établissement 2026-2030', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Renforcer le dispositif de recueil et traitement des réclamations', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un registre numérique des réclamations/plaintes', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Former un référent bientraitance par service', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Analyser trimestriellement les FEI et plaintes en CODIR', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Garantir la protection juridique des personnes vulnérables', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Recenser les résidents sous mesure de protection', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Établir un partenariat avec les mandataires judiciaires', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Former les cadres aux obligations légales de protection', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('droits', 'Favoriser l''exercice de la citoyenneté et du lien social', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Organiser des temps de vote et participation citoyenne', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Développer les sorties et activités en lien avec la communauté locale', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Créer un journal interne rédigé avec les résidents', 'en_cours', 'Auto-évaluation', 3 FROM obj;

-- ─── THÉMATIQUE : autonomie (L'accompagnement à l'autonomie) ─

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Favoriser le maintien et le développement des capacités fonctionnelles', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un programme de gym douce quotidien', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Évaluer annuellement les capacités fonctionnelles (MMS, GIR)', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Développer la rééducation préventive avec le kinésithérapeute', 'en_cours', 'Projet d''établissement 2026-2030', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Soutenir l''autonomie dans les actes de la vie quotidienne', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Former les aides-soignants à la stimulation des capacités résiduelles', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Adapter les équipements aux besoins d''autonomie (barres d''appui, etc.)', 'en_cours', 'DUERP', 2 FROM obj
UNION ALL SELECT id, 'Évaluer l''impact des interventions sur le maintien de l''autonomie', 'en_cours', 'Audit interne', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Proposer des activités favorisant le bien-être et la socialisation', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Développer le programme d''animation (minimum 3 activités/semaine)', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Recruter ou former un animateur spécialisé gérontologie', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Évaluer la satisfaction des résidents vis-à-vis des activités', 'en_cours', 'Audit interne', 3 FROM obj
UNION ALL SELECT id, 'Développer les activités intergénérationnelles', 'en_cours', 'Projet d''établissement 2026-2030', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Adapter l''accompagnement aux besoins évolutifs de chaque résident', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réviser les projets personnalisés tous les 6 mois', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Organiser des réunions pluridisciplinaires de suivi par résident', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Impliquer les familles dans les révisions de projet personnalisé', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Développer les projets personnalisés en co-construction', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Former les équipes à l''approche centrée sur la personne', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un outil de recueil des habitudes de vie', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Évaluer le taux de co-construction effective des projets', 'en_cours', 'Évaluation externe 2027', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Prévenir les situations de dépendance évitable', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en œuvre le protocole de prévention de la dénutrition', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Développer la prévention des chutes (programme PRAPARE)', 'en_cours', 'DUERP', 2 FROM obj
UNION ALL SELECT id, 'Former les équipes au repérage de la fragilité', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Renforcer la prise en charge des troubles cognitifs', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Développer les ateliers de stimulation cognitive (Montessori, etc.)', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Former les équipes à la prise en charge des troubles comportementaux', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Adapter l''environnement aux personnes désorientées', 'en_cours', 'DUERP', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('autonomie', 'Améliorer la qualité nutritionnelle et la prise des repas', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un comité de liaison alimentation nutrition (CLAN)', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Personnaliser les textures et régimes alimentaires', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Rendre les repas convivaux et adaptés aux cultures', 'en_cours', 'Auto-évaluation', 3 FROM obj;

-- ─── THÉMATIQUE : sante (L'accompagnement à la santé) ─────────

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Assurer une prise en charge médicale et paramédicale de qualité', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réviser les protocoles de soins selon les recommandations HAS', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place une visite médicale systématique à l''entrée', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Développer la coordination médecin coordonnateur / médecin traitant', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Renforcer la prévention et la gestion des risques sanitaires', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un programme de vaccination annuel', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Actualiser le plan de maîtrise des infections nosocomiales', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Former les équipes aux précautions standard et complémentaires', 'en_cours', 'Auto-évaluation', 3 FROM obj
UNION ALL SELECT id, 'Réaliser des audits hygiène trimestriels', 'en_cours', 'Audit interne', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Améliorer la coordination avec les partenaires de santé extérieurs', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Formaliser les conventions avec les établissements hospitaliers', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Développer l''astreinte infirmière de nuit en réseau', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Renforcer les partenariats avec les équipes mobiles gériatriques', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Optimiser la gestion et la sécurisation du circuit du médicament', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place la prescription informatisée (logiciel métier)', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Former les IDE à la sécurisation du circuit du médicament', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Auditer les armoires à pharmacie chaque trimestre', 'en_cours', 'Audit interne', 3 FROM obj
UNION ALL SELECT id, 'Réviser le protocole de gestion des médicaments à risque', 'en_cours', 'Réglementation', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Développer les soins palliatifs et l''accompagnement en fin de vie', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Former l''ensemble des soignants aux soins palliatifs (base)', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Systématiser les directives anticipées à l''admission', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Établir un partenariat avec l''équipe mobile de soins palliatifs', 'en_cours', 'Projet d''établissement 2026-2030', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Lutter contre la douleur et promouvoir le confort des résidents', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Généraliser l''évaluation systématique de la douleur (EVA/Doloplus)', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Former les aides-soignants à l''évaluation de la douleur', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Mettre en place un protocole de traitement de la douleur', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Améliorer la prévention et le traitement des escarres', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Évaluer systématiquement le risque d''escarre à l''entrée (Braden)', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Former les équipes aux techniques de positionnement', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Auditer le taux d''escarres acquises et les déclarer en FEI', 'en_cours', 'Audit interne', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('sante', 'Renforcer la prévention et la prise en charge des chutes', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place le programme de prévention des chutes', 'en_cours', 'DUERP', 1 FROM obj
UNION ALL SELECT id, 'Analyser systématiquement chaque chute en pluridisciplinaire', 'en_cours', 'Cartographie des risques', 2 FROM obj
UNION ALL SELECT id, 'Équiper les chambres à risque de détecteurs de chute', 'en_cours', 'DUERP', 3 FROM obj
UNION ALL SELECT id, 'Former les équipes à la gestion du risque chute', 'en_cours', 'Auto-évaluation', 4 FROM obj;

-- ─── THÉMATIQUE : environnement (Les interactions avec l'environnement) ─

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Renforcer les partenariats avec les acteurs du territoire', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Cartographier les partenaires institutionnels et associatifs', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Formaliser des conventions de partenariat avec les acteurs clés', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Participer aux COTECH et COPIL territoriaux', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Développer les liens intergénérationnels et avec la communauté locale', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Organiser des rencontres régulières avec les écoles locales', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Développer les projets intergénérationnels (lecture, jardinage)', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Valoriser les résidents comme ressource mémorielle', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Améliorer l''accueil et l''accompagnement des familles et des proches', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Organiser une journée portes ouvertes annuelle', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un groupe de parole pour les familles', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Proposer des temps de formation aux familles aidants', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Favoriser l''ouverture de l''établissement sur l''extérieur', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Développer les sorties culturelles et de loisirs', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Accueillir des bénévoles formés au sein de l''établissement', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Communiquer sur les activités via les réseaux et la presse locale', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Développer les collaborations avec les structures médico-sociales du territoire', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Participer au Groupement Territorial Social et Médico-social', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Développer les partenariats avec SSIAD, accueil de jour, hôpital', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Organiser des formations croisées avec les partenaires', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Valoriser et partager les bonnes pratiques avec les partenaires', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Participer à des groupes de travail régionaux qualité', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Publier un rapport annuel d''activité accessible au public', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Présenter les innovations lors de colloques professionnels', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Renforcer la coordination avec les autorités de tutelle (ARS, CD)', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Préparer et transmettre les RALFSS dans les délais', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Suivre le CPOM et ses indicateurs avec l''ARS', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Participer aux journées ARS et CD thématiques qualité', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('environnement', 'Développer la responsabilité sociétale et environnementale (RSE)', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réaliser un bilan carbone de l''établissement', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un plan de réduction des déchets', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Former les équipes aux éco-gestes professionnels', 'en_cours', 'Auto-évaluation', 3 FROM obj;

-- ─── THÉMATIQUE : rh (Le management et les ressources humaines) ─

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Renforcer les compétences des professionnels par la formation continue', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Établir un plan de formation annuel aligné sur le projet d''établissement', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Atteindre 100 % de professionnels formés aux urgences (AFGSU)', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Développer la formation interne par compagnonnage', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Améliorer les conditions de travail et la qualité de vie au travail', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réaliser une enquête QVT annuelle auprès des agents', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place des groupes de parole pour les soignants', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Améliorer les conditions ergonomiques des postes de travail', 'en_cours', 'DUERP', 3 FROM obj
UNION ALL SELECT id, 'Développer la reconnaissance et la valorisation des équipes', 'en_cours', 'Auto-évaluation', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Développer le management participatif et la communication interne', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Organiser des réunions d''équipe mensuelles par service', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un tableau de bord de pilotage RH partagé', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Former les cadres au management bienveillant', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Fidéliser et attirer les talents au sein de l''établissement', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Développer des partenariats avec les IFAS et IFSI locaux', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un programme d''intégration des nouveaux agents', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Améliorer les entretiens annuels d''évaluation professionnelle', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Renforcer la prévention des risques professionnels', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Actualiser le DUERP annuellement avec les équipes', 'en_cours', 'DUERP', 1 FROM obj
UNION ALL SELECT id, 'Réduire le taux d''absentéisme de 10 % en 2 ans', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Mettre en place un programme de prévention des TMS', 'en_cours', 'DUERP', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Développer la culture qualité et l''engagement des équipes', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Organiser des journées qualité annuelles avec tous les agents', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Former les référents qualité de chaque service', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Valoriser les démarches d''amélioration initiées par les équipes', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Optimiser la gestion des plannings et la continuité de service', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Déployer un logiciel de gestion du temps et des activités (GTA)', 'en_cours', 'Projet d''établissement 2026-2030', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un pool de remplacement interne', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Définir des protocoles de continuité de service la nuit et le week-end', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('rh', 'Assurer la transmission et la gestion des connaissances', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un programme de tutorat pour les nouveaux agents', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Documenter les savoir-faire clés et créer des fiches de poste détaillées', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Organiser le transfert de compétences avant les départs en retraite', 'en_cours', 'Projet d''établissement 2026-2030', 3 FROM obj;

-- ─── THÉMATIQUE : qualite (La gestion et la qualité) ──────────

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Renforcer le système de management de la qualité', 1) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Formaliser la politique qualité et la diffuser à tous les agents', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place un comité qualité mensuel', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Désigner un responsable qualité formé', 'en_cours', 'Réglementation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Améliorer la gestion documentaire et la mise à jour des procédures', 2) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Recenser et mettre à jour toutes les procédures en 2026', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Déployer un logiciel de gestion documentaire (GED)', 'en_cours', 'Projet d''établissement 2026-2030', 2 FROM obj
UNION ALL SELECT id, 'Former les agents à l''utilisation du système documentaire', 'en_cours', 'Auto-évaluation', 3 FROM obj
UNION ALL SELECT id, 'Définir un cycle de révision documentaire (tous les 2 ans)', 'en_cours', 'Auto-évaluation', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Développer la démarche de gestion et d''analyse des risques', 3) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Actualiser la cartographie des risques annuellement', 'en_cours', 'Cartographie des risques', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place des RMM (Revues de Mortalité et Morbidité)', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Analyser 100 % des EIG avec la méthode ALARM', 'en_cours', 'Auto-évaluation', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Optimiser les processus transversaux de l''établissement', 4) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Cartographier les processus clés (soins, administratif, hôtelier)', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Mettre en place des indicateurs de performance par processus', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Réaliser des audits internes croisés entre services', 'en_cours', 'Audit interne', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Renforcer le pilotage des indicateurs qualité', 5) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place un tableau de bord qualité mensuel', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Saisir les indicateurs ANAP/ATIH dans les délais réglementaires', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Présenter les résultats qualité en CODIR et CVS', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Préparer et accompagner les démarches d''évaluation externe', 6) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Réaliser une auto-évaluation complète selon le référentiel HAS 2022', 'en_cours', 'Évaluation externe 2027', 1 FROM obj
UNION ALL SELECT id, 'Constituer et former le comité de pilotage évaluation externe', 'en_cours', 'Évaluation externe 2027', 2 FROM obj
UNION ALL SELECT id, 'Préparer les éléments de preuve pour l''évaluation externe 2027', 'en_cours', 'Évaluation externe 2027', 3 FROM obj
UNION ALL SELECT id, 'Mettre en œuvre le plan d''amélioration post-évaluation', 'en_cours', 'Évaluation externe 2027', 4 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Renforcer la déclaration et l''analyse des événements indésirables', 7) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Atteindre un taux de déclaration de FEI de 100 % des EI connus', 'en_cours', 'Auto-évaluation', 1 FROM obj
UNION ALL SELECT id, 'Former tous les agents à la déclaration d''événements indésirables', 'en_cours', 'Auto-évaluation', 2 FROM obj
UNION ALL SELECT id, 'Analyser et partager les retours d''expérience en équipe', 'en_cours', 'Instance', 3 FROM obj;

WITH obj AS (INSERT INTO pacq_strategique_objectifs (thematique, titre, ordre) VALUES ('qualite', 'Assurer la conformité réglementaire et la veille juridique', 8) RETURNING id)
INSERT INTO pacq_strategique_actions (objectif_id, titre, statut, source, ordre)
SELECT id, 'Mettre en place une veille réglementaire mensuelle', 'en_cours', 'Réglementation', 1 FROM obj
UNION ALL SELECT id, 'Transposer les nouvelles obligations réglementaires dans les procédures', 'en_cours', 'Réglementation', 2 FROM obj
UNION ALL SELECT id, 'Former la direction et les cadres aux évolutions législatives', 'en_cours', 'Réglementation', 3 FROM obj;
