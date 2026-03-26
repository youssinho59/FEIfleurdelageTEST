import { useState } from 'react';
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
import { Plus, Trash2, ClipboardList, BarChart3, FileText, Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
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
    setValeur,
  } = useAuditTerrain(auditId);

  const { audit, saveAudit } = useAuditComplet(auditId);

  const [nouveauCritere, setNouveauCritere] = useState('');
  const [obsDialog, setObsDialog] = useState<{
    open: boolean; id?: string; nom?: string; service?: string; heure?: string; commentaire?: string;
  }>({ open: false });
  const [obsSelectee, setObsSelectee] = useState<string | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingRapport, setLoadingRapport] = useState(false);

  const handleAddCritere = async () => {
    if (!nouveauCritere.trim()) return;
    await addCritere(nouveauCritere.trim());
    setNouveauCritere('');
  };

  const handleSaveObs = async () => {
    if (obsDialog.id) {
      await updateObservation(obsDialog.id, {
        nom_agent: obsDialog.nom,
        service: obsDialog.service,
        heure_observation: obsDialog.heure,
        commentaire_global: obsDialog.commentaire,
      });
      toast.success('Observation mise à jour');
    } else {
      const error = await addObservation({
        nom_agent: obsDialog.nom,
        service: obsDialog.service,
        heure_observation: obsDialog.heure,
        commentaire_global: obsDialog.commentaire,
      });
      if (!error) toast.success('Observation ajoutée');
    }
    setObsDialog({ open: false });
  };

  const getValeurForObs = (obsId: string, critereId: string): AuditValeur => {
    const obs = observations.find(o => o.id === obsId);
    return (obs?.resultats?.find(r => r.critere_id === critereId)?.valeur as AuditValeur) || 'non_evalue';
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
        <Button variant="outline" size="sm" onClick={onClose}>← Retour</Button>
      </div>

      <Tabs defaultValue="terrain">
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
                          setObsDialog({ open: true, id: obs.id, nom: obs.nom_agent || '', service: obs.service || '', heure: obs.heure_observation || '', commentaire: obs.commentaire_global || '' });
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{obsDialog.id ? "Modifier l'observation" : 'Nouvelle observation'}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">Tous les champs sont optionnels</p>
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setObsDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSaveObs}>{obsDialog.id ? 'Mettre à jour' : 'Créer la fiche'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
