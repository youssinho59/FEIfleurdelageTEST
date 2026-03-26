export type AuditValeur = 'conforme' | 'non_conforme' | 'partiellement' | 'non_applicable' | 'non_evalue';

export const AUDIT_VALEURS: { value: AuditValeur; label: string; couleur: string; emoji: string }[] = [
  { value: 'conforme',       label: 'Conforme',               couleur: 'bg-green-100 text-green-800',   emoji: '✅' },
  { value: 'non_conforme',   label: 'Non conforme',           couleur: 'bg-red-100 text-red-800',       emoji: '❌' },
  { value: 'partiellement',  label: 'Partiellement conforme', couleur: 'bg-orange-100 text-orange-800', emoji: '⚠️' },
  { value: 'non_applicable', label: 'Non applicable',         couleur: 'bg-gray-100 text-gray-600',     emoji: '➖' },
  { value: 'non_evalue',     label: 'Non évalué',             couleur: 'bg-slate-100 text-slate-500',   emoji: '○' },
];

export interface AuditCritere {
  id: string;
  audit_id: string;
  intitule: string;
  commentaire?: string;
  ordre: number;
  created_at?: string;
}

export interface AuditObservation {
  id: string;
  audit_id: string;
  nom_agent?: string;
  service?: string;
  heure_observation?: string;
  commentaire_global?: string;
  ordre: number;
  created_at?: string;
  // Résultats chargés en join
  resultats?: AuditObservationCritere[];
}

export interface AuditObservationCritere {
  id: string;
  observation_id: string;
  critere_id: string;
  valeur: AuditValeur;
  commentaire?: string;
}

// Stats calculées côté client
export interface AuditStatsCritere {
  critere: AuditCritere;
  nb_conformes: number;
  nb_non_conformes: number;
  nb_partiellement: number;
  nb_non_applicable: number;
  nb_total_evalue: number; // exclut non_applicable et non_evalue
  pourcentage: number; // nb_conformes / nb_total_evalue * 100
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
  audit_precedent_id?: string;
  date_audit_precedent?: string;
  echantillon_precedent?: number;
  points_forts?: string;
  points_amelioration?: string;
  constat_ia?: string;
  propositions_ia?: PropositionAction[];
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
  date_audit?: string;
  type_audit?: string;
  auditeur?: string;
  service?: string;
  statut?: string;
  created_by?: string;
  created_at?: string;
}
