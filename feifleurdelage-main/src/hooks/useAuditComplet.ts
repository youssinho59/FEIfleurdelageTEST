import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuditComplet, AuditCritere } from '@/types';

export function useAuditComplet(auditId?: string) {
  const [audit, setAudit] = useState<AuditComplet | null>(null);
  const [criteres, setCriteres] = useState<AuditCritere[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAudit = async () => {
    if (!auditId) return;
    setLoading(true);
    const { data } = await supabase.from('audits').select('*').eq('id', auditId).single();
    setAudit(data as AuditComplet);
    const { data: crits } = await supabase
      .from('audit_criteres').select('*').eq('audit_id', auditId).order('ordre');
    setCriteres((crits || []).map((c: AuditCritere) => ({
      ...c,
      pourcentage: c.nb_total > 0 ? Math.round((c.nb_conformes / c.nb_total) * 100) : 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchAudit(); }, [auditId]);

  const saveAudit = async (updates: Partial<AuditComplet>) => {
    if (!auditId) return;
    const { error } = await supabase.from('audits').update(updates).eq('id', auditId);
    if (!error) fetchAudit();
    return error;
  };

  const addCritere = async (c: Omit<AuditCritere, 'id' | 'created_at' | 'pourcentage'>) => {
    const { error } = await supabase.from('audit_criteres').insert([c]);
    if (!error) fetchAudit();
    return error;
  };

  const updateCritere = async (id: string, updates: Partial<AuditCritere>) => {
    const { error } = await supabase.from('audit_criteres').update(updates).eq('id', id);
    if (!error) fetchAudit();
    return error;
  };

  const deleteCritere = async (id: string) => {
    const { error } = await supabase.from('audit_criteres').delete().eq('id', id);
    if (!error) fetchAudit();
    return error;
  };

  // Calculs globaux
  const totalConformes = criteres.reduce((s, c) => s + c.nb_conformes, 0);
  const totalAudite = criteres.reduce((s, c) => s + c.nb_total, 0);
  const pourcentageGlobal = totalAudite > 0 ? Math.round((totalConformes / totalAudite) * 100) : 0;

  return {
    audit, criteres, loading,
    saveAudit, addCritere, updateCritere, deleteCritere, fetchAudit,
    totalConformes, totalAudite, pourcentageGlobal,
  };
}
