export const THEMATIQUES_ESSMS = [
  { id: "droits",        label: "La personne et ses droits",                    color: "blue"   },
  { id: "autonomie",     label: "L'accompagnement à l'autonomie",               color: "green"  },
  { id: "sante",         label: "L'accompagnement à la santé",                  color: "red"    },
  { id: "environnement", label: "Les interactions avec l'environnement",        color: "purple" },
  { id: "rh",            label: "Le management et les ressources humaines",     color: "orange" },
  { id: "qualite",       label: "La gestion et la qualité",                     color: "teal"   },
] as const;

// ─── Thèmes réels Ageval / HAS (PACQ Stratégique) ─────────────────────────────

export const THEMES_AGEVAL = [
  { id: "Chapitre 1",               label: "Chap. 1 — La personne",        color: "indigo" },
  { id: "Chapitre 2",               label: "Chap. 2 — Les professionnels", color: "rose"   },
  { id: "Droits et participation",  label: "Droits et participation",       color: "blue"   },
  { id: "Parcours et accompagnement", label: "Parcours et accompagnement", color: "green"  },
  { id: "Qualite de vie",           label: "Qualité de vie",                color: "purple" },
  { id: "Sante et soins",           label: "Santé / Soins",                 color: "red"    },
  { id: "RH et Management",         label: "RH & Management",               color: "orange" },
  { id: "Demarche qualite",         label: "Démarche qualité",              color: "teal"   },
] as const;

export type ThemeAgevalId = (typeof THEMES_AGEVAL)[number]["id"];

export const ANNEES_INDICATEURS = [2024, 2025, 2026, 2027, 2028] as const;

export type ThematiqueId = (typeof THEMATIQUES_ESSMS)[number]["id"];
export type AnneeIndicateur = (typeof ANNEES_INDICATEURS)[number];

// ─── Objectifs prédéfinis HAS/AVS ESSMS ───────────────────────────────────────

export const OBJECTIFS_PAR_THEMATIQUE: Record<ThematiqueId, string[]> = {
  droits: [
    "Renforcer l'expression des droits et libertés des personnes accompagnées",
    "Garantir le respect de la dignité et de l'intimité des résidents",
    "Assurer la participation active des personnes accompagnées aux décisions les concernant",
    "Développer la bientraitance et prévenir toute forme de maltraitance",
    "Améliorer l'information délivrée aux personnes et à leur entourage",
    "Renforcer le dispositif de recueil et de traitement des réclamations",
  ],
  autonomie: [
    "Favoriser le maintien et le développement des capacités fonctionnelles",
    "Soutenir l'autonomie dans les actes de la vie quotidienne",
    "Proposer des activités favorisant le bien-être et la socialisation",
    "Adapter l'accompagnement aux besoins évolutifs de chaque résident",
    "Développer les projets personnalisés en co-construction avec les résidents",
    "Prévenir les situations de dépendance évitable",
  ],
  sante: [
    "Assurer une prise en charge médicale et paramédicale de qualité",
    "Renforcer la prévention et la gestion des risques sanitaires",
    "Améliorer la coordination avec les partenaires de santé extérieurs",
    "Optimiser la gestion et la sécurisation du circuit du médicament",
    "Développer les soins palliatifs et l'accompagnement en fin de vie",
    "Lutter contre la douleur et promouvoir le confort des résidents",
  ],
  environnement: [
    "Renforcer les partenariats avec les acteurs du territoire",
    "Développer les liens intergénérationnels et avec la communauté locale",
    "Améliorer l'accueil et l'accompagnement des familles et des proches",
    "Favoriser l'ouverture de l'établissement sur l'extérieur",
    "Développer les collaborations avec les structures médico-sociales du territoire",
    "Valoriser et partager les bonnes pratiques avec les partenaires",
  ],
  rh: [
    "Renforcer les compétences des professionnels par la formation continue",
    "Améliorer les conditions de travail et la qualité de vie au travail",
    "Développer le management participatif et la communication interne",
    "Fidéliser et attirer les talents au sein de l'établissement",
    "Renforcer la prévention des risques professionnels",
    "Développer la culture qualité et l'engagement des équipes",
  ],
  qualite: [
    "Renforcer le système de management de la qualité",
    "Améliorer la gestion documentaire et la mise à jour des procédures",
    "Développer la démarche de gestion et d'analyse des risques",
    "Optimiser les processus transversaux de l'établissement",
    "Renforcer le pilotage des indicateurs qualité",
    "Préparer et accompagner les démarches d'évaluation externe",
  ],
};
