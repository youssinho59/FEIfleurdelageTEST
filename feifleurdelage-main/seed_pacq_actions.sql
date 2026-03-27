-- ÉTAPE 2 — Insertion des actions PACQ Stratégique (source Ageval)
-- Pilote non renseigné (NULL) — à compléter manuellement dans l'application
-- Exécuter APRÈS la migration 20260327000001 et APRÈS l'ÉTAPE 1 (objectifs)

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre le déploiement régulier de formations sur le secret professionnel et les modalités de partage d''informations', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '08';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Rédiger une procédure sur le partage d''informations des professionnels, le secret partagé et la confidentialité', 'Normale', 'Non initié', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '08';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Veiller à la sécurité des mots de passe (renouvellement régulier, verrouillage des postes informatiques)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '08';

-- Réf. 09
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Afficher lors des échéances électorales les informations relatives à l''inscription aux listes électorales et aux modalités de vote par procuration', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '09';

-- Réf. 10
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Construire et organiser régulièrement des formations sur la bientraitance', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '10';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer des ateliers bientraitance réguliers pour les professionnels sur des situations observées', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '10';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et faire vivre la cellule de veille et d''accompagnement', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '10';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des formations sur des pathologies ciblées (parkinson, démence etc.)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '10';

-- Réf. 01
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Contacter la famille avant le PVI pour échanger sur les besoins des résidents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '01';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Doter tous les nouveaux résidents d''un PVI dans les 6 mois suivant leur entrée et l''actualiser au moins une fois par an', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '01';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et remplir régulièrement un tableau de programmation des PVI', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '01';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place un groupe de travail afin de revoir les modalités d''établissement et l''actualisation des PVI', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '01';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre un tableau affichant la date et l''heure dans les salles à manger pour permettre un repérage temporel', 'Normale', 'Non initié', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '01';

-- Réf. 02
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement les contrats de séjour et règlement de fonctionnement', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '02';

-- Réf. 03
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Diffuser le journal interne non plus trimestriellement mais mensuellement', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '03';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Diffuser régulièrement les rétrospectives, informations courantes et évènements à venir sur l''écran d''accueil', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '03';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Diffuser régulièrement un article sur la page Facebook de la Résidence', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '03';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des cafés paroles', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '03';

-- Réf. 04
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre à la disposition des résidents des tablettes sur demande et organiser des sessions skype sur demande', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '04';

-- Réf. 31
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des techniques non médicamenteuses axées sur l''utilisation d''huiles essentielles (aromathérapie)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '31';

-- Réf. 34
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former régulièrement le personnel à la détection, à l''évaluation et à la prise en charge de la douleur', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '34';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser régulièrement les agents à l''utilisation des échelles d''évaluation de la douleur et à leurs modalités d''utilisation', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '34';

-- Réf. 35
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Assurer un bilan annuel du PASA', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer régulièrement des formations sur les troubles du comportement et la démence', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer des formations sur la psychogériatrie', 'Normale', 'Non initié', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les évaluations gériatriques', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier l''opportunité de déployer des dispositifs numériques de prévention des chutes', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Faire passer les bilans psychométriques tous les 6 mois pour les résidents accueillis dans le PASA', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des réunions PASA', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '35';

-- Réf. 36
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Améliorer la prise en charge des multichuteurs', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '36';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Étudier les dispositifs anti-chutes existants et essayer d''obtenir un financement pour déployer l''un d''entre eux', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '36';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et organiser régulièrement une formation interne sur la prévention des chutes', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '36';

-- Réf. 37
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre la sensibilisation des agents sur la prévention et le traitement des escarres', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '37';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser régulièrement un audit sur les escarres', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '37';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Utiliser de manière régulière les échelles d''évaluation des escarres pour les résidents alités', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '37';

-- Réf. 32
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser régulièrement un audit des changes', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '32';

-- Réf. 33
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer des formations axées sur le bien-être (toucher massage etc.)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '33';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer la médiation animale', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '33';

-- Réf. 48
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser une formation à la carte sur la maladie de Parkinson et former tous les agents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '48';

-- Réf. 43
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les animations festives', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '43';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les animations individuelles', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '43';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les animations inter-EHPAD', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '43';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les semaines à thème mobilisant l''équipe pluridisciplinaire', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '43';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Rédiger la fiche de poste de l''ASG détachée à l''animation', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '43';

