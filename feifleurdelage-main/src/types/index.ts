export interface AuditCritere {
  id: string;
  audit_id: string;
  intitule: string;
  nb_conformes: number;
  nb_total: number;
  commentaire?: string;
  ordre: number;
  created_at?: string;
  // calculé côté client
  pourcentage?: number;
}

export interface PropositionAction {
  titre: string;
  description: string;
  priorite: 'haute' | 'moyenne' | 'faible';
  ajoute_au_pacq?: boolean;
  pacq_action_id?: string;
}

export interface AuditComplet {
  id: string;
  // Partie 1
  intitule?: string;
  titre: string;
  qui?: string;
  lieu_pasa?: boolean;
  lieu_rdc?: boolean;
  lieu_etage?: boolean;
  lieu_temporaire?: boolean;
  date_debut?: string;
  date_fin?: string;
  frequence?: string;
  theme?: string;
  // Partie 2
  ref_has?: boolean;
  ref_interne?: boolean;
  ref_reglementation?: boolean;
  ref_autres?: boolean;
  ref_autres_detail?: string;
  modalite_directe?: boolean;
  modalite_participante?: boolean;
  modalite_questionnaire?: boolean;
  echantillon_residents?: boolean;
  echantillon_professionnels?: boolean;
  echantillon_partenaires?: boolean;
  nombre_echantillon?: number;
  // Partie 4
  audit_precedent_id?: string;
  date_audit_precedent?: string;
  echantillon_precedent?: number;
  // Partie 5
  points_forts?: string;
  points_amelioration?: string;
  // Partie 6
  constat_ia?: string;
  propositions_ia?: PropositionAction[];
  // Partie 7
  comm_encadrement?: boolean;
  comm_encadrement_date?: string;
  comm_cvs?: boolean;
  comm_cse?: boolean;
  comm_codir?: boolean;
  comm_autres?: boolean;
  comm_autres_detail?: string;
  date_prochain_audit?: string;
  redacteur_nom?: string;
  redacteur_fonction?: string;
  rapport_ia?: string;
  rapport_genere_le?: string;
  // Existants
  date_audit?: string;
  type_audit?: string;
  auditeur?: string;
  service?: string;
  statut?: string;
  observations?: string;
  created_by?: string;
  created_at?: string;
}
