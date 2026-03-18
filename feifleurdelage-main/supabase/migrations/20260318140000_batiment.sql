CREATE TABLE batiment_equipements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('batiment', 'equipement_medical', 'equipement_technique', 'vehicule', 'informatique', 'autre')),
  localisation TEXT,
  marque TEXT,
  modele TEXT,
  numero_serie TEXT,
  date_mise_en_service DATE,
  fournisseur TEXT,
  contact_fournisseur TEXT,
  statut TEXT DEFAULT 'operationnel' CHECK (statut IN ('operationnel', 'en_panne', 'en_maintenance', 'hors_service')),
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batiment_maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipement_id UUID NOT NULL REFERENCES batiment_equipements(id) ON DELETE CASCADE,
  type_maintenance TEXT NOT NULL CHECK (type_maintenance IN ('preventive', 'corrective', 'reglementaire', 'controle')),
  titre TEXT NOT NULL,
  description TEXT,
  prestataire TEXT,
  date_planifiee DATE,
  date_realisation DATE,
  cout DECIMAL(10,2),
  statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'realise', 'en_retard')),
  periodicite TEXT CHECK (periodicite IN ('mensuelle', 'trimestrielle', 'semestrielle', 'annuelle', 'biannuelle', 'ponctuelle')),
  prochaine_echeance DATE,
  document_nom TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batiment_controles_reglementaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  type_controle TEXT NOT NULL CHECK (type_controle IN ('securite_incendie', 'electrique', 'ascenseur', 'gaz', 'climatisation', 'eau_potable', 'legionelles', 'amiante', 'autre')),
  organisme_verificateur TEXT,
  periodicite TEXT,
  derniere_realisation DATE,
  prochaine_echeance DATE,
  statut TEXT DEFAULT 'a_planifier' CHECK (statut IN ('a_planifier', 'planifie', 'realise', 'en_retard', 'non_conforme')),
  resultat TEXT CHECK (resultat IN ('conforme', 'non_conforme', 'reserves')),
  observations TEXT,
  document_nom TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE batiment_equipements ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_controles_reglementaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture equipements" ON batiment_equipements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture maintenances" ON batiment_maintenances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture controles" ON batiment_controles_reglementaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ecriture equipements" ON batiment_equipements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture maintenances" ON batiment_maintenances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture controles" ON batiment_controles_reglementaires FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