-- Réf. 26
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Assurer le relevé mensuel du poids de chaque résident', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer régulièrement des actions visant à améliorer la santé bucco-dentaire des résidents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Formaliser le protocole d''enrichissement alimentaire', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser des formations internes sur la nutrition et l''utilisation des compléments alimentaires', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre les travaux du groupe de travail sur la nutrition', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Protocoliser la gestion et la distribution des repas diabétiques', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une formation sur la cuisson à basse température et mettre en place ce type de cuisson', 'Normale', 'Planification', '2027-02-28'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une formation sur la dénutrition auprès des agents hôteliers et soignants', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Recueillir les goûts des résidents lors de l''admission', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '26';

-- Réf. 05
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Améliorer l''aménagement des espaces extérieurs (bancs, potager, fontaines, mobilier, jardins)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '05';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Améliorer l''aménagement et la décoration des espaces intérieurs', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '05';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Renouveler le mobilier de l''accueil temporaire', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '05';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Rénover les salles de bain des chambres de l''hébergement permanent à chaque sortie', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '05';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Repeindre les couloirs des chambres et changer les revêtements des portes, mettre en place des tableaux', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '05';

-- Réf. 45
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Planifier régulièrement des audits des parties communes', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '45';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser la traçabilité de l''entretien des locaux par tablette', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '45';

-- Réf. 25
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser un point régulier sur le trousseau des résidents (réalisé par la lingère)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '25';

-- Réf. 17
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Elaborer le DAMRI et mettre en œuvre les actions correctives qui en ressortent', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '17';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place un outil de traçabilité des dates de péremption des produits', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '17';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser un audit annuel sur l''hygiène des mains et des formations annuelles', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '17';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Prévoir des temps de formation et l''organisation d''audits réguliers sur l''utilisation du lave bassin', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '17';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un audit annuel sur la toilette', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '17';

-- Réf. 18
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser régulièrement le personnel et les résidents à la vaccination contre la grippe et le COVID', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '18';

-- Réf. 15
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre la réalisation annuelle des analyses légionelles', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '15';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une analyse annuelle de l''eau en cuisine', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '15';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Récupérer tous les ans les analyses de potabilité de l''eau et les insérer dans le classeur sanitaire', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '15';

-- Réf. 27
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et suivre le plan d''actions issu de la dernière visite des services vétérinaires', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '27';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un inventaire annuel', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '27';

-- Réf. 42
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Elaborer un document à destination des prescripteurs sur la politique de gestion du médicament', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '42';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Formaliser la politique du médicament en concertation avec les intervenants libéraux', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '42';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser de façon régulière les professionnels de santé libéraux n''ayant pas signé les conventions', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '42';

-- Réf. 38
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la possibilité d''indiquer la délégation de la prise de médicaments sur le logiciel de soins', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la possibilité de renseigner dans le logiciel de soins la traçabilité en direct des motifs de la non administration', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Formaliser des protocoles nominatifs d''administration médicamenteuse pour les prescriptions conditionnelles', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Identifier sur les piluliers les résidents ayant des troubles de la déglutition', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Inviter le pharmacien référent à la CCG', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser une réunion annuelle avec la pharmacie afin de faire le point sur le partenariat', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Rappeler les règles relatives à la délégation de la prise de médicaments', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'S''assurer que les contenants à médicaments soient systématiquement sécurisés lors de la livraison', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser les équipes aux risques d''erreurs médicamenteuses', 'Normale', 'Planification', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser régulièrement les médecins traitants à la régularisation des prescriptions établies en urgence', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '38';

-- Réf. 29
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former le personnel soignant aux urgences techniques en dehors des horaires de présence de l''équipe technique', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '29';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des formations AFGSU pour les soignants et les non soignants', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '29';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre régulièrement les formations internes sur la gestion des urgences', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '29';

-- Réf. 49
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Remplacer les entretoises', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réparer des dalles soulevées', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réparer le carrelage abimé', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réparer les baguettes d''angles décollés', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réparer les bas de portes', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réparer les plinthes cassés', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '49';

-- Réf. 12
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement les fiches de poste et fiches de tâches', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '12';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Construire la trame du rapport social unique et la remplir chaque année', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '12';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Faire du tri dans les dossiers agents existants', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '12';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Favoriser la communication des informations relatives au CGOS (prestations familiales etc.)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '12';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser régulièrement des points retraite individuel et collectif', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '12';

-- Réf. 13
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des sessions d''information sur les VAE', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '13';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Proposer de nombreuses formations internes', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '13';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un suivi annuel de l''alimentation du CPF', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '13';

