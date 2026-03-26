import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuditCritere, AuditObservation, AuditStatsCritere, AuditValeur } from '@/types';

export function useAuditTerrain(auditId: string) {
  const [criteres, setCriteres] = useState<AuditCritere[]>([]);
  const [observations, setObservations] = useState<AuditObservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: crits }, { data: obs }] = await Promise.all([
      supabase.from('audit_criteres').select('*').eq('audit_id', auditId).order('ordre'),
      supabase.from('audit_observations')
        .select('*, resultats:audit_observations_criteres(*)')
        .eq('audit_id', auditId)
        .order('ordre'),
    ]);
    setCriteres((crits as AuditCritere[]) || []);
    setObservations((obs as AuditObservation[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (auditId) fetchAll(); }, [auditId]);

  // === CRITÈRES ===
  const addCritere = async (intitule: string) => {
    const { error } = await supabase.from('audit_criteres').insert([{
      audit_id: auditId, intitule, ordre: criteres.length,
    }]);
    if (!error) fetchAll();
    return error;
  };

  const updateCritere = async (id: string, intitule: string) => {
    const { error } = await supabase.from('audit_criteres').update({ intitule }).eq('id', id);
    if (!error) fetchAll();
    return error;
  };

  const deleteCritere = async (id: string) => {
    const { error } = await supabase.from('audit_criteres').delete().eq('id', id);
    if (!error) fetchAll();
    return error;
  };

  // === OBSERVATIONS ===
  const addObservation = async (data: Partial<AuditObservation>) => {
    const { data: obs, error } = await supabase.from('audit_observations').insert([{
      audit_id: auditId,
      nom_agent: data.nom_agent || null,
      service: data.service || null,
      heure_observation: data.heure_observation || null,
      commentaire_global: data.commentaire_global || null,
      ordre: observations.length,
    }]).select().single();

    if (!error && obs) {
      if (criteres.length > 0) {
        await supabase.from('audit_observations_criteres').insert(
          criteres.map(c => ({
            observation_id: (obs as { id: string }).id,
            critere_id: c.id,
            valeur: 'non_evalue',
          }))
        );
      }
      await fetchAll();
    }
    return error;
  };

  const updateObservation = async (id: string, updates: Partial<AuditObservation>) => {
    const { error } = await supabase.from('audit_observations').update({
      nom_agent: updates.nom_agent || null,
      service: updates.service || null,
      heure_observation: updates.heure_observation || null,
      commentaire_global: updates.commentaire_global || null,
    }).eq('id', id);
    if (!error) fetchAll();
    return error;
  };

  const deleteObservation = async (id: string) => {
    const { error } = await supabase.from('audit_observations').delete().eq('id', id);
    if (!error) fetchAll();
    return error;
  };

  const setValeur = async (observationId: string, critereId: string, valeur: AuditValeur, commentaire?: string) => {
    const { error } = await supabase.from('audit_observations_criteres')
      .upsert(
        [{ observation_id: observationId, critere_id: critereId, valeur, commentaire: commentaire || null }],
        { onConflict: 'observation_id,critere_id' }
      );
    if (!error) fetchAll();
    return error;
  };

  // === STATS AUTO ===
  const calcStats = (): AuditStatsCritere[] => {
    return criteres.map(critere => {
      const resultats = observations.flatMap(o => o.resultats || []).filter(r => r.critere_id === critere.id);
      const nb_conformes = resultats.filter(r => r.valeur === 'conforme').length;
      const nb_non_conformes = resultats.filter(r => r.valeur === 'non_conforme').length;
      const nb_partiellement = resultats.filter(r => r.valeur === 'partiellement').length;
      const nb_non_applicable = resultats.filter(r => r.valeur === 'non_applicable').length;
      const nb_total_evalue = resultats.filter(r => r.valeur !== 'non_applicable' && r.valeur !== 'non_evalue').length;
      const pourcentage = nb_total_evalue > 0 ? Math.round((nb_conformes / nb_total_evalue) * 100) : 0;
      return { critere, nb_conformes, nb_non_conformes, nb_partiellement, nb_non_applicable, nb_total_evalue, pourcentage };
    });
  };

  const stats = calcStats();
  const totalConformes = stats.reduce((s, c) => s + c.nb_conformes, 0);
  const totalEvalue = stats.reduce((s, c) => s + c.nb_total_evalue, 0);
  const pourcentageGlobal = totalEvalue > 0 ? Math.round((totalConformes / totalEvalue) * 100) : 0;

  return {
    criteres, observations, loading, stats, pourcentageGlobal, totalConformes, totalEvalue,
    addCritere, updateCritere, deleteCritere,
    addObservation, updateObservation, deleteObservation,
    setValeur, fetchAll,
  };
}
