export const THEMATIQUES_ESSMS = [
  { id: "droits",        label: "La personne et ses droits",                    color: "blue"   },
  { id: "autonomie",     label: "L'accompagnement à l'autonomie",               color: "green"  },
  { id: "sante",         label: "L'accompagnement à la santé",                  color: "red"    },
  { id: "environnement", label: "Les interactions avec l'environnement",        color: "purple" },
  { id: "rh",            label: "Le management et les ressources humaines",     color: "orange" },
  { id: "qualite",       label: "La gestion et la qualité",                     color: "teal"   },
] as const;

export const ANNEES_INDICATEURS = [2024, 2025, 2026, 2027, 2028] as const;

export type ThematiqueId = (typeof THEMATIQUES_ESSMS)[number]["id"];
export type AnneeIndicateur = (typeof ANNEES_INDICATEURS)[number];
