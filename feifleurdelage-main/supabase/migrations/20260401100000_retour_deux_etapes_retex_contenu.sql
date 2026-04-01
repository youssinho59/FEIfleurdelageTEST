-- Migration: Retour en deux étapes (traitement + clôture) + retex_contenu + suivi PACQ instances

-- ── FEI : nouveaux champs retour ──────────────────────────────────────────────
ALTER TABLE fei
  ADD COLUMN IF NOT EXISTS retour_traitement      TEXT,
  ADD COLUMN IF NOT EXISTS date_retour_traitement DATE,
  ADD COLUMN IF NOT EXISTS retour_cloture         TEXT,
  ADD COLUMN IF NOT EXISTS date_retour_cloture    DATE,
  ADD COLUMN IF NOT EXISTS retex_contenu          TEXT;

-- ── Plaintes : nouveaux champs retour ─────────────────────────────────────────
ALTER TABLE plaintes
  ADD COLUMN IF NOT EXISTS retour_traitement      TEXT,
  ADD COLUMN IF NOT EXISTS date_retour_traitement DATE,
  ADD COLUMN IF NOT EXISTS retour_cloture         TEXT,
  ADD COLUMN IF NOT EXISTS date_retour_cloture    DATE;

-- ── Table suivi_pacq_instances ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suivi_pacq_instances (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance           TEXT NOT NULL,
  date               DATE NOT NULL,
  points_presentes   TEXT,
  decisions          TEXT,
  prochaine_echeance DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suivi_pacq_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access suivi_pacq_instances"
  ON suivi_pacq_instances FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Responsable read suivi_pacq_instances"
  ON suivi_pacq_instances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable'))
  );
