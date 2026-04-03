import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { useAuditTerrain } from '@/hooks/useAuditTerrain';
import { useAuditComplet } from '@/hooks/useAuditComplet';
import { AUDIT_VALEURS, AuditValeur } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ClipboardList, BarChart3, FileText, Sparkles, ArrowRight, ChevronRight, FileDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  auditId: string;
  onClose?: () => void;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export function AuditTerrain({ auditId, onClose }: Props) {
  const {
    criteres, observations, loading, stats, pourcentageGlobal, totalConformes, totalEvalue,
    addCritere, updateCritere, deleteCritere,
    addObservation, updateObservation, deleteObservation,
    setValeur, fetchAll,
  } = useAuditTerrain(auditId);

  const { audit, saveAudit } = useAuditComplet(auditId);

  const [nouveauCritere, setNouveauCritere] = useState('');
  const [obsDialog, setObsDialog] = useState<{
    open: boolean; id?: string; nom?: string; service?: string; heure?: string; commentaire?: string;
    evaluations?: Record<string, AuditValeur>;
    critereCommentaires?: Record<string, string>;
  }>({ open: false });
  const [obsSelectee, setObsSelectee] = useState<string | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingRapport, setLoadingRapport] = useState(false);
  const [activeTab, setActiveTab] = useState('terrain');

  // ── Comparatif states ────────────────────────────────────────────────────────
  const [availableAudits, setAvailableAudits] = useState<{
    id: string;
    intitule?: string;
    titre?: string;
    date_fin?: string | null;
    date_debut?: string | null;
    date_audit?: string | null;
    created_at?: string | null;
  }[]>([]);
  const [comparatifAuditIds, setComparatifAuditIds] = useState<string[]>([auditId]);
  const [comparatifStats, setComparatifStats] = useState<Record<string, {pourcentage_global: number; criteres: Record<string, number>}>>({});
  const [loadingComparatif, setLoadingComparatif] = useState(false);
  const [iaComparatifTexte, setIaComparatifTexte] = useState<string | null>(null);
  const [loadingIAComparatif, setLoadingIAComparatif] = useState(false);
  const [savingIAComparatif, setSavingIAComparatif] = useState(false);

  const handleAddCritere = async () => {
    if (!nouveauCritere.trim()) return;
    await addCritere(nouveauCritere.trim());
    setNouveauCritere('');
  };

  const handleSaveObs = async () => {
    const evals = obsDialog.evaluations || {};

    if (obsDialog.id) {
      // Mise à jour : champs généraux + évaluations en batch
      await updateObservation(obsDialog.id, {
        nom_agent: obsDialog.nom,
        service: obsDialog.service,
        heure_observation: obsDialog.heure,
        commentaire_global: obsDialog.commentaire,
      });
      const evalEntries = Object.entries(evals);
      if (evalEntries.length > 0) {
        await supabase.from('audit_observations_criteres').upsert(
          evalEntries.map(([critereId, valeur]) => ({
            observation_id: obsDialog.id,
            critere_id: critereId,
            valeur,
            commentaire: (obsDialog.critereCommentaires || {})[critereId] || null,
          })),
          { onConflict: 'observation_id,critere_id' }
        );
      }
      await fetchAll();
      toast.success('Observation mise à jour');
    } else {
      // Création : insert obs, puis insert toutes les évaluations d'un coup
      const { data: obs, error } = await supabase
        .from('audit_observations')
        .insert([{
          audit_id: auditId,
          nom_agent: obsDialog.nom || null,
          service: obsDialog.service || null,
          heure_observation: obsDialog.heure || null,
          commentaire_global: obsDialog.commentaire || null,
          ordre: observations.length,
        }])
        .select()
        .single();

      if (error) {
        console.error('[AuditTerrain] Erreur insert audit_observations:', error);
        toast.error('Erreur création observation : ' + error.message);
        return;
      }

      if (obs && criteres.length > 0) {
        const { error: crError } = await supabase.from('audit_observations_criteres').insert(
          criteres.map(c => ({
            observation_id: (obs as { id: string }).id,
            critere_id: c.id,
            valeur: evals[c.id] || 'non_evalue',
            commentaire: (obsDialog.critereCommentaires || {})[c.id] || null,
          }))
        );
        if (crError) {
          console.error('[AuditTerrain] Erreur insert audit_observations_criteres:', crError);
          toast.error('Observation créée mais erreur critères : ' + crError.message);
        }
      }

      await fetchAll();
      toast.success('Observation ajoutée');
    }
    setObsDialog({ open: false });
  };

  const getValeurForObs = (obsId: string, critereId: string): AuditValeur => {
    const obs = observations.find(o => o.id === obsId);
    return (obs?.resultats?.find(r => r.critere_id === critereId)?.valeur as AuditValeur) || 'non_evalue';
  };

  const getAuditDisplayDate = (a: {
    date_fin?: string | null;
    date_debut?: string | null;
    date_audit?: string | null;
    created_at?: string | null;
  }) => {
    const rawDate = a.date_fin || a.date_debut || a.date_audit || a.created_at;
    if (!rawDate) return '';

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '';

    return ` — ${date.toLocaleDateString('fr-FR')}`;
  };

  const getAuditShortDate = (a?: {
    date_fin?: string | null;
    date_debut?: string | null;
    date_audit?: string | null;
    created_at?: string | null;
  }) => {
    const rawDate = a?.date_fin || a?.date_debut || a?.date_audit || a?.created_at;
    if (!rawDate) return '';

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // Génération IA constat + actions
  const genererIA = async () => {
    if (observations.length === 0) { toast.error("Ajoutez des observations d'abord"); return; }
    setLoadingIA(true);
    try {
      const criteresTexte = stats.map(s =>
        `- ${s.critere.intitule}: ${s.nb_conformes}C / ${s.nb_non_conformes}NC / ${s.nb_partiellement}P / ${s.nb_non_applicable}NA sur ${observations.length} obs = ${s.pourcentage}%`
      ).join('\n');
      const { data, error } = await supabase.functions.invoke('suggest-actions', {
        body: {
          context_type: 'audit_analyse',
          data: {
            titre: audit?.intitule || audit?.titre,
            theme: audit?.theme,
            service: audit?.service,
            pourcentage_global: pourcentageGlobal,
            total_conformes: totalConformes,
            total_audite: totalEvalue,
            nb_observations: observations.length,
            criteres: criteresTexte,
          },
        },
      });
      if (error) throw error;
      const updates: Record<string, unknown> = {};
      if (data?.constat) updates.constat_ia = data.constat;
      if (data?.propositions) updates.propositions_ia = data.propositions;
      await saveAudit(updates as Parameters<typeof saveAudit>[0]);
      toast.success('Analyse IA générée ✨');
    } catch (e: unknown) {
      toast.error('Erreur IA : ' + ((e as Error)?.message || 'inconnue'));
    } finally { setLoadingIA(false); }
  };

  // Génération rapport
  const genererRapport = async () => {
    setLoadingRapport(true);
    try {
      const criteresTexte = stats.map(s =>
        `${s.critere.intitule}: ${s.nb_conformes}/${s.nb_total_evalue} (${s.pourcentage}%)`
      ).join('\n');
      const { data, error } = await supabase.functions.invoke('suggest-actions', {
        body: {
          context_type: 'audit_rapport',
          data: {
            intitule: audit?.intitule || audit?.titre,
            qui: audit?.qui,
            theme: audit?.theme,
            service: audit?.service,
            date_debut: audit?.date_debut,
            date_fin: audit?.date_fin,
            nb_observations: observations.length,
            pourcentage_global: pourcentageGlobal,
            total_conformes: totalConformes,
            total_audite: totalEvalue,
            criteres: criteresTexte,
            points_forts: audit?.points_forts,
            points_amelioration: audit?.points_amelioration,
            constat: audit?.constat_ia,
            propositions: JSON.stringify(audit?.propositions_ia || []),
            redacteur: `${audit?.redacteur_nom || ''} - ${audit?.redacteur_fonction || ''}`,
          },
        },
      });
      if (error) throw error;
      const rapport = data?.rapport || data?.content || '';
      if (rapport) {
        await saveAudit({ rapport_ia: rapport, rapport_genere_le: new Date().toISOString() });
        toast.success('Rapport généré ✅');
      }
    } catch (e: unknown) {
      toast.error('Erreur rapport : ' + ((e as Error)?.message || 'inconnue'));
    } finally { setLoadingRapport(false); }
  };

  const telechargerRapport = () => {
    if (!audit?.rapport_ia) { toast.error("Générez d'abord le rapport"); return; }
    const blob = new Blob([audit.rapport_ia], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-audit-${(audit?.intitule || 'audit').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const genererPdfAudit = () => {
    const TC: [number, number, number] = [196, 107, 72];
    const DARK: [number, number, number] = [41, 37, 33];
    const MUTED_C: [number, number, number] = [140, 130, 120];
    const BORDER_C: [number, number, number] = [220, 210, 200];
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210, pageH = 297, margin = 14, cW = pageW - margin * 2;
    let y = 0;
    let pageNum = 1;
    const fmt = (d?: string | null) => d ? (() => { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR'); })() : '—';
    const footerText = `EHPAD La Fleur de l'Âge — Confidentiel — Audit ${audit?.titre || ''} — ${fmt(audit?.date_audit || audit?.date_fin)}`;

    const addFooter = () => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED_C);
      doc.text(footerText, margin, pageH - 6);
      doc.text(`Page ${pageNum}`, pageW - margin - 10, pageH - 6, { align: 'right' });
    };

    const addPage = () => { doc.addPage(); pageNum++; y = 20; addFooter(); };

    const checkY = (need: number) => { if (y + need > pageH - 15) addPage(); };

    const sectionTitle = (title: string) => {
      checkY(14);
      doc.setFillColor(...TC); doc.rect(margin, y, cW, 8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 3, y + 5.5);
      doc.setTextColor(...DARK); y += 12;
    };

    const labelValue = (label: string, value: string, lw = 42) => {
      checkY(7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
      doc.text(label + ' :', margin, y);
      const lines = doc.splitTextToSize(value || '—', cW - lw);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
      doc.text(lines, margin + lw, y);
      y += Math.max(6, lines.length * 4.5);
    };

    // ── PAGE DE GARDE ───────────────────────────────────────────────────────────
    doc.setFillColor(...TC); doc.rect(0, 0, pageW, 48, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text("EHPAD La Fleur de l'Âge", margin, 18);
    doc.setFontSize(13); doc.text(`Rapport d'Audit — ${audit?.titre || ''}`, margin, 30);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    if (audit?.intitule) doc.text(audit.intitule, margin, 40);
    addFooter(); y = 56;

    const lieux = [audit?.lieu_pasa && 'PASA', audit?.lieu_rdc && 'RDC', audit?.lieu_etage && 'Étage', audit?.lieu_temporaire && 'Temporaire'].filter(Boolean).join(', ');
    const echTypes = [audit?.echantillon_residents && 'Résidents', audit?.echantillon_professionnels && 'Professionnels', audit?.echantillon_partenaires && 'Partenaires'].filter(Boolean).join(', ');
    const refs = [audit?.ref_has && 'HAS', audit?.ref_interne && 'Interne', audit?.ref_reglementation && 'Réglementation', audit?.ref_autres && (audit.ref_autres_detail || 'Autres')].filter(Boolean).join(' / ');

    [['Date', fmt(audit?.date_audit || audit?.date_fin || audit?.date_debut)],
     ['Auditeur', audit?.qui || audit?.auditeur || '—'],
     ['Service', audit?.service || '—'],
     ['Thème', audit?.theme || '—'],
     ['Statut', audit?.statut || '—'],
     ['Fréquence', audit?.frequence || '—'],
     ...(lieux ? [['Lieux', lieux]] : []),
     ...(audit?.nombre_echantillon ? [['Échantillon', `${audit.nombre_echantillon} personne(s)${echTypes ? ' (' + echTypes + ')' : ''}`]] : []),
     ...(refs ? [['Références', refs]] : []),
    ].forEach(([k, v]) => labelValue(String(k), String(v)));

    // ── SECTION 1 — SAISIE TERRAIN ─────────────────────────────────────────────
    addPage();
    sectionTitle('SECTION 1 — SAISIE TERRAIN');

    const colW = [10, 28, 24, 13, 42, 28, 37];
    const colHeaders = ['N°', 'Agent', 'Service', 'Heure', 'Critère', 'Valeur', 'Commentaire'];
    doc.setFillColor(...BORDER_C);
    doc.rect(margin, y, cW, 6, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    let cx = margin;
    colHeaders.forEach((h, i) => { doc.text(h, cx + 1, y + 4.5); cx += colW[i]; });
    y += 6;

    let rowIdx = 0;
    observations.forEach((obs, obsIdx) => {
      const resultats = obs.resultats || [];
      criteres.forEach(crit => {
        const r = resultats.find(rr => rr.critere_id === crit.id);
        const vDef = AUDIT_VALEURS.find(v => v.value === (r?.valeur || 'non_evalue'));
        const valLabel = vDef ? vDef.label : (r?.valeur || '—');
        const comm = r?.commentaire || obs.commentaire_global || '';
        const commLines = doc.splitTextToSize(comm.slice(0, 100), colW[6] - 2);
        const rH = Math.max(5.5, commLines.length * 4 + 1.5);
        checkY(rH);
        if (rowIdx % 2 === 1) { doc.setFillColor(250, 248, 246); doc.rect(margin, y, cW, rH, 'F'); }
        cx = margin;
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
        doc.text(String(obsIdx + 1), cx + 1, y + 4); cx += colW[0];
        doc.text((obs.nom_agent || '—').slice(0, 18), cx + 1, y + 4); cx += colW[1];
        doc.text((obs.service || '—').slice(0, 16), cx + 1, y + 4); cx += colW[2];
        doc.text(obs.heure_observation || '—', cx + 1, y + 4); cx += colW[3];
        doc.text(crit.intitule.slice(0, 30), cx + 1, y + 4); cx += colW[4];
        doc.text(valLabel.slice(0, 18), cx + 1, y + 4); cx += colW[5];
        if (commLines.length > 0) doc.text(commLines, cx + 1, y + 4);
        doc.setDrawColor(...BORDER_C); doc.line(margin, y + rH, margin + cW, y + rH);
        y += rH; rowIdx++;
      });
    });

    y += 4; checkY(10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...TC);
    doc.text(`Conformité globale : ${pourcentageGlobal}% (${totalConformes} conformes sur ${totalEvalue} évalués)`, margin, y);
    y += 10;

    // ── SECTION 2 — CONSOLIDATION ──────────────────────────────────────────────
    sectionTitle('SECTION 2 — CONSOLIDATION');

    const textBlock = (label: string, value?: string | null) => {
      if (!value) return;
      checkY(12);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
      doc.text(label + ' :', margin, y); y += 5;
      const lines = doc.splitTextToSize(value, cW);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK);
      const chunk = lines.slice(0, 30);
      chunk.forEach((line: string) => { checkY(5); doc.text(line, margin, y); y += 4.5; });
      y += 3;
    };

    textBlock('Points forts', audit?.points_forts);
    textBlock("Points d'amélioration", audit?.points_amelioration);
    textBlock('Observations générales', audit?.observations as string | undefined);
    textBlock('Constat IA', audit?.constat_ia);

    if (audit?.propositions_ia && Array.isArray(audit.propositions_ia) && (audit.propositions_ia as unknown[]).length > 0) {
      checkY(10);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
      doc.text('Propositions IA :', margin, y); y += 5;
      (audit.propositions_ia as Array<{titre: string; description: string; priorite: string}>).forEach((p, i) => {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
        doc.text(`${i + 1}. ${p.titre} [${p.priorite}]`, margin + 3, y); y += 4.5;
        const dl = doc.splitTextToSize(p.description, cW - 8);
        doc.setFont('helvetica', 'normal');
        dl.slice(0, 4).forEach((l: string) => { checkY(5); doc.text(l, margin + 6, y); y += 4.5; });
        y += 1;
      });
    }

    // ── SECTION 3 — COMPARATIF ─────────────────────────────────────────────────
    if (comparatifAuditIds.length >= 2 && Object.keys(comparatifStats).length > 0) {
      addPage();
      sectionTitle('SECTION 3 — COMPARATIF');
      const precedentId = comparatifAuditIds.find(id => id !== auditId);
      if (precedentId) {
        const precedentAudit = availableAudits.find(x => x.id === precedentId);
        const actPct = comparatifStats[auditId]?.pourcentage_global ?? 0;
        const prevPct = comparatifStats[precedentId]?.pourcentage_global ?? 0;
        const diff = actPct - prevPct;
        checkY(10);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED_C);
        doc.text('Évolution conformité globale :', margin, y);
        doc.setTextColor(diff >= 0 ? 34 : 239, diff >= 0 ? 197 : 68, diff >= 0 ? 94 : 68);
        doc.text(`${prevPct}% → ${actPct}% (${diff >= 0 ? '+' : ''}${diff} pts)`, margin + 66, y);
        doc.setTextColor(...DARK); y += 8;

        const prevDateLabel = fmt(precedentAudit?.date_fin || precedentAudit?.date_debut || precedentAudit?.date_audit);
        doc.setFillColor(...BORDER_C); doc.rect(margin, y, cW, 6, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
        doc.text('Critère', margin + 1, y + 4.5);
        doc.text('Résultat actuel', margin + 90, y + 4.5);
        doc.text(`Précédent (${prevDateLabel})`, margin + 130, y + 4.5);
        y += 6;

        const allCrits = [...new Set([...Object.keys(comparatifStats[auditId]?.criteres || {}), ...Object.keys(comparatifStats[precedentId]?.criteres || {})])];
        allCrits.forEach((crit, idx) => {
          checkY(6);
          const ap = comparatifStats[auditId]?.criteres?.[crit];
          const pp = comparatifStats[precedentId]?.criteres?.[crit];
          if (idx % 2 === 1) { doc.setFillColor(250, 248, 246); doc.rect(margin, y, cW, 6, 'F'); }
          doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
          doc.text(crit.slice(0, 48), margin + 1, y + 4);
          const ac: [number, number, number] = ap === undefined ? [...MUTED_C] : ap >= 80 ? [34, 197, 94] : ap >= 60 ? [245, 158, 11] : [239, 68, 68];
          doc.setTextColor(...ac); doc.text(ap !== undefined ? `${ap}%` : '—', margin + 90, y + 4);
          const pc: [number, number, number] = pp === undefined ? [...MUTED_C] : pp >= 80 ? [34, 197, 94] : pp >= 60 ? [245, 158, 11] : [239, 68, 68];
          doc.setTextColor(...pc); doc.text(pp !== undefined ? `${pp}%` : '—', margin + 130, y + 4);
          doc.setTextColor(...DARK); doc.setDrawColor(...BORDER_C); doc.line(margin, y + 6, margin + cW, y + 6);
          y += 6;
        });
        y += 4;
      }

      const rapportIA = iaComparatifTexte || audit?.rapport_ia;
      if (rapportIA) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
        doc.text('Analyse IA comparative :', margin, y); y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(rapportIA, cW);
        lines.forEach((l: string) => { checkY(5); doc.text(l, margin, y); y += 4.5; });
      }
    }

    // ── SECTION 4 — RAPPORT & COMMUNICATION ───────────────────────────────────
    addPage();
    sectionTitle('SECTION 4 — RAPPORT & COMMUNICATION');

    labelValue('Rédacteur', `${audit?.redacteur_nom || '—'} — ${audit?.redacteur_fonction || '—'}`);
    labelValue('Date de génération', new Date().toLocaleDateString('fr-FR'));
    labelValue('Prochain audit', fmt(audit?.date_prochain_audit));

    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
    doc.text('Communication prévue :', margin, y); y += 5;

    const comms = [
      audit?.comm_encadrement && `Encadrement${audit.comm_encadrement_date ? ' — ' + fmt(audit.comm_encadrement_date) : ''}`,
      audit?.comm_cvs && 'CVS',
      audit?.comm_cse && 'CSE',
      audit?.comm_codir && 'CODIR',
      audit?.comm_autres && (audit.comm_autres_detail || 'Autres'),
    ].filter(Boolean) as string[];

    if (comms.length > 0) {
      comms.forEach(c => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DARK); doc.text(`• ${c}`, margin + 4, y); y += 5; });
    } else {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...MUTED_C);
      doc.text('Non renseigné', margin + 4, y); y += 5;
    }

    const safeTitre = (audit?.titre || 'audit').replace(/[^\w\-]/g, '_');
    const safeDate = (audit?.date_audit || audit?.date_fin || new Date().toISOString()).split('T')[0];
    doc.save(`Rapport_Audit_${safeTitre}_${safeDate}.pdf`);
  };

  // ── Comparatif ───────────────────────────────────────────────────────────────
  const loadComparatifData = async (auditIds: string[]) => {
    if (auditIds.length === 0) return;
    setLoadingComparatif(true);
    try {
      const { data: allCrits } = await supabase
        .from('audit_criteres').select('id, intitule, audit_id').in('audit_id', auditIds);
      if (!allCrits) return;
      const critIds = allCrits.map(c => c.id);
      const { data: allObsCrits } = critIds.length > 0
        ? await supabase.from('audit_observations_criteres').select('critere_id, valeur').in('critere_id', critIds)
        : { data: [] };

      const newStats: Record<string, {pourcentage_global: number; criteres: Record<string, number>}> = {};
      auditIds.forEach(aid => {
        const auditCrits = allCrits.filter(c => c.audit_id === aid);
        const critStats: Record<string, number> = {};
        auditCrits.forEach(c => {
          const vals = (allObsCrits || []).filter(oc => oc.critere_id === c.id && oc.valeur !== 'non_evalue' && oc.valeur !== 'non_applicable');
          critStats[c.intitule] = vals.length > 0 ? Math.round(vals.filter(v => v.valeur === 'conforme').length / vals.length * 100) : 0;
        });
        const allVals = (allObsCrits || []).filter(oc => auditCrits.some(c => c.id === oc.critere_id) && oc.valeur !== 'non_evalue' && oc.valeur !== 'non_applicable');
        const pct = allVals.length > 0 ? Math.round(allVals.filter(v => v.valeur === 'conforme').length / allVals.length * 100) : 0;
        newStats[aid] = { pourcentage_global: pct, criteres: critStats };
      });
      setComparatifStats(newStats);
    } finally {
      setLoadingComparatif(false);
    }
  };

  // Clé de regroupement : theme en priorité, sinon intitule, sinon titre
  const auditThemeLabel = audit?.theme || audit?.intitule || audit?.titre || '';

  useEffect(() => {
    if (activeTab !== 'comparatif' || !auditThemeLabel) return;
    let q = supabase
      .from('audits')
      .select('id, intitule, titre, date_fin, date_debut, date_audit, created_at');
    if (audit?.theme)         q = q.eq('theme', audit.theme);
    else if (audit?.intitule) q = q.eq('intitule', audit.intitule);
    else                      q = q.eq('titre', audit?.titre ?? '');
    q.then(({ data }) => {
      if (data) {
        setAvailableAudits(data);
        setComparatifAuditIds([auditId]);
        loadComparatifData([auditId]);
      }
    });
  }, [activeTab, auditThemeLabel]); // eslint-disable-line

  // Données graphiques
  const dataBarres = stats.map(s => ({
    name: s.critere.intitule.length > 22 ? s.critere.intitule.slice(0, 22) + '…' : s.critere.intitule,
    pourcentage: s.pourcentage,
  }));
  const dataPie = [
    { name: 'Conformes',      value: totalConformes },
    { name: 'Non conformes',  value: stats.reduce((s, c) => s + c.nb_non_conformes, 0) },
    { name: 'Partiellement',  value: stats.reduce((s, c) => s + c.nb_partiellement, 0) },
  ].filter(d => d.value > 0);

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{audit?.intitule || audit?.titre || 'Audit'}</h1>
          <p className="text-sm text-gray-500">
            {observations.length} observation{observations.length > 1 ? 's' : ''} · {criteres.length} critère{criteres.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={genererPdfAudit}>
            <FileDown className="w-3.5 h-3.5" /> Exporter PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>← Retour</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="criteres" className="flex-1 gap-1 text-xs">
            <ClipboardList className="w-3.5 h-3.5" />Critères
          </TabsTrigger>
          <TabsTrigger value="terrain" className="flex-1 gap-1 text-xs">
            <ClipboardList className="w-3.5 h-3.5" />Saisie terrain
          </TabsTrigger>
          <TabsTrigger value="consolidation" className="flex-1 gap-1 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />Consolidation
          </TabsTrigger>
          <TabsTrigger value="comparatif" className="flex-1 gap-1 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />Comparatif
          </TabsTrigger>
          <TabsTrigger value="rapport" className="flex-1 gap-1 text-xs">
            <FileText className="w-3.5 h-3.5" />Rapport
          </TabsTrigger>
        </TabsList>

        {/* ═══ ONGLET CRITÈRES ═══ */}
        <TabsContent value="criteres" className="space-y-3 pt-3">
          <p className="text-sm text-gray-500">
            Définissez les critères à évaluer. Ils apparaîtront dans chaque fiche terrain.
          </p>
          <div className="space-y-2">
            {criteres.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <Input
                  value={c.intitule}
                  onChange={e => updateCritere(c.id, e.target.value)}
                  className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
                />
                <Button
                  variant="ghost" size="sm"
                  className="text-red-400 hover:text-red-600 shrink-0"
                  onClick={() => deleteCritere(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nouveau critère..."
              value={nouveauCritere}
              onChange={e => setNouveauCritere(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCritere()}
            />
            <Button onClick={handleAddCritere} disabled={!nouveauCritere.trim()} className="gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
          {criteres.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">
              Aucun critère défini. Ajoutez-en pour commencer la saisie terrain.
            </p>
          )}
        </TabsContent>

        {/* ═══ ONGLET SAISIE TERRAIN ═══ */}
        <TabsContent value="terrain" className="space-y-3 pt-3">
          {criteres.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
              ⚠️ Définissez d'abord les critères dans l'onglet "Critères" avant de saisir les observations.
            </div>
          )}

          <div className="space-y-2">
            {observations.map((obs, i) => {
              const nbEvalues = obs.resultats?.filter(r => r.valeur !== 'non_evalue').length || 0;
              const nbConformes = obs.resultats?.filter(r => r.valeur === 'conforme').length || 0;
              const isSelected = obsSelectee === obs.id;
              return (
                <div key={obs.id} className={`border rounded-lg transition-all ${isSelected ? 'border-orange-400 shadow-sm' : 'border-gray-200'}`}>
                  {/* En-tête de la fiche */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setObsSelectee(isSelected ? null : obs.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{obs.nom_agent || 'Observation sans nom'}</p>
                        <p className="text-xs text-gray-400">
                          {obs.service && `${obs.service} · `}
                          {obs.heure_observation && `${obs.heure_observation} · `}
                          {nbEvalues}/{criteres.length} critères évalués
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {nbEvalues > 0 && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {nbConformes}C / {nbEvalues - nbConformes}NC
                        </Badge>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          const existingEvals: Record<string, AuditValeur> = {};
                          (obs.resultats || []).forEach(r => {
                            existingEvals[r.critere_id] = r.valeur as AuditValeur;
                          });
                          const existingComments: Record<string, string> = {};
                          (obs.resultats || []).forEach(r => {
                            if (r.commentaire) existingComments[r.critere_id] = r.commentaire;
                          });
                          setObsDialog({ open: true, id: obs.id, nom: obs.nom_agent || '', service: obs.service || '', heure: obs.heure_observation || '', commentaire: obs.commentaire_global || '', evaluations: existingEvals, critereCommentaires: existingComments });
                        }}
                      >✏️</Button>
                      <Button
                        variant="ghost" size="sm" className="text-red-400"
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Supprimer cette observation ?')) deleteObservation(obs.id);
                        }}
                      >🗑️</Button>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Grille de saisie des critères */}
                  {isSelected && (
                    <div className="border-t px-3 pb-3 pt-2 space-y-3">
                      {criteres.map(critere => {
                        const valeur = getValeurForObs(obs.id, critere.id);
                        return (
                          <div key={critere.id} className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">{critere.intitule}</p>
                            <div className="flex flex-wrap gap-1">
                              {AUDIT_VALEURS.map(v => (
                                <button
                                  key={v.value}
                                  onClick={() => setValeur(obs.id, critere.id, v.value)}
                                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                                    valeur === v.value
                                      ? v.couleur + ' border-current font-semibold'
                                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  {v.emoji} {v.label}
                                </button>
                              ))}
                            </div>
                            <input
                              className="w-full text-xs bg-gray-50 border border-gray-100 rounded px-2 py-0.5 mt-0.5 text-gray-500 placeholder:text-gray-300 focus:outline-none focus:border-gray-300"
                              placeholder="💬 commentaire..."
                              defaultValue={obs.resultats?.find(r => r.critere_id === critere.id)?.commentaire || ''}
                              onBlur={e => {
                                const currentValeur = getValeurForObs(obs.id, critere.id);
                                setValeur(obs.id, critere.id, currentValeur, e.target.value);
                              }}
                            />
                          </div>
                        );
                      })}
                      {obs.commentaire_global && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-2">
                          💬 {obs.commentaire_global}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => setObsDialog({ open: true })}
            disabled={criteres.length === 0}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" /> Nouvelle observation
          </Button>
        </TabsContent>

        {/* ═══ ONGLET CONSOLIDATION ═══ */}
        <TabsContent value="consolidation" className="space-y-4 pt-3">
          {observations.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Aucune observation saisie. Commencez la saisie terrain.</p>
          ) : (
            <>
              {/* Score global */}
              <Card className={
                pourcentageGlobal >= 80 ? 'border-green-300 bg-green-50' :
                pourcentageGlobal >= 60 ? 'border-orange-300 bg-orange-50' :
                'border-red-300 bg-red-50'
              }>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-4xl font-bold">{pourcentageGlobal}%</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Conformité globale · {totalConformes}/{totalEvalue} critères conformes · {observations.length} observations
                  </p>
                </CardContent>
              </Card>

              {/* Tableau par critère */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Détail par critère</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {stats.map(s => (
                    <div key={s.critere.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">{s.critere.intitule}</span>
                        <span className={`text-xs font-bold ${s.pourcentage >= 80 ? 'text-green-600' : s.pourcentage >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                          {s.pourcentage}% ({s.nb_conformes}/{s.nb_total_evalue})
                        </span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        <span className="bg-green-100 text-green-700 px-1.5 rounded">✅ {s.nb_conformes}</span>
                        <span className="bg-red-100 text-red-700 px-1.5 rounded">❌ {s.nb_non_conformes}</span>
                        <span className="bg-orange-100 text-orange-700 px-1.5 rounded">⚠️ {s.nb_partiellement}</span>
                        {s.nb_non_applicable > 0 && (
                          <span className="bg-gray-100 text-gray-600 px-1.5 rounded">➖ {s.nb_non_applicable}</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                        <div className="bg-green-500 h-2 transition-all" style={{ width: `${s.nb_total_evalue > 0 ? (s.nb_conformes / s.nb_total_evalue) * 100 : 0}%` }} />
                        <div className="bg-orange-400 h-2 transition-all" style={{ width: `${s.nb_total_evalue > 0 ? (s.nb_partiellement / s.nb_total_evalue) * 100 : 0}%` }} />
                        <div className="bg-red-400 h-2 transition-all" style={{ width: `${s.nb_total_evalue > 0 ? (s.nb_non_conformes / s.nb_total_evalue) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Graphiques */}
              {stats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-xs">Répartition globale</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={dataPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                            {dataPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  {stats.length > 1 && (
                    <Card>
                      <CardHeader><CardTitle className="text-xs">% par critère</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={dataBarres} layout="vertical">
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 9 }} />
                            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                            <Tooltip formatter={(v: number) => `${v}%`} />
                            <Bar dataKey="pourcentage" radius={[0, 4, 4, 0]}>
                              {dataBarres.map((e, i) => (
                                <Cell key={i} fill={e.pourcentage >= 80 ? '#22c55e' : e.pourcentage >= 60 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Interprétation manuelle */}
              <Card>
                <CardHeader><CardTitle className="text-xs">Interprétation & Analyse</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Points forts / bonnes pratiques</Label>
                    <Textarea
                      rows={2}
                      placeholder="Points positifs..."
                      value={audit?.points_forts || ''}
                      onChange={e => saveAudit({ points_forts: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Axes d'amélioration</Label>
                    <Textarea
                      rows={2}
                      placeholder="Axes d'amélioration..."
                      value={audit?.points_amelioration || ''}
                      onChange={e => saveAudit({ points_amelioration: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* IA : constat + propositions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs flex items-center justify-between">
                    Constat IA & Propositions d'actions
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={genererIA} disabled={loadingIA}>
                      <Sparkles className="w-3 h-3" />{loadingIA ? 'Génération...' : '✨ Générer'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audit?.constat_ia ? (
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap">{audit.constat_ia}</div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Cliquez "Générer" pour obtenir un constat automatique.</p>
                  )}
                  {audit?.propositions_ia && Array.isArray(audit.propositions_ia) && (audit.propositions_ia as Array<{
                    titre: string; description: string; priorite: string; ajoute_au_pacq?: boolean;
                  }>).map((p, i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium">{p.titre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                        <Badge className={`mt-1 text-xs ${p.priorite === 'haute' ? 'bg-red-100 text-red-700' : p.priorite === 'moyenne' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {p.priorite}
                        </Badge>
                      </div>
                      {p.ajoute_au_pacq ? (
                        <span className="text-xs text-green-600 shrink-0">✅ PACQ</span>
                      ) : (
                        <Button
                          size="sm" variant="outline" className="gap-1 text-xs shrink-0 h-7"
                          onClick={async () => {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;
                            const { data } = await supabase.from('actions_correctives').insert([{
                              titre: `[Audit] ${p.titre}`,
                              description: p.description,
                              responsable: audit?.qui || 'À définir',
                              date_echeance: audit?.date_prochain_audit || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                              priorite: p.priorite,
                              statut: 'en_cours',
                              user_id: user.id,
                              source: 'audit',
                            }]).select().single();
                            if (data) {
                              const props = [...(audit?.propositions_ia as typeof audit.propositions_ia || [])];
                              if (props[i]) props[i] = { ...props[i], ajoute_au_pacq: true };
                              await saveAudit({ propositions_ia: props });
                              toast.success('✅ Ajouté au PACQ Opérationnel');
                            }
                          }}
                        >
                          <ArrowRight className="w-3 h-3" /> PACQ
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ ONGLET COMPARATIF ═══ */}
        <TabsContent value="comparatif" className="space-y-4 pt-3">
          {!auditThemeLabel ? (
            <p className="text-center text-gray-400 py-8">Thème de l'audit non défini.</p>
          ) : loadingComparatif ? (
            <div className="text-center py-8 text-gray-400">Chargement...</div>
          ) : availableAudits.filter(a => a.id !== auditId).length === 0 ? (
            <p className="text-center text-gray-400 py-8 px-6">
              Aucun audit précédent disponible pour ce thème. Le comparatif sera disponible après la réalisation d'un second audit.
            </p>
          ) : (
            <>
              {/* Sélecteur d'audits */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Audits à comparer — thème : {auditThemeLabel}</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {availableAudits.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun audit avec ce thème.</p>
                  ) : availableAudits.map(a => {
                    const selected = comparatifAuditIds.includes(a.id);
                    const label = a.intitule || a.titre || 'Sans titre';
                    const dateLabel = getAuditDisplayDate(a);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          const newIds = selected
                            ? comparatifAuditIds.filter(id => id !== a.id)
                            : [...comparatifAuditIds, a.id];
                          setComparatifAuditIds(newIds);
                          loadComparatifData(newIds);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selected ? 'bg-orange-100 border-orange-400 text-orange-700 font-semibold' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {a.id === auditId ? '📌 ' : ''}{label}{dateLabel}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {comparatifAuditIds.length > 0 && Object.keys(comparatifStats).length > 0 && (
                <>
                  {/* Tableau comparatif */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Tableau comparatif</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium text-gray-600 min-w-[120px]">Critère</th>
                            {comparatifAuditIds.map(aid => {
                              const a = availableAudits.find(x => x.id === aid);
                              return (
                                <th key={aid} className="text-center p-2 font-medium text-gray-600 min-w-[110px]">
                                  {a?.id === auditId ? '📌 ' : ''}
                                  {a?.intitule || a?.titre || 'Audit'}
                                  {a ? getAuditDisplayDate(a) : ''}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b bg-gray-50 font-semibold">
                            <td className="p-2 text-gray-700">Conformité globale</td>
                            {comparatifAuditIds.map(aid => {
                              const pct = comparatifStats[aid]?.pourcentage_global ?? 0;
                              return (
                                <td key={aid} className={`text-center p-2 font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {pct}%
                                </td>
                              );
                            })}
                          </tr>
                          {[...new Set(comparatifAuditIds.flatMap(aid => Object.keys(comparatifStats[aid]?.criteres || {})))].map(crit => (
                            <tr key={crit} className="border-b hover:bg-gray-50">
                              <td className="p-2 text-gray-600">{crit}</td>
                              {comparatifAuditIds.map(aid => {
                                const pct = comparatifStats[aid]?.criteres?.[crit];
                                return (
                                  <td key={aid} className={`text-center p-2 ${pct === undefined ? 'text-gray-300' : pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                                    {pct !== undefined ? `${pct}%` : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* BarChart — conformité globale par audit */}
                  {comparatifAuditIds.length >= 2 && (
                    <Card>
                      <CardHeader><CardTitle className="text-xs">Évolution de la conformité globale</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={comparatifAuditIds.map(aid => {
                            const a = availableAudits.find(x => x.id === aid);
                            const label = (a?.intitule || a?.titre || 'Audit').slice(0, 10);
                            const shortDate = getAuditShortDate(a);
                            return {
                              name: shortDate ? `${label} ${shortDate}` : label,
                              pct: comparatifStats[aid]?.pourcentage_global ?? 0,
                            };
                          })}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9 }} />
                            <Tooltip formatter={(v: number) => `${v}%`} />
                            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                              {comparatifAuditIds.map((aid, i) => {
                                const pct = comparatifStats[aid]?.pourcentage_global ?? 0;
                                return <Cell key={i} fill={pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Analyse IA comparative */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xs flex items-center justify-between">
                        Analyse IA comparative
                        <Button
                          size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          disabled={loadingIAComparatif}
                          onClick={async () => {
                            const precedentId = comparatifAuditIds.find(id => id !== auditId);
                            if (!precedentId) { toast.error('Sélectionnez au moins 2 audits pour comparer'); return; }
                            setLoadingIAComparatif(true);
                            try {
                              const actuelAudit = availableAudits.find(x => x.id === auditId);
                              const precedentAudit = availableAudits.find(x => x.id === precedentId);
                              const actuelStats = comparatifStats[auditId];
                              const precedentStats = comparatifStats[precedentId];
                              const { data, error } = await supabase.functions.invoke('suggest-actions', {
                                body: {
                                  context_type: 'audit_comparatif',
                                  data: {
                                    audit_actuel: {
                                      titre: actuelAudit?.intitule || actuelAudit?.titre || audit?.titre || '',
                                      date_audit: actuelAudit?.date_fin || actuelAudit?.date_debut || actuelAudit?.date_audit || '',
                                      service: audit?.service || '',
                                      observations: Object.entries(actuelStats?.criteres || {}).map(([critere, pourcentage]) => ({ critere, pourcentage })),
                                    },
                                    audit_precedent: {
                                      titre: precedentAudit?.intitule || precedentAudit?.titre || '',
                                      date_audit: precedentAudit?.date_fin || precedentAudit?.date_debut || precedentAudit?.date_audit || '',
                                      service: audit?.service || '',
                                      observations: Object.entries(precedentStats?.criteres || {}).map(([critere, pourcentage]) => ({ critere, pourcentage })),
                                    },
                                    conformite_actuelle: actuelStats?.pourcentage_global ?? 0,
                                    conformite_precedente: precedentStats?.pourcentage_global ?? 0,
                                  },
                                },
                              });
                              if (error) throw error;
                              setIaComparatifTexte(data?.analyse || '');
                            } catch (e: unknown) {
                              toast.error('Erreur IA : ' + ((e as Error)?.message || 'inconnue'));
                            } finally { setLoadingIAComparatif(false); }
                          }}
                        >
                          <Sparkles className="w-3 h-3" />
                          {loadingIAComparatif ? 'Analyse...' : '✨ Analyser'}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    {(iaComparatifTexte || audit?.rapport_ia) && (
                      <CardContent className="space-y-3">
                        <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-700 space-y-2">
                          {(iaComparatifTexte || audit?.rapport_ia || '').split('\n').filter(Boolean).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                        {iaComparatifTexte && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 text-xs w-full"
                            disabled={savingIAComparatif}
                            onClick={async () => {
                              setSavingIAComparatif(true);
                              try {
                                await saveAudit({ rapport_ia: iaComparatifTexte, rapport_genere_le: new Date().toISOString() });
                                toast.success('Analyse sauvegardée ✅');
                              } catch { toast.error('Erreur sauvegarde'); }
                              finally { setSavingIAComparatif(false); }
                            }}
                          >
                            <Save className="w-3 h-3" />
                            {savingIAComparatif ? 'Sauvegarde...' : 'Sauvegarder l\'analyse'}
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ ONGLET RAPPORT ═══ */}
        <TabsContent value="rapport" className="space-y-3 pt-3">
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={genererRapport}
              disabled={loadingRapport || observations.length === 0}
            >
              <Sparkles className="w-4 h-4" />
              {loadingRapport ? 'Génération...' : '✨ Générer le rapport complet'}
            </Button>
            {audit?.rapport_ia && (
              <Button variant="outline" className="gap-2" onClick={telechargerRapport}>
                <FileText className="w-4 h-4" /> Télécharger
              </Button>
            )}
          </div>
          {observations.length === 0 && (
            <p className="text-sm text-gray-400 text-center">Saisissez des observations avant de générer le rapport.</p>
          )}
          {audit?.rapport_ia && (
            <Card>
              <CardContent className="pt-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto">
                  {audit.rapport_ia}
                </pre>
                {audit.rapport_genere_le && (
                  <p className="text-xs text-gray-400 mt-2">
                    Généré le {new Date(audit.rapport_genere_le).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog ajout/édition observation */}
      <Dialog open={obsDialog.open} onOpenChange={v => !v && setObsDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{obsDialog.id ? "Modifier l'observation" : 'Nouvelle observation'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-4 pb-2">
              <p className="text-xs text-gray-500">Tous les champs sont optionnels</p>

              {/* Champs généraux */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom de l'agent / personne observée</Label>
                  <Input
                    placeholder="ex: Dupont Marie"
                    value={obsDialog.nom || ''}
                    onChange={e => setObsDialog(d => ({ ...d, nom: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Service / Unité</Label>
                    <Input
                      placeholder="ex: Soins, Cuisine..."
                      value={obsDialog.service || ''}
                      onChange={e => setObsDialog(d => ({ ...d, service: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Heure d'observation</Label>
                    <Input
                      type="time"
                      value={obsDialog.heure || ''}
                      onChange={e => setObsDialog(d => ({ ...d, heure: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commentaire global</Label>
                  <Textarea
                    placeholder="Notes générales sur cette observation..."
                    rows={2}
                    value={obsDialog.commentaire || ''}
                    onChange={e => setObsDialog(d => ({ ...d, commentaire: e.target.value }))}
                  />
                </div>
              </div>

              {/* Évaluation des critères */}
              {criteres.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                      Évaluation des critères
                    </p>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  {criteres.map((critere, i) => {
                    const valeur = (obsDialog.evaluations || {})[critere.id] || 'non_evalue';
                    // On affiche seulement les 4 options significatives (pas non_evalue)
                    const options = AUDIT_VALEURS.filter(v => v.value !== 'non_evalue');
                    return (
                      <div key={critere.id} className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-700">
                          <span className="text-gray-400 mr-1">{i + 1}.</span>{critere.intitule}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map(v => (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => setObsDialog(d => ({
                                ...d,
                                evaluations: {
                                  ...(d.evaluations || {}),
                                  [critere.id]: valeur === v.value ? 'non_evalue' : v.value,
                                },
                              }))}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                valeur === v.value
                                  ? v.couleur + ' border-current font-semibold shadow-sm'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {v.emoji} {v.label}
                            </button>
                          ))}
                          {valeur !== 'non_evalue' && (
                            <button
                              type="button"
                              onClick={() => setObsDialog(d => ({
                                ...d,
                                evaluations: { ...(d.evaluations || {}), [critere.id]: 'non_evalue' },
                              }))}
                              className="text-xs px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600"
                            >
                              ✕ Effacer
                            </button>
                          )}
                        </div>
                        <Textarea
                          placeholder="Commentaire sur ce critère... (optionnel)"
                          rows={1}
                          className="text-xs resize-none mt-1"
                          value={(obsDialog.critereCommentaires || {})[critere.id] || ''}
                          onChange={e => setObsDialog(d => ({
                            ...d,
                            critereCommentaires: { ...(d.critereCommentaires || {}), [critere.id]: e.target.value }
                          }))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setObsDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSaveObs}>{obsDialog.id ? 'Mettre à jour' : 'Créer la fiche'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}