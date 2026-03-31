-- ── Référentiel des comptes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comptes_referentiel (
  compte TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  groupe_fonctionnel TEXT NOT NULL CHECK (groupe_fonctionnel IN ('GF1', 'GF2', 'GF3')),
  categorie TEXT NOT NULL
);

INSERT INTO comptes_referentiel VALUES
  ('6023',   'Aliments et produits alimentaires',      'GF1', 'Alimentation'),
  ('6063',   'Fournitures alimentaires',               'GF1', 'Alimentation'),
  ('60611',  'Eau et assainissement',                  'GF1', 'Fluides'),
  ('60612',  'Énergie (gaz, électricité)',             'GF1', 'Fluides'),
  ('60622',  'Produits d''entretien',                  'GF1', 'Entretien'),
  ('60623',  'Petit équipement',                       'GF1', 'Entretien'),
  ('60624',  'Fournitures de bureau',                  'GF1', 'Fournitures'),
  ('60625',  'Fournitures diverses',                   'GF1', 'Fournitures'),
  ('606261', 'Médicaments et produits pharmaceutiques','GF1', 'Pharmacie'),
  ('6066',   'Fournitures médicales',                  'GF1', 'Médical'),
  ('6068',   'Autres fournitures non stockées',        'GF1', 'Fournitures'),
  ('2154',   'Matériel médical',                       'GF1', 'Investissement'),
  ('2184',   'Mobilier',                               'GF1', 'Investissement'),
  ('6163',   'Assurances multirisques',                'GF3', 'Assurances'),
  ('6184',   'Documentation générale',                 'GF3', 'Documentation'),
  ('6188',   'Autres charges de gestion courante',     'GF3', 'Divers'),
  ('6228',   'Divers (dépenses de représentation)',    'GF3', 'Divers'),
  ('6248',   'Locations mobilières diverses',          'GF1', 'Locations'),
  ('6257',   'Réceptions et manifestations',           'GF1', 'Animation'),
  ('6261',   'Affranchissements',                      'GF3', 'Communication'),
  ('6262',   'Téléphone et internet',                  'GF3', 'Communication'),
  ('6281',   'Concessions, brevets (blanchisserie)',   'GF1', 'Sous-traitance'),
  ('6283',   'Nettoyage des locaux',                   'GF1', 'Entretien'),
  ('6288',   'Autres services extérieurs',             'GF1', 'Services'),
  ('6311',   'Taxes sur salaires',                     'GF2', 'Charges fiscales'),
  ('6333',   'Participation formation',                'GF2', 'Formation'),
  ('6336',   'Cotisations FEH',                        'GF2', 'Cotisations'),
  ('637',    'Redevances SACEM/SPRE',                  'GF3', 'Redevances'),
  ('61118',  'Sous-traitance activités',               'GF1', 'Sous-traitance'),
  ('61128',  'Entretien bâtiments',                    'GF1', 'Entretien'),
  ('61357',  'Maintenance matériel médical',           'GF1', 'Médical'),
  ('61358',  'Maintenance matériel hôtelier',          'GF1', 'Maintenance'),
  ('61558',  'Maintenance équipements',                'GF1', 'Maintenance'),
  ('61561',  'Maintenance informatique',               'GF3', 'Informatique'),
  ('61562',  'Maintenance autre matériel',             'GF1', 'Maintenance'),
  ('61568',  'Autres contrats de maintenance',         'GF1', 'Maintenance'),
  ('61681',  'Assurances responsabilité',              'GF3', 'Assurances'),
  ('62111',  'Personnel extérieur intérim',            'GF2', 'Personnel'),
  ('62113',  'Mise à disposition personnel',           'GF2', 'Personnel'),
  ('6475',   'Médecine du travail',                    'GF2', 'Personnel'),
  ('6488',   'Autres charges de personnel',            'GF2', 'Personnel'),
  ('64111',  'Cotisations mutuelles/prévoyance',       'GF2', 'Cotisations'),
  ('64513',  'Cotisations CGOS/ANFH',                  'GF2', 'Cotisations'),
  ('64515',  'Cotisation ATIACL',                      'GF2', 'Cotisations'),
  ('165',    'Remboursement dépôts résidents',         'GF3', 'Résidents'),
  ('multi',  'Compte multiple (salaires/cotisations)', 'GF2', 'Personnel')
ON CONFLICT (compte) DO NOTHING;

-- ── Table mandats ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mandats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee          INTEGER NOT NULL,
  n_bordereau    INTEGER NOT NULL,
  n_piece        INTEGER NOT NULL,
  tiers          TEXT,
  objet          TEXT,
  compte         TEXT,
  montant_ht     NUMERIC(12,2),
  montant_ttc    NUMERIC(12,2),
  date_emission  DATE,
  retour_tresorerie TEXT,
  groupe_fonctionnel TEXT,
  libelle_compte TEXT,
  categorie      TEXT,
  imported_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_mandat UNIQUE (annee, n_bordereau, n_piece)
);

CREATE INDEX IF NOT EXISTS idx_mandats_annee ON mandats(annee);
CREATE INDEX IF NOT EXISTS idx_mandats_compte ON mandats(compte);
CREATE INDEX IF NOT EXISTS idx_mandats_date ON mandats(date_emission);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE comptes_referentiel ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture comptes_referentiel"
  ON comptes_referentiel FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lecture mandats"
  ON mandats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ecriture mandats"
  ON mandats FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
