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

function cleanPayload(d: Partial<CvsDemande>) {
  return {
    ...d,
    motif_refus: d.motif_refus || null,
    action_proposee: d.action_proposee || null,
    delai_prevu: d.delai_prevu || null,
    responsable: d.responsable || null,
    pacq_action_id: d.pacq_action_id || null,
    date_reponse_cvs: d.date_reponse_cvs || null,
    compte_rendu_reunion: d.compte_rendu_reunion || null,
    suivi_instance_id: d.suivi_instance_id || null,
  };
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
    const { error } = await supabase.from('cvs_demandes').insert([cleanPayload(d)]);
    if (!error) fetchDemandes();
    return error;
  };

  const updateDemande = async (id: string, updates: Partial<CvsDemande>) => {
    const { error } = await supabase
      .from('cvs_demandes')
      .update({ ...cleanPayload(updates), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchDemandes();
    return error;
  };

  const deleteDemande = async (id: string) => {
    const { error } = await supabase.from('cvs_demandes').delete().eq('id', id);
    if (!error) fetchDemandes();
    return error;
  };

  const ajouterAuPacqOperationnel = async (demande: CvsDemande) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('actions_correctives')
      .insert([{
        titre: `[CVS] ${demande.description.substring(0, 100)}`,
        description: demande.action_proposee || demande.description,
        responsable: demande.responsable || 'À définir',
        date_echeance: demande.delai_prevu || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priorite: 'moyenne',
        statut: 'en_cours',
        user_id: user.id,
        source: 'cvs',
      }])
      .select('id')
      .single();

    if (!error && data) {
      await updateDemande(demande.id, {
        ajoute_au_pacq: true,
        pacq_action_id: (data as { id: string }).id,
      });
    }
    return error;
  };

  return { demandes, loading, addDemande, updateDemande, deleteDemande, ajouterAuPacqOperationnel, refetch: fetchDemandes };
}