-- Réf. 14
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser le DUERP', 'Normale', 'Non initié', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement le classeur des fiches de données sécurité des produits utilisés', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Contrôler régulièrement l''état des sols afin de remédier aux signes de dégradation', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer régulièrement des formations prévention des TMS', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer une formation PRAP sur les charges inertes', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Faire accompagner par l''ergothérapeute les équipes en cas de résidents compliqués à prendre en charge', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former régulièrement le personnel à l''utilisation des aides techniques', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former régulièrement le personnel à la gestion du stress et des agressions verbales', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former régulièrement le personnel au port de charges, aux gestes et aux postures de travail en sécurité', 'Normale', 'En cours', '2028-01-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former régulièrement le personnel au risque de chute', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des actions QVT', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des échauffements du personnel', 'Normale', 'Non initié', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement une sensibilisation sur l''hygiène des mains à destination des résidents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre la sensibilisation du personnel sur les AES', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un inventaire des produits dangereux', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser régulièrement le personnel à la bonne utilisation du SHA', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser régulièrement le personnel non soignant aux précautions standards et particulières', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Tester régulièrement du matériel ergonomique pour certains postes de travail', 'Normale', 'En cours', '2028-03-17'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Veiller au remplacement annuel des chaussures professionnelles des agents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Veiller au remplacement périodique du matériel de la trousse d''urgence', 'Normale', 'En cours', '2028-03-17'
FROM pacq_strategique_objectifs WHERE reference = '14';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Veiller régulièrement à ce que l''éclairage artificiel soit bien adapté et fonctionnel', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '14';

-- Réf. 47
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Continuer à déployer du matériel adapté en sollicitant les agents en amont', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer régulièrement des formations sur la gestion du stress / la sérénité relationnelle', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer régulièrement des sessions de formation "la voix du cœur" à destination des soignants', 'Normale', 'En cours', '2028-01-01'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Diffuser le compte rendu de la réunion du groupe QVT sur Titan et l''afficher', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Favoriser les temps d''échanges programmés individuels et collectifs avec la Direction et les encadrants', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Instaurer des temps hors soins (journées ou créneaux bien-être) pour les agents soignants', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des réunions d''information et d''appui pour les VAE', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et faire vivre une cellule de veille bientraitance', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mobiliser le simulateur de vieillissement', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mobiliser les professionnels lors des repas festifs avec les familles', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser des petits déjeuners conviviaux mensuels avec le personnel', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser des points sécurité réguliers entre les agents et un agent de l''équipe technique', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser des temps conviviaux avec les professionnels à l''intérieur comme à l''extérieur', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser le prêt du matériel de l''établissement aux agents (convention, suivi chiffré etc.)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des "vis mon métier"', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des réunions du groupe QVT', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser un noël / goûter estival annuel des enfants du personnel', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre l''amélioration des temps de doublon / intégration des nouveaux agents', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Proposer des cours de yoga/pilates aux professionnels', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '47';

-- Réf. 21
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des réunions avec l''ensemble des professionnels (AG)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '21';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des réunions d''équipe', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '21';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des réunions Direction/encadrant', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '21';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Revoir l''affichage afin qu''il soit optimisé (QR code pour les documents les plus lourds)', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '21';

-- Réf. 20
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser les conventions et établir régulièrement de nouvelles conventions', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '20';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place et abonder régulièrement une page Facebook', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '20';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Participer aux réflexions sur la mise en place des GTSMS', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '20';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre l''actualisation régulière du site Internet de la Résidence', 'Normale', 'En cours', '2028-12-21'
FROM pacq_strategique_objectifs WHERE reference = '20';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Poursuivre la participation aux travaux du GCMS Grand Lille', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '20';

-- Réf. 24
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Revoir la trame du rapport d''activités', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '24';

-- Réf. 19
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Envoyer le bilan annuel avec les indicateurs demandés dans le cadre du CPOM', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '19';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une coupe PMP et GMP en 2026 (mi-parcours CPOM)', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '19';

-- Égalité H/F Axe 1
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Informer sur les conséquences financières en cas de départ en formation', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF1';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Proposer annuellement une réunion d''information sur "comprendre son bulletin de salaire"', 'Normale', 'Non initié', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF1';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Remplir tous les ans l''index égalité hommes/femmes', 'Normale', 'En cours', NULL
FROM pacq_strategique_objectifs WHERE reference = 'EHF1';

-- Égalité H/F Axe 2
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Intégrer la mention d''égalité professionnelle dans les annonces de recrutements', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF2';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des vis mon métiers', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF2';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Veiller à la mixité des concours et examens professionnels', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF2';

-- Égalité H/F Axe 3
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mise en place d''ateliers sportifs', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF3';

