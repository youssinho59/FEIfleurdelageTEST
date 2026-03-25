import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCvsDemandes, CvsDemande, CvsDemandeCategorie, CvsDemandeStatut } from '@/hooks/useCvsDemandes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, FileText, CheckCircle, XCircle, Clock, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: { value: CvsDemandeCategorie; label: string }[] = [
  { value: 'alimentation', label: '🍽️ Alimentation' },
  { value: 'cadre_de_vie', label: '🏠 Cadre de vie' },
  { value: 'animations', label: '🎭 Animations' },
  { value: 'soins', label: '💊 Soins' },
  { value: 'organisation', label: '📋 Organisation' },
  { value: 'autre', label: '📌 Autre' },
];

const STATUTS: { value: CvsDemandeStatut; label: string; color: string; border: string }[] = [
  { value: 'en_analyse', label: "En cours d'analyse", color: 'bg-yellow-100 text-yellow-800', border: '#eab308' },
  { value: 'acceptee', label: 'Acceptée', color: 'bg-green-100 text-green-800', border: '#22c55e' },
  { value: 'partiellement_acceptee', label: 'Partiellement acceptée', color: 'bg-blue-100 text-blue-800', border: '#3b82f6' },
  { value: 'refusee', label: 'Refusée', color: 'bg-red-100 text-red-800', border: '#ef4444' },
];

const emptyForm = {
  date_reunion: '',
  auteur: '',
  categorie: 'autre' as CvsDemandeCategorie,
  description: '',
  statut: 'en_analyse' as CvsDemandeStatut,
  motif_refus: '',
  action_proposee: '',
  delai_prevu: '',
  responsable: '',
  ajoute_au_pacq: false,
  compte_rendu_reunion: '',
  date_reponse_cvs: '',
};

