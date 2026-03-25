import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CvsDemandeStatut = 'en_analyse' | 'acceptee' | 'refusee' | 'partiellement_acceptee';
export type CvsDemandeCategorie = 'alimentation' | 'cadre_de_vie' | 'animations' | 'soins' | 'organisation' | 'autre';

export interface CvsDemande {
  id: string;
  suivi_instance_id?: string;
  date_reunion: string;
  auteur: string;
  categorie: CvsDemandeCategorie;
  description: string;
  statut: CvsDemandeStatut;
  motif_refus?: string;
  action_proposee?: string;
  delai_prevu?: string;
  responsable?: string;
  ajoute_au_pacq: boolean;
  pacq_action_id?: string;
  date_reponse_cvs?: string;
  compte_rendu_reunion?: string;
  created_at?: string;
  updated_at?: string;
}

export function useCvsDemandes() {
  const [demandes, setDemandes] = useState<CvsDemande[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemandes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cvs_demandes')
      .select('*')
      .order('date_reunion', { ascending: false });
    setDemandes((data || []) as CvsDemande[]);
    setLoading(false);
  };

  useEffect(() => { fetchDemandes(); }, []);

  const addDemande = async (d: Omit<CvsDemande, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('cvs_demandes').insert([d]);
    if (!error) fetchDemandes();
    return error;
  };

  const updateDemande = async (id: string, updates: Partial<CvsDemande>) => {
    const { error } = await supabase
      .from('cvs_demandes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchDemandes();
    return error;
  };

  const deleteDemande = async (id: string) => {
    const { error } = await supabase.from('cvs_demandes').delete().eq('id', id);
    if (!error) fetchDemandes();
    return error;
  };

  // Note : pacq_strategique_actions nécessite un objectif_id obligatoire.
  // On marque simplement la demande comme à intégrer dans le PACQ.
  // L'utilisateur pourra ensuite rattacher manuellement à un objectif dans le PACQ.
  const marquerAjoutPacq = async (id: string) => {
    const { error } = await supabase
      .from('cvs_demandes')
      .update({ ajoute_au_pacq: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchDemandes();
    return error;
  };

  return { demandes, loading, addDemande, updateDemande, deleteDemande, marquerAjoutPacq, refetch: fetchDemandes };
}