-- Égalité H/F Axe 4
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Déployer des initiations à la self defense pour le personnel', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = 'EHF4';

-- Réf. 06
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement les classeurs documentaires', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Assurer régulièrement le suivi et l''actualisation du plan d''amélioration continue de la qualité', 'Normale', 'En cours', '2028-01-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer des RETEX', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Développer les audits', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Évaluer annuellement la satisfaction des résidents et de leur entourage', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre à disposition les classeurs documentaires sur ageval et les actualiser régulièrement', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Préparer et réaliser une nouvelle évaluation externe selon le calendrier fixé par les autorités', 'Normale', 'Non initié', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un nouveau projet d''établissement', 'Normale', 'Non initié', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une auto-évaluation', 'Normale', 'Non initié', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser les équipes et les résidents à la démarche d''évaluation externe', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '06';

-- Réf. 39
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Elaborer une procédure relative à la protection des biens des résidents', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '39';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Généraliser progressivement l''accès par badge (chambres des résidents de l''hébergement permanent)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '39';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Organiser régulièrement des exercices incendie', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '39';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser des tests de simulation de crise', 'Normale', 'Non initié', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '39';

-- Réf. 40
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement les contacts en cas d''urgence', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Afficher et sensibiliser les agents à l''interdiction de bloquer en position ouverte le portail de la zone de livraison', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Ajouter à la procédure d''urgences techniques les modalités de fermeture du portail donnant sur le parking', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Changer la serrure de la grille du jardin afin que le portillon soit verrouillé', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Doter les fenêtres donnant sur la voie publique de volets roulants', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la faisabilité d''installer des caméras au niveau de toutes les portes d''accès', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la faisabilité d''intégrer dans le SSI une remontée d''informations sur les DECT', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la faisabilité d''installer un dispositif anti-bélier devant le SAS d''entrée', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la possibilité d''installer un interphone pour sécuriser l''accès au quai de déchargement', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Etudier la possibilité de modifier l''accès par code au jardin extérieur', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Généraliser l''accès par badge dans l''ensemble du bâtiment', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Installer des films occultants sur les vitres intérieures de la salle à manger du RDC', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Installer des possibilités de verrouillage sur l''ensemble des portes d''accès à la salle à manger du RDC', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser des formations internes sur la gestion du risque intrusion', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser une vérification annuelle de tous les dispositifs d''oscillos battants des fenêtres', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Rédiger un dossier d''aide à l''intervention à destination des forces de l''ordre', 'Normale', 'Planification', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réduire la disparité des modèles de canons des serrures restantes', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Sensibiliser les agents et réaliser un affichage concernant la nécessité de fermer les portes donnant vers l''extérieur', 'Normale', 'Planification', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '40';

-- Réf. 23
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Adopter une politique de mot de passe utilisateur conforme aux recommandations de la CNIL', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Définir et déployer une politique d''archivage', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Faire des sensibilisations régulières aux agents sur la nécessité de changer régulièrement les mots de passe', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Former les encadrants et les IDE au risque en matière de cybersécurité', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre les bornes DECT sur un réseau à part', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réaliser un affichage mensuel visant à sensibiliser les agents aux risques en matière de cybersécurité', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '23';

-- Réf. 11
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Actualiser régulièrement le tableau de suivi des contrats et assurer son pilotage infra-annuel', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '11';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Résorber le déficit', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '11';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Suivre la diffusion des appels à projet et y répondre le plus souvent possible', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '11';

-- Réf. 22
INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Aménager les jardins (biodiversité / serres / jardinières surélevées)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Continuer à renégocier les marchés électricité et gaz via UGAP', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Étudier la faisabilité de déployer des panneaux solaires ou thermiques via le dispositif CEE', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Étudier la possibilité de changer les LEDs dans toute la Résidence via CEE', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Étudier les possibilités de financement CEE du changement de chaudière', 'Normale', 'En cours', '2027-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en œuvre la loi EGALIM (produits bio / produits locaux)', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des événements autour du développement durable', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Mettre en place des points de recyclage dans la Résidence', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Raccorder les chasses d''eau des WC de l''hébergement temporaire au puits', 'Normale', 'En cours', '2026-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Réunir régulièrement le groupe sur le développement durable', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';

INSERT INTO pacq_strategique_actions (objectif_id, intitule, priorite, avancement, echeance)
SELECT id, 'Utiliser un maximum le sanivap (nettoyeur vapeur) afin de limiter l''utilisation des produits chimiques', 'Normale', 'En cours', '2028-12-31'
FROM pacq_strategique_objectifs WHERE reference = '22';
