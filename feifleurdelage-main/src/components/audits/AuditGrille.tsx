import { useState, useEffect } from 'react';
import { useAuditComplet } from '@/hooks/useAuditComplet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles, FileText, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PropositionAction } from '@/types';

interface Props {
  auditId: string;
  onClose?: () => void;
}

const SEUIL_CONFORME = 80; // %

export function AuditGrille({ auditId, onClose }: Props) {
  const {
    audit, criteres, loading,
    saveAudit, addCritere, updateCritere, deleteCritere,
    pourcentageGlobal, totalConformes, totalAudite,
  } = useAuditComplet(auditId);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [nouveauCritere, setNouveauCritere] = useState({
    intitule: '', nb_conformes: 0, nb_total: 1, commentaire: '',
  });
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingRapport, setLoadingRapport] = useState(false);
  const [auditsPrecedents, setAuditsPrecedents] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (audit) setForm({ ...audit });
  }, [audit]);

  // Charger audits du même type pour la partie 4
  useEffect(() => {
    if (audit?.type_audit) {
      supabase.from('audits').select('id, titre, date_audit, nombre_echantillon, created_at')
        .eq('type_audit', audit.type_audit).neq('id', auditId)
        .order('date_audit', { ascending: false }).limit(5)
        .then(({ data }) => setAuditsPrecedents((data as Record<string, unknown>[]) || []));
    }
  }, [audit, auditId]);

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    const error = await saveAudit(form as Parameters<typeof saveAudit>[0]);
    if (error) toast.error('Erreur sauvegarde');
    else toast.success('Audit sauvegardé ✅');
  };

  const handleAddCritere = async () => {
    if (!nouveauCritere.intitule) { toast.error("Saisissez un intitulé"); return; }
    const error = await addCritere({
      ...nouveauCritere,
      audit_id: auditId,
      ordre: criteres.length,
    });
    if (!error) {
      setNouveauCritere({ intitule: '', nb_conformes: 0, nb_total: 1, commentaire: '' });
    }
  };

  // IA - Partie 6 : constat + propositions
  const genererAnalyseIA = async () => {
    if (criteres.length === 0) { toast.error("Ajoutez des critères d'abord"); return; }
    setLoadingIA(true);
    try {
      const criteresTexte = criteres.map(c =>
        `- ${c.intitule}: ${c.nb_conformes}/${c.nb_total} (${c.pourcentage}%) ${c.commentaire ? '- ' + c.commentaire : ''}`
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
            total_audite: totalAudite,
            criteres: criteresTexte,
          },
        },
      });
      if (error) throw error;
      const updates: Record<string, unknown> = {};
      if (data?.constat) updates.constat_ia = data.constat;
      if (data?.propositions) updates.propositions_ia = data.propositions;
      if (!data?.constat && data?.suggestion) updates.constat_ia = data.suggestion;
      await saveAudit(updates as Parameters<typeof saveAudit>[0]);
      toast.success('Analyse IA générée ✨');
    } catch (e: unknown) {
      toast.error('Erreur IA : ' + ((e as Error)?.message || 'inconnue'));
    } finally { setLoadingIA(false); }
  };

  // Ajouter proposition au PACQ Opérationnel
  const ajouterPropositionPacq = async (prop: PropositionAction, index: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Non connecté'); return; }
    const { data, error } = await supabase.from('actions_correctives').insert([{
      titre: `[Audit] ${prop.titre}`,
      description: prop.description,
      responsable: audit?.auditeur || 'À définir',
      date_echeance: audit?.date_prochain_audit || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priorite: prop.priorite,
      statut: 'en_cours',
      user_id: user.id,
      source: 'audit',
    }]).select().single();
    if (!error && data) {
      const props = [...((form.propositions_ia as PropositionAction[]) || [])];
      props[index] = { ...props[index], ajoute_au_pacq: true, pacq_action_id: (data as { id: string }).id };
      await saveAudit({ propositions_ia: props });
      toast.success('Action ajoutée au PACQ Opérationnel ✅');
    } else {
      toast.error('Erreur PACQ');
    }
  };

  // Génération rapport IA
  const genererRapport = async () => {
    setLoadingRapport(true);
    try {
      const criteresTexte = criteres.map(c =>
        `- ${c.intitule}: ${c.nb_conformes}/${c.nb_total} (${c.pourcentage}%)`
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
            referentiels: [
              audit?.ref_has && 'HAS',
              audit?.ref_interne && 'Grille interne',
              audit?.ref_reglementation && 'Réglementation',
            ].filter(Boolean).join(', '),
            modalites: [
              audit?.modalite_directe && 'Observation directe',
              audit?.modalite_participante && 'Observation participante',
              audit?.modalite_questionnaire && 'Questionnaire',
            ].filter(Boolean).join(', '),
            echantillon: `${audit?.nombre_echantillon || 'N/A'} personnes`,
            pourcentage_global: pourcentageGlobal,
            total_conformes: totalConformes,
            total_audite: totalAudite,
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
      const rapport = data?.rapport || data?.content || data?.suggestion || '';
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
    const contenu = `
RAPPORT D'AUDIT — ${audit?.intitule || audit?.titre}
${'='.repeat(60)}
Généré le : ${new Date(audit?.rapport_genere_le || '').toLocaleDateString('fr-FR')}
Auditeur : ${audit?.qui || audit?.auditeur || 'N/A'}
Service : ${audit?.service || 'N/A'}
Période : ${audit?.date_debut || 'N/A'} → ${audit?.date_fin || 'N/A'}
Thème : ${audit?.theme || 'N/A'}

RÉSULTATS GLOBAUX
Conformité globale : ${pourcentageGlobal}% (${totalConformes}/${totalAudite})

CRITÈRES DÉTAILLÉS
${criteres.map(c => `${c.intitule}: ${c.nb_conformes}/${c.nb_total} = ${c.pourcentage}%`).join('\n')}

${audit.rapport_ia}
    `.trim();
    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-audit-${(audit?.intitule || 'audit').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport téléchargé');
  };

  // Données graphiques
  const dataBarres = criteres.map(c => ({
    name: c.intitule.length > 20 ? c.intitule.substring(0, 20) + '…' : c.intitule,
    conformes: c.nb_conformes,
    nonConformes: c.nb_total - c.nb_conformes,
    pourcentage: c.pourcentage,
  }));
  const dataPie = [
    { name: 'Conformes', value: totalConformes },
    { name: 'Non conformes', value: totalAudite - totalConformes },
  ];

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {(form.intitule as string) || (form.titre as string) || 'Nouvel audit'}
          </h1>
          <p className="text-sm text-gray-500">Grille d'audit complète</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Retour</Button>
          <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" />Sauvegarder</Button>
        </div>
      </div>

      {/* PARTIE 1 — Contexte */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Contexte</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Intitulé de l'audit</Label>
            <Input value={(form.intitule as string) || ''} onChange={e => set('intitule', e.target.value)} placeholder="Intitulé libre de l'audit..." />
          </div>
          <div className="space-y-1">
            <Label>Qui (auditeur/référente)</Label>
            <Input value={(form.qui as string) || ''} onChange={e => set('qui', e.target.value)} placeholder="Nom de l'auditeur..." />
          </div>
          <div>
            <Label className="mb-2 block">Où (EHPAD)</Label>
            <div className="flex flex-wrap gap-4">
              {([['lieu_pasa', 'PASA'], ['lieu_rdc', 'Rez-de-chaussée'], ['lieu_etage', 'Étage'], ['lieu_temporaire', 'Temporaire']] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={!!form[key]} onCheckedChange={v => set(key, v)} id={key} />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date de début</Label>
              <Input type="date" value={(form.date_debut as string) || ''} onChange={e => set('date_debut', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date de fin</Label>
              <Input type="date" value={(form.date_fin as string) || ''} onChange={e => set('date_fin', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Fréquence</Label>
            <Input value={(form.frequence as string) || ''} onChange={e => set('frequence', e.target.value)} placeholder="Ex: Annuel, Semestriel..." />
          </div>
          <div className="space-y-1">
            <Label>Thème</Label>
            <Input value={(form.theme as string) || ''} onChange={e => set('theme', e.target.value)} placeholder="Thème de l'audit..." />
          </div>
        </CardContent>
      </Card>

      {/* PARTIE 2 — Méthodologie */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Méthodologie</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">Référentiels utilisés</Label>
            <div className="space-y-2">
              {([['ref_has', 'HAS'], ['ref_interne', "Grille d'audit interne"], ['ref_reglementation', 'Réglementation']] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={!!form[key]} onCheckedChange={v => set(key, v)} id={key} />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.ref_autres} onCheckedChange={v => set('ref_autres', v)} id="ref_autres" />
                <Label htmlFor="ref_autres">Autres :</Label>
                {form.ref_autres && (
                  <Input className="flex-1" value={(form.ref_autres_detail as string) || ''} onChange={e => set('ref_autres_detail', e.target.value)} placeholder="Précisez..." />
                )}
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Modalités</Label>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox checked={!!form.modalite_directe} onCheckedChange={v => set('modalite_directe', v)} id="modalite_directe" />
                <Label htmlFor="modalite_directe">Observation directe : observer directement à l'aide d'une grille une situation que l'on cherche à étudier <strong>SANS y intervenir</strong></Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox checked={!!form.modalite_participante} onCheckedChange={v => set('modalite_participante', v)} id="modalite_participante" />
                <Label htmlFor="modalite_participante">Observation participante : observer directement à l'aide d'une grille une situation que l'on cherche à étudier <strong>en y intervenant</strong></Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.modalite_questionnaire} onCheckedChange={v => set('modalite_questionnaire', v)} id="modalite_questionnaire" />
                <Label htmlFor="modalite_questionnaire">Questionnaire : liste de questions écrites</Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Échantillonnage</Label>
            <div className="flex flex-wrap gap-4 mb-2">
              {([['echantillon_residents', 'Résidents'], ['echantillon_professionnels', 'Professionnels'], ['echantillon_partenaires', 'Partenaires extérieurs']] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={!!form[key]} onCheckedChange={v => set(key, v)} id={key} />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label>Nombre :</Label>
              <Input type="number" className="w-24" value={(form.nombre_echantillon as number) || ''} onChange={e => set('nombre_echantillon', parseInt(e.target.value) || null)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PARTIE 3 — Résultats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            3. Résultats
            {totalAudite > 0 && (
              <Badge className={pourcentageGlobal >= SEUIL_CONFORME ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                Conformité globale : {pourcentageGlobal}% ({totalConformes}/{totalAudite})
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tableau des critères */}
          <div className="space-y-2">
            {criteres.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={c.intitule}
                    onChange={e => updateCritere(c.id, { intitule: e.target.value })}
                    placeholder="Intitulé du critère..."
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number" className="w-16 text-center"
                      value={c.nb_conformes}
                      min={0} max={c.nb_total}
                      onChange={e => updateCritere(c.id, { nb_conformes: parseInt(e.target.value) || 0 })}
                    />
                    <span className="text-gray-400">/</span>
                    <Input
                      type="number" className="w-16 text-center"
                      value={c.nb_total}
                      min={1}
                      onChange={e => updateCritere(c.id, { nb_total: parseInt(e.target.value) || 1 })}
                    />
                    <Badge className={`w-14 text-center justify-center shrink-0 ${(c.pourcentage || 0) >= SEUIL_CONFORME ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.pourcentage}%
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => deleteCritere(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  value={c.commentaire || ''}
                  onChange={e => updateCritere(c.id, { commentaire: e.target.value })}
                  placeholder="Commentaire (optionnel)..."
                  className="text-sm"
                />
                {/* Barre de progression */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${(c.pourcentage || 0) >= SEUIL_CONFORME ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${c.pourcentage || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Ajout critère */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400 font-medium">+ Nouveau critère</p>
            <Input value={nouveauCritere.intitule} onChange={e => setNouveauCritere(n => ({ ...n, intitule: e.target.value }))} placeholder="Intitulé du critère..." />
            <div className="flex items-center gap-2">
              <Input type="number" className="w-20" value={nouveauCritere.nb_conformes} min={0} onChange={e => setNouveauCritere(n => ({ ...n, nb_conformes: parseInt(e.target.value) || 0 }))} placeholder="Conformes" />
              <span>/</span>
              <Input type="number" className="w-20" value={nouveauCritere.nb_total} min={1} onChange={e => setNouveauCritere(n => ({ ...n, nb_total: parseInt(e.target.value) || 1 }))} placeholder="Total" />
              <span className="text-sm text-gray-500">= {nouveauCritere.nb_total > 0 ? Math.round((nouveauCritere.nb_conformes / nouveauCritere.nb_total) * 100) : 0}%</span>
              <Button onClick={handleAddCritere} size="sm" className="gap-1 ml-auto"><Plus className="w-3 h-3" /> Ajouter</Button>
            </div>
          </div>

          {/* Graphiques (si données) */}
          {criteres.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Camembert global */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 text-center">Conformité globale</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dataPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => `${v} (${totalAudite > 0 ? Math.round((v / totalAudite) * 100) : 0}%)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Barres par critère */}
              {criteres.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 text-center">% par critère</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dataBarres} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="pourcentage" radius={[0, 4, 4, 0]}>
                        {dataBarres.map((entry, i) => (
                          <Cell key={i} fill={(entry.pourcentage || 0) >= SEUIL_CONFORME ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PARTIE 4 — Comparaison audit précédent */}
      <Card>
        <CardHeader><CardTitle className="text-base">4. Comparaison avec l'audit précédent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {auditsPrecedents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Audits précédents du même type :</p>
              {auditsPrecedents.map(a => {
                const isSelected = form.audit_precedent_id === a.id;
                return (
                  <div
                    key={a.id as string}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-orange-400 bg-orange-50' : 'hover:border-gray-300'}`}
                    onClick={() => set('audit_precedent_id', isSelected ? null : a.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{a.titre as string}</span>
                      <span className="text-xs text-gray-400">
                        {a.date_audit ? new Date(a.date_audit as string).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </span>
                    </div>
                    {a.nombre_echantillon && <span className="text-xs text-gray-500">Échantillon : {a.nombre_echantillon as number}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Aucun audit précédent du même type trouvé.</p>
          )}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <Label>Date de l'audit précédent</Label>
              <Input type="date" value={(form.date_audit_precedent as string) || ''} onChange={e => set('date_audit_precedent', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Échantillon précédent</Label>
              <Input type="number" value={(form.echantillon_precedent as number) || ''} onChange={e => set('echantillon_precedent', parseInt(e.target.value) || null)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PARTIE 5 — Interprétation & Analyse */}
      <Card>
        <CardHeader><CardTitle className="text-base">5. Interprétation & Analyse</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Points forts / bonnes pratiques</Label>
            <Textarea rows={3} value={(form.points_forts as string) || ''} onChange={e => set('points_forts', e.target.value)} placeholder="Points positifs identifiés..." />
          </div>
          <div className="space-y-1">
            <Label>Analyse des points de non-conformité / axes d'amélioration</Label>
            <Textarea rows={3} value={(form.points_amelioration as string) || ''} onChange={e => set('points_amelioration', e.target.value)} placeholder="Axes d'amélioration identifiés..." />
          </div>
        </CardContent>
      </Card>

      {/* PARTIE 6 — Propositions d'actions (IA) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            6. Constat & Propositions d'actions
            <Button variant="outline" size="sm" className="gap-1" onClick={genererAnalyseIA} disabled={loadingIA}>
              <Sparkles className="w-4 h-4" />
              {loadingIA ? 'Génération...' : "✨ Générer avec l'IA"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.constat_ia ? (
            <div>
              <Label className="mb-1 block">Constat</Label>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{form.constat_ia as string}</div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Cliquez sur "Générer avec l'IA" pour obtenir un constat automatique basé sur vos données.</p>
          )}

          {form.propositions_ia && Array.isArray(form.propositions_ia) && (form.propositions_ia as PropositionAction[]).length > 0 && (
            <div className="space-y-2">
              <Label>Propositions d'actions</Label>
              {(form.propositions_ia as PropositionAction[]).map((prop, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{prop.titre}</p>
                      <p className="text-xs text-gray-600 mt-1">{prop.description}</p>
                      <Badge className={`mt-1 text-xs ${prop.priorite === 'haute' ? 'bg-red-100 text-red-700' : prop.priorite === 'moyenne' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {prop.priorite}
                      </Badge>
                    </div>
                    {prop.ajoute_au_pacq ? (
                      <span className="text-xs text-green-600 font-medium shrink-0">✅ Dans le PACQ</span>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={() => ajouterPropositionPacq(prop, i)}>
                        <ArrowRight className="w-3 h-3" /> PACQ Opérationnel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PARTIE 7 — Communication */}
      <Card>
        <CardHeader><CardTitle className="text-base">7. Communication</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Date de présentation du document</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox checked={!!form.comm_encadrement} onCheckedChange={v => set('comm_encadrement', v)} id="comm_encadrement" />
                <Label htmlFor="comm_encadrement">À l'encadrement & direction</Label>
                {form.comm_encadrement && (
                  <Input type="date" className="w-40" value={(form.comm_encadrement_date as string) || ''} onChange={e => set('comm_encadrement_date', e.target.value)} />
                )}
              </div>
              <div className="ml-6 space-y-1">
                <Label className="text-xs text-gray-500">Aux instances :</Label>
                {([['comm_cvs', 'CVS'], ['comm_cse', 'CSE'], ['comm_codir', 'CODIR']] as [string, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 ml-2">
                    <Checkbox checked={!!form[key]} onCheckedChange={v => set(key, v)} id={key} />
                    <Label htmlFor={key}>{label}</Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.comm_autres} onCheckedChange={v => set('comm_autres', v)} id="comm_autres" />
                <Label htmlFor="comm_autres">Autres :</Label>
                {form.comm_autres && (
                  <Input value={(form.comm_autres_detail as string) || ''} onChange={e => set('comm_autres_detail', e.target.value)} placeholder="Précisez..." className="flex-1" />
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Date prévisionnelle du prochain audit</Label>
            <Input type="date" value={(form.date_prochain_audit as string) || ''} onChange={e => set('date_prochain_audit', e.target.value)} />
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2 font-medium">Rédaction</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom et prénom</Label>
                <Input value={(form.redacteur_nom as string) || ''} onChange={e => set('redacteur_nom', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fonction</Label>
                <Input value={(form.redacteur_fonction as string) || ''} onChange={e => set('redacteur_fonction', e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAPPORT IA */}
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Rapport d'audit complet (généré par l'IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button className="gap-2 flex-1" onClick={genererRapport} disabled={loadingRapport}>
              <Sparkles className="w-4 h-4" />
              {loadingRapport ? 'Génération en cours...' : '✨ Générer le rapport complet'}
            </Button>
            {form.rapport_ia && (
              <Button variant="outline" className="gap-2" onClick={telechargerRapport}>
                <FileText className="w-4 h-4" /> Télécharger
              </Button>
            )}
          </div>
          {form.rapport_ia && (
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {form.rapport_ia as string}
            </div>
          )}
          {form.rapport_genere_le && (
            <p className="text-xs text-gray-400">
              Généré le {new Date(form.rapport_genere_le as string).toLocaleDateString('fr-FR')} à {new Date(form.rapport_genere_le as string).toLocaleTimeString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bouton save final */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} size="lg" className="gap-2"><Save className="w-4 h-4" />Sauvegarder l'audit</Button>
      </div>
    </div>
  );
}
