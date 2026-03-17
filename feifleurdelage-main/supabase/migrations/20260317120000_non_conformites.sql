CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  date_audit DATE NOT NULL,
  type_audit TEXT NOT NULL CHECK (type_audit IN ('interne', 'externe', 'certification', 'suivi')),
  auditeur TEXT,
  service TEXT,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('planifie', 'en_cours', 'termine')),
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE non_conformites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  criticite TEXT DEFAULT 'mineure' CHECK (criticite IN ('mineure', 'majeure', 'critique')),
  statut TEXT DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'en_traitement', 'cloturee')),
  service TEXT,
  action_corrective_id UUID REFERENCES actions_correctives(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture audits" ON audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture non_conformites" ON non_conformites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ecriture audits" ON audits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
CREATE POLICY "Ecriture non_conformites" ON non_conformites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
