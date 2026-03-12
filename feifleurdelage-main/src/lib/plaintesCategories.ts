export type PlainteCategorieFamille = {
  famille: string;
  color: string;
  items: string[];
};

export const PLAINTE_CATEGORIES: PlainteCategorieFamille[] = [
  {
    famille: "Qualité des soins",
    color: "#3b82f6",
    items: [
      "Prise en charge médicale",
      "Gestion de la douleur",
      "Hygiène et soins corporels",
      "Médicaments/traitements",
    ],
  },
  {
    famille: "Vie quotidienne",
    color: "#f59e0b",
    items: [
      "Qualité des repas",
      "Propreté des chambres/locaux",
      "Linge/entretien",
      "Activités et animation",
    ],
  },
  {
    famille: "Relations et communication",
    color: "#8b5cf6",
    items: [
      "Comportement du personnel",
      "Manque d'information/communication",
      "Non-respect de la dignité",
      "Relations entre résidents",
    ],
  },
  {
    famille: "Organisation",
    color: "#f97316",
    items: [
      "Délais de prise en charge",
      "Horaires/planning",
      "Accès aux soins extérieurs",
      "Facturation/administratif",
    ],
  },
  {
    famille: "Sécurité",
    color: "#ef4444",
    items: [
      "Chute/accident",
      "Fugue",
      "Vol ou perte d'objet",
      "Conditions d'hébergement",
    ],
  },
];

/** Map: catégorie → famille */
export const CATEGORIE_TO_FAMILLE: Record<string, string> = Object.fromEntries(
  PLAINTE_CATEGORIES.flatMap(({ famille, items }) =>
    items.map((item) => [item, famille])
  )
);

/** Map: famille → couleur */
export const FAMILLE_COLOR: Record<string, string> = Object.fromEntries(
  PLAINTE_CATEGORIES.map(({ famille, color }) => [famille, color])
);
