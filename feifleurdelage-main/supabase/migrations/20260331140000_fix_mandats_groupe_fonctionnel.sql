-- Étape 1 : correspondance exacte compte → référentiel
UPDATE mandats m
SET groupe_fonctionnel = c.groupe_fonctionnel,
    libelle_compte     = c.libelle,
    categorie          = c.categorie
FROM comptes_referentiel c
WHERE TRIM(m.compte) = TRIM(c.compte)
  AND m.groupe_fonctionnel IS NULL;

-- Étape 2 : correspondance par préfixe décroissant (plus long en priorité)
UPDATE mandats m
SET groupe_fonctionnel = best.groupe_fonctionnel,
    libelle_compte     = best.libelle,
    categorie          = best.categorie
FROM (
  SELECT DISTINCT ON (m2.id)
    m2.id,
    c.groupe_fonctionnel,
    c.libelle,
    c.categorie
  FROM mandats m2
  JOIN comptes_referentiel c
    ON TRIM(m2.compte) LIKE TRIM(c.compte) || '%'
  WHERE m2.groupe_fonctionnel IS NULL
  ORDER BY m2.id, LENGTH(c.compte) DESC
) best
WHERE m.id = best.id
  AND m.groupe_fonctionnel IS NULL;

-- Étape 3 : comptes sans correspondance → 'Non classé'
UPDATE mandats
SET groupe_fonctionnel = 'Non classé'
WHERE groupe_fonctionnel IS NULL;
