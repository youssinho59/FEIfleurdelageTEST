-- Mettre à jour les actions créées depuis la cartographie des risques
-- qui n'ont pas de source renseignée
UPDATE actions_correctives
SET source = 'Cartographie des risques'
WHERE source IS NULL
AND id IN (
  SELECT action_corrective_id
  FROM cartographie_risques
  WHERE action_corrective_id IS NOT NULL
);

-- Même chose pour les actions liées aux risques DUERP
UPDATE actions_correctives
SET source = 'Cartographie des risques'
WHERE source IS NULL
AND id IN (
  SELECT action_corrective_id
  FROM duerp_risques
  WHERE action_corrective_id IS NOT NULL
);
