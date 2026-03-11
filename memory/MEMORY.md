# EHPAD FEI App — Mémoire Projet

## Structure du projet
- Dossier source réel : `feifleurdelage-main/feifleurdelage-main/src/`
- Stack : React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + Recharts + Framer Motion

## Pages principales
- `pages/Dashboard.tsx` — Tableau de bord avec stats et accès rapide
- `pages/StatsPage.tsx` — Statistiques complètes (FEI + Plaintes) avec graphiques riches
- `pages/FeiFormPage.tsx` — Saisie FEI (formulaire multi-étapes)
- `pages/FeiManagementPage.tsx` — Gestion et traitement des FEI (admin)
- `pages/PlaintesFormPage.tsx` — Saisie plaintes/réclamations
- `pages/MesFeiPage.tsx` — Historique des FEI de l'utilisateur

## Modèles de données (Supabase)
### Table `fei`
- `type_fei` : "Chute", "Erreur médicamenteuse", "Fugue", "Agressivité", "Maltraitance", "Infection", "Autre"
- `statut` : "nouveau", "en_cours_analyse", "actions_en_cours", "cloture", "archive"
- `gravite` : 1 (Mineure) à 5 (Critique)

### Table `plaintes`
- `demandeur` : "Résident", "Famille", "Personnel", "Visiteur", "Autre"
- `statut` : "nouveau", "en_cours", "traite"

## Données de démonstration
- `lib/seedData.ts` — 6 FEI variées (sept 2025 → fév 2026) + 6 plaintes variées
- Bouton "Données démo" dans StatsPage (admin uniquement) → appelle `insertSeedData(userId)`

## StatsPage — Charts disponibles
- KPI FEI : Total, Gravité moyenne, % Clôturées, FEI critiques
- KPI Plaintes : Total, En cours, Taux résolution, Déclarants actifs
- Évolution mensuelle (LineChart FEI + Plaintes)
- Répartition par type FEI (PieChart)
- Distribution gravités (BarChart coloré)
- Statut FEI (Horizontal BarChart)
- Lieux les plus touchés (Horizontal BarChart)
- Top déclarants (Horizontal BarChart)
- Plaintes par demandeur (PieChart)
- Statut plaintes (Horizontal BarChart + jauge résolution)
- Liste actions correctives

## Notes
- `npm run build` fonctionne (dans `feifleurdelage-main/feifleurdelage-main/`)
- Warning CSS : `@import` Google Fonts après `@tailwind` (non bloquant)
- Warning bundle size (>500kB) lié à recharts/html2canvas (non bloquant)
