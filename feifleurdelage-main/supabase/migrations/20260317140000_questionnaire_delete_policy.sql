CREATE POLICY "Delete questionnaire" ON questionnaire_satisfaction FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'responsable')));