export function CvsDemandesTab() {
  const { demandes, loading, addDemande, updateDemande, deleteDemande, ajouterAuPacqOperationnel } = useCvsDemandes();

  // Form dialog
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<CvsDemande | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loadingIA, setLoadingIA] = useState(false);

  // Agents (responsable select)
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
      .then(({ data }) => setAgents((data || []) as { id: string; full_name: string }[]));
  }, []);

  // Filtres
  const [filterDate, setFilterDate] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');

  // ── Filtrage & groupement ────────────────────────────────────────────────

  const demandesFiltrees = demandes.filter(d => {
    const dateOk = filterDate ? d.date_reunion === filterDate : true;
    const statutOk = filterStatut === 'tous' ? true : d.statut === filterStatut;
    return dateOk && statutOk;
  });

  const reunions = [...new Set(demandesFiltrees.map(d => d.date_reunion))].sort((a, b) => b.localeCompare(a));

  // ── Dialog form ──────────────────────────────────────────────────────────

  const handleOpen = (item?: CvsDemande) => {
    if (item) { setEditItem(item); setForm({ ...emptyForm, ...item }); }
    else { setEditItem(null); setForm(emptyForm); }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.date_reunion || !form.auteur || !form.description) {
      toast.error('Remplissez les champs obligatoires (date, auteur, description)');
      return;
    }
    const error = editItem
      ? await updateDemande(editItem.id, form)
      : await addDemande(form);
    if (error) { toast.error("Erreur lors de l'enregistrement"); }
    else { toast.success(editItem ? 'Demande mise à jour' : 'Demande ajoutée'); setOpen(false); }
  };

  // ── Suggestion IA ────────────────────────────────────────────────────────

  const suggestActionIA = async () => {
    if (!form.description) {
      toast.error("Saisissez d'abord la description de la demande");
      return;
    }
    setLoadingIA(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-actions', {
        body: {
          context_type: 'cvs_demande',
          data: {
            categorie: form.categorie,
            description: form.description,
          },
        },
      });
      if (error) throw error;
      if (data?.suggestion) {
        setForm(f => ({ ...f, action_proposee: data.suggestion }));
        toast.success('Suggestion IA générée ✨');
      } else {
        toast.error("Pas de suggestion reçue");
      }
    } catch (e: unknown) {
      console.error('Erreur IA CVS:', e);
      toast.error("Erreur IA : " + (e instanceof Error ? e.message : 'inconnue'));
    } finally {
      setLoadingIA(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    total: demandes.length,
    enAnalyse: demandes.filter(d => d.statut === 'en_analyse').length,
    acceptees: demandes.filter(d => d.statut === 'acceptee').length,
    refusees: demandes.filter(d => d.statut === 'refusee').length,
    pacq: demandes.filter(d => d.ajoute_au_pacq).length,
  };

  return (
    <div className="space-y-6 p-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between gap-3 items-start md:items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Demandes du CVS</h2>
          <p className="text-sm text-gray-500">Conseil de la Vie Sociale — suivi par réunion</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </Button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-600' },
          { label: 'En analyse', value: stats.enAnalyse, icon: Clock, color: 'text-yellow-600' },
          { label: 'Acceptées', value: stats.acceptees, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Refusées', value: stats.refusees, icon: XCircle, color: 'text-red-600' },
          { label: 'Dans le PACQ', value: stats.pacq, icon: ArrowRight, color: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-2 px-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Réunion :</Label>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44 text-sm" />
          {filterDate && <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>✕</Button>}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Statut :</Label>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-52 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reunions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune demande CVS enregistrée</p>
          <p className="text-xs mt-1">Cliquez sur "Nouvelle demande" pour commencer</p>
        </div>
      ) : (
        reunions.map(date => {
          const items = demandesFiltrees.filter(d => d.date_reunion === date);
          return (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                  📅 Réunion du {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  <span className="ml-2 text-gray-400 font-normal">({items.length} demande{items.length > 1 ? 's' : ''})</span>
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {items.map(d => {
                const statut = STATUTS.find(s => s.value === d.statut)!;
                const cat = CATEGORIES.find(c => c.value === d.categorie);
                const peutAllerPacq = (d.statut === 'acceptee' || d.statut === 'partiellement_acceptee') && !!d.action_proposee;
                return (
                  <Card key={d.id} className="border-l-4" style={{ borderLeftColor: statut.border }}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex flex-col md:flex-row justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="outline" className="text-xs">{cat?.label}</Badge>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statut.color}`}>{statut.label}</span>
                            {d.ajoute_au_pacq && (
                              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                                ✅ Dans le PACQ Opérationnel
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800">{d.description}</p>
                          <p className="text-xs text-gray-500">Par : <span className="font-medium">{d.auteur}</span></p>
                          {d.action_proposee && (
                            <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                              <span className="font-medium">Action proposée :</span> {d.action_proposee}
                            </p>
                          )}
                          {d.motif_refus && (
                            <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              <span className="font-medium">Motif de refus :</span> {d.motif_refus}
                            </p>
                          )}
                          {(d.responsable || d.delai_prevu) && (
                            <p className="text-xs text-gray-500">
                              {d.responsable && <>Responsable : {d.responsable}</>}
                              {d.delai_prevu && <> — Échéance : {new Date(d.delai_prevu + 'T00:00:00').toLocaleDateString('fr-FR')}</>}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 min-w-fit">
                          <Button size="sm" variant="outline" onClick={() => handleOpen(d)}>Modifier</Button>
                          {!d.ajoute_au_pacq && (d.statut === 'acceptee' || d.statut === 'partiellement_acceptee') && (
                            <Button
                              size="sm"
                              className="gap-1 text-xs w-full"
                              disabled={!peutAllerPacq}
                              onClick={async () => {
                                const error = await ajouterAuPacqOperationnel(d);
                                if (error) toast.error('Erreur PACQ : ' + (error as Error)?.message);
                                else toast.success('✅ Action créée dans le PACQ Opérationnel !');
                              }}
                            >
                              <ArrowRight className="w-3 h-3" /> Créer action PACQ
                            </Button>
                          )}
                          {d.ajoute_au_pacq && (
                            <span className="text-xs text-green-600 font-medium text-center">✅ Dans le PACQ</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 text-xs"
                            onClick={async () => { if (confirm('Supprimer cette demande ?')) await deleteDemande(d.id); }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>

                      {/* ── Section PACQ bas de card ────────────────────── */}
                      {!d.ajoute_au_pacq && (
                        <div className="mt-3 pt-2.5 border-t border-gray-100">
                          <span className="text-xs text-gray-400 italic">
                            {d.statut === 'en_analyse' && "Acceptez la demande pour pouvoir créer une action PACQ"}
                            {d.statut === 'refusee' && "Demande refusée — pas d'action PACQ"}
                            {(d.statut === 'acceptee' || d.statut === 'partiellement_acceptee') && !d.action_proposee && "Ajoutez une action proposée pour créer une action PACQ Opérationnel"}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })
      )}

      {/* ── Dialog ajout / modification ─────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Modifier la demande' : 'Nouvelle demande CVS'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Date de réunion *</Label>
              <Input type="date" value={form.date_reunion} onChange={e => setForm(f => ({ ...f, date_reunion: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Auteur *</Label>
              <Input
                placeholder="Résident, famille, représentant CVS..."
                value={form.auteur}
                onChange={e => setForm(f => ({ ...f, auteur: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v as CvsDemandeCategorie }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v as CvsDemandeStatut }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Description de la demande *</Label>
              <Textarea
                placeholder="Décrivez la demande formulée..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center justify-between mb-1">
                <Label>Action proposée en réponse</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={suggestActionIA}
                  disabled={loadingIA || !form.description}
                >
                  {loadingIA
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Génération...</>
                    : <><Sparkles className="w-3 h-3" /> Suggérer avec l'IA</>
                  }
                </Button>
              </div>
              <Textarea
                placeholder="Quelle action est prévue pour répondre à cette demande ?"
                value={form.action_proposee || ''}
                onChange={e => setForm(f => ({ ...f, action_proposee: e.target.value }))}
                rows={3}
              />
            </div>
            {form.statut === 'refusee' && (
              <div className="md:col-span-2 space-y-1">
                <Label>Motif de refus</Label>
                <Textarea
                  placeholder="Justification du refus..."
                  value={form.motif_refus || ''}
                  onChange={e => setForm(f => ({ ...f, motif_refus: e.target.value }))}
                  rows={2}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Responsable</Label>
              <Select
                value={form.responsable || ''}
                onValueChange={v => setForm(f => ({ ...f, responsable: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner un agent..." /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.full_name}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Délai prévu</Label>
              <Input type="date" value={form.delai_prevu || ''} onChange={e => setForm(f => ({ ...f, delai_prevu: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Date de réponse au CVS</Label>
              <Input type="date" value={form.date_reponse_cvs || ''} onChange={e => setForm(f => ({ ...f, date_reponse_cvs: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Compte-rendu de la réunion (optionnel)</Label>
              <Textarea
                placeholder="Notes ou résumé du CR CVS..."
                value={form.compte_rendu_reunion || ''}
                onChange={e => setForm(f => ({ ...f, compte_rendu_reunion: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>{editItem ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
