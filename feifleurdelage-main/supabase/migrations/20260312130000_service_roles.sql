-- ──────────────────────────────────────────────────────────────
-- Étendre l'enum app_role avec 'responsable'
-- (doit être dans sa propre transaction, avant toute utilisation de la valeur)
-- ──────────────────────────────────────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable';
