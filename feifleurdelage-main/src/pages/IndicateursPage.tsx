import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown,
  PencilLine,
  BarChart2,
  Loader2,
  Link2,
  X,
  Trash2,
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type IndicateurDef = {
  label: string;
  unit?: string;
  calculated?: true;
};

type ThemeDef = {
  id: string;
  label: string;
  indicateurs: IndicateurDef[];
};

type DomaineDef = {
  id: string;
  label: string;
  tabLabel: string;
  themes: ThemeDef[];
};

type ValeurRecord = {
  id: string;
  domaine: string;
  theme: string | null;
  indicateur: string;
  date_mois: string;
  valeur: number | null;
};

// ── Access map ────────────────────────────────────────────────────────────────

const DOMAINE_ACCESS: Record<string, string[]> = {
  animation: ["animatrice", "animation"],
  ergo: ["ergothérapeute", "ergo"],
  locaux: ["hôtellerie", "ash", "locaux"],
  psy: ["psychologue", "psy"],
  medecin: ["médecin", "medecin_co"],
  rh_admin: [], // admin only
};

// ── Domain definitions ────────────────────────────────────────────────────────

const DOMAINES: DomaineDef[] = [
  {
    id: "animation",
    label: "Animation",
    tabLabel: "Animation",
    themes: [
      {
        id: "activites",
        label: "Activités & Animations",
        indicateurs: [
          { label: "Nombre d'activités individuelles" },
          { label: "Nombre d'activités inter-EHPAD" },
          { label: "Nombre d'activités intergénérationnelles" },
          { label: "Nombre d'activités extérieures" },
          { label: "Nombre d'animations bien-être et/ou sensorielles" },
          { label: "Nombre d'animations d'expression et de communication" },
          { label: "Nombre d'animations de stimulation cognitive" },
          { label: "Nombre d'animations manuelles" },
          { label: "Nombre d'activités musicales" },
          { label: "Nombre d'activités ludiques" },
          { label: "Nombre d'activités spirituelles" },
          { label: "Nombre de repas festifs" },
          { label: "Nombre de participations total" },
          { label: "Nombre de bénévoles contractualisés" },
          { label: "Participation externe" },
        ],
      },
    ],
  },
  {
    id: "ergo",
    label: "Ergothérapie",
    tabLabel: "Ergothérapie",
    themes: [
      {
        id: "pec_non_med",
        label: "Prise en charge non médicamenteuse",
        indicateurs: [
          { label: "Ateliers indépendance" },
          { label: "Autres ateliers Ergo" },
        ],
      },
      {
        id: "chutes",
        label: "Chutes",
        indicateurs: [
          { label: "Nombre de chutes" },
          { label: "Nombre de résidents ayant chuté" },
          { label: "Nombre d'hospitalisations suite à une chute" },
        ],
      },
      {
        id: "pasa",
        label: "PASA",
        indicateurs: [
          { label: "Nombre de résidents au PASA" },
          { label: "Participation au PASA" },
          { label: "Entrées au PASA" },
          { label: "Sorties du PASA" },
        ],
      },
      {
        id: "amenagements",
        label: "Aménagements",
        indicateurs: [
          { label: "Nombre d'aménagements de l'environnement chambre" },
          {
            label: "Nombre d'installations du résident / prévention escarres",
          },
          { label: "Nombre de réglages (FR, rollator, déambulateur)" },
        ],
      },
    ],
  },
  {
    id: "locaux",
    label: "Organisation des locaux",
    tabLabel: "Locaux",
    themes: [
      {
        id: "conditions_accueil",
        label: "Conditions d'accueil",
        indicateurs: [
          {
            label:
              "Nombre d'entretiens complets de chambres prévus sur le mois",
          },
          {
            label:
              "Nombre d'entretiens complets de chambres réellement effectués",
          },
          {
            label:
              "Nombre d'entretiens complets de chambres inoccupées réalisés",
          },
          {
            label:
              "Nombre d'entretiens complets de chambres occupées réalisés",
          },
          {
            label:
              "Nombre d'entretiens complets de parties communes réalisés",
          },
          { label: "Ratio prévu/effectués (%)", unit: "%", calculated: true },
        ],
      },
    ],
  },
  {
    id: "psy",
    label: "Psychologue",
    tabLabel: "Psychologue",
    themes: [
      {
        id: "pec_psy",
        label: "Prise en charge psychologique",
        indicateurs: [
          { label: "Nombre d'entretiens individuels" },
          { label: "Nombre d'entretiens avec les familles" },
          { label: "Nombre d'entretiens avec des partenaires extérieurs" },
          { label: "Nombre de bilans psychologiques et psychométrie" },
          { label: "Taux de suivi individuel moyen (%)", unit: "%" },
        ],
      },
    ],
  },
  {
    id: "medecin",
    label: "Médecin coordonnateur",
    tabLabel: "Médecin co.",
    themes: [
      {
        id: "antibio",
        label: "Antibiothérapie",
        indicateurs: [
          { label: "Prescriptions de pénicillines" },
          { label: "Prescriptions de céphalosporines" },
          { label: "Prescriptions de fluoroquinolones" },
          { label: "Prescriptions de macrolides" },
          { label: "Prescriptions de nitrites" },
          { label: "Prescriptions autres" },
        ],
      },
      {
        id: "antalgiques",
        label: "Antalgiques",
        indicateurs: [
          { label: "Palier 1 (non opioïdes)" },
          { label: "Palier 2 (opioïdes faibles)" },
          { label: "Palier 3 (opioïdes forts)" },
        ],
      },
      {
        id: "neuro_psy",
        label: "Traitements neuro/psy",
        indicateurs: [
          { label: "Antidépresseurs" },
          { label: "Anxiolytiques" },
          { label: "Hypnotiques" },
          { label: "Antiépileptiques" },
          { label: "Anti-parkinsoniens" },
          { label: "Anti-douleurs" },
          { label: "Phytothérapie" },
        ],
      },
      {
        id: "autres_med",
        label: "Autres",
        indicateurs: [
          { label: "AINS et stéroïdes" },
          { label: "Diurétiques" },
          { label: "Laxatifs" },
          { label: "Contention au lit" },
          { label: "Contention fauteuil par ceinture" },
          { label: "% résidents vaccinés grippe", unit: "%" },
          { label: "% résidents vaccinés COVID", unit: "%" },
        ],
      },
    ],
  },
  {
    id: "rh_admin",
    label: "RH & Administratif",
    tabLabel: "RH & Admin",
    themes: [
      {
        id: "rh",
        label: "Ressources humaines (HAS/ARS)",
        indicateurs: [
          { label: "Effectif total ETP" },
          { label: "Taux d'absentéisme global (%)", unit: "%" },
          { label: "Nombre de jours d'absence (maladie)" },
          { label: "Nombre de jours d'absence (accident du travail)" },
          { label: "Nombre d'accidents du travail" },
          { label: "Taux de turn-over (%)", unit: "%" },
          { label: "Nombre de recrutements" },
          { label: "Nombre de départs" },
          { label: "Nombre d'heures de formation réalisées" },
          { label: "Nombre de salariés formés" },
          { label: "Taux de réalisation du plan de formation (%)", unit: "%" },
        ],
      },
      {
        id: "activite",
        label: "Activité et occupation",
        indicateurs: [
          { label: "Capacité d'accueil autorisée (nombre de lits)" },
          { label: "Nombre de résidents présents (moyenne mensuelle)" },
          { label: "Taux d'occupation (%)", unit: "%" },
          { label: "Nombre d'entrées dans le mois" },
          { label: "Nombre de sorties dans le mois (dont décès)" },
          { label: "Nombre de décès" },
          { label: "Durée moyenne de séjour (jours)" },
          { label: "GMP (GIR Moyen Pondéré)" },
          { label: "PMP (Pathos Moyen Pondéré)" },
        ],
      },
      {
        id: "qualite",
        label: "Qualité (obligatoires HAS)",
        indicateurs: [
          { label: "Nombre de FEI déclarées dans le mois" },
          { label: "Nombre de FEIG dans le mois" },
          { label: "Nombre de plaintes reçues" },
          { label: "Nombre d'actions correctives ouvertes" },
          { label: "Nombre d'actions correctives clôturées" },
          {
            label: "Taux de réalisation des audits planifiés (%)",
            unit: "%",
          },
          { label: "Nombre de questionnaires satisfaction traités" },
          { label: "Score satisfaction moyen (/10)" },
        ],
      },
    ],
  },
];

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// ── KpiCard ───────────────────────────────────────────────────────────────────

const KpiCard = ({
  label,
  value,
  prevValue,
  unit,
  actionCount,
  onLinkClick,
}: {
  label: string;
  value: number | null;
  prevValue: number | null;
  unit?: string;
  actionCount?: number;
  onLinkClick?: () => void;
}) => {
  const diff =
    value !== null && prevValue !== null ? value - prevValue : null;
  const TrendIcon =
    diff === null ? null : diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor =
    diff === null
      ? ""
      : diff > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : diff < 0
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <Card className="border-border/60">
      <CardContent className="px-3 pt-3 pb-3">
        <p className="text-[10px] text-muted-foreground leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
          {label}
        </p>
        <div className="flex items-end justify-between gap-1">
          <span className="text-xl font-bold text-foreground tabular-nums">
            {value !== null
              ? `${Number.isInteger(value) ? value : value.toFixed(1)}${unit || ""}`
              : "—"}
          </span>
          {TrendIcon && diff !== null && (
            <span className={cn("flex items-center gap-0.5 text-[10px] font-medium mb-0.5", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              {diff !== 0 && `${diff > 0 ? "+" : ""}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`}
            </span>
          )}
        </div>
        {diff !== null && (
          <p className="text-[9px] text-muted-foreground mt-0.5">vs mois préc.</p>
        )}
        {onLinkClick !== undefined && (
          <button
            onClick={(e) => { e.stopPropagation(); onLinkClick(); }}
            className={`mt-1.5 flex items-center gap-0.5 text-[9px] transition-colors ${
              actionCount && actionCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground/40 hover:text-muted-foreground'
            }`}
          >
            <Link2 className="w-2.5 h-2.5" />
            {actionCount && actionCount > 0 ? `${actionCount} action${actionCount > 1 ? 's' : ''} PACQ` : 'Lier une action'}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

// ── IndicateursPage ───────────────────────────────────────────────────────────

const IndicateursPage = () => {
  const { isAdmin, userServices } = useAuth();
  const [searchParams] = useSearchParams();

  // ── Access filtering ───────────────────────────────────────────────────────

  const visibleDomaines = useMemo(() => {
    if (isAdmin) return DOMAINES;
    return DOMAINES.filter((d) => {
      const allowed = DOMAINE_ACCESS[d.id] || [];
      if (allowed.length === 0) return false;
      return userServices.some((s) =>
        allowed.some((a) => a.toLowerCase() === s.toLowerCase())
      );
    });
  }, [isAdmin, userServices]);

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (visibleDomaines.length > 0 && !activeTab) {
      const paramDomaine = searchParams.get("domaine");
      if (paramDomaine) {
        const allTabIds = [...visibleDomaines.map((d) => d.id), "personnalise"];
        const found = allTabIds.find((id) => id === paramDomaine);
        setActiveTab(found || visibleDomaines[0].id);
      } else {
        setActiveTab(visibleDomaines[0].id);
      }
    }
  }, [visibleDomaines, activeTab]); // eslint-disable-line

  // ── Custom (Personnalisé) indicators ──────────────────────────────────────

  const [customIndicateurs, setCustomIndicateurs] = useState<{
    id: string; label: string; unite: string | null; valeur_cible: string | null; frequence: string | null;
  }[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [deletingCustomInd, setDeletingCustomInd] = useState<string | null>(null);

  const fetchCustomIndicateurs = useCallback(async () => {
    setLoadingCustom(true);
    const { data } = await supabase.from("indicateurs").select("*").eq("domaine", "Personnalisé").order("created_at", { ascending: false });
    setCustomIndicateurs((data as any[]) || []);
    setLoadingCustom(false);
  }, []);

  useEffect(() => {
    if (activeTab === "personnalise") fetchCustomIndicateurs();
  }, [activeTab, fetchCustomIndicateurs]);

  const deleteCustomIndicateur = async () => {
    if (!deletingCustomInd) return;
    const ind = customIndicateurs.find((i) => i.id === deletingCustomInd);
    if (!ind) return;
    await supabase.from("indicateurs_actions").delete()
      .eq("indicateur_domaine", "Personnalisé").eq("indicateur_label", ind.label);
    const { error } = await supabase.from("indicateurs").delete().eq("id", deletingCustomInd);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Indicateur supprimé");
    setDeletingCustomInd(null);
    fetchCustomIndicateurs();
  };

  // ── Month selector ─────────────────────────────────────────────────────────

  const now = useMemo(() => new Date(), []);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  const selectedDateStr = useMemo(
    () => `${selYear}-${String(selMonth).padStart(2, "0")}-01`,
    [selYear, selMonth]
  );

  const prevDateStr = useMemo(() => {
    const d = subMonths(new Date(selYear, selMonth - 1, 1), 1);
    return format(d, "yyyy-MM-01");
  }, [selYear, selMonth]);

  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

  // ── 12 rolling months (for charts) ────────────────────────────────────────

  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(startOfMonth(now), 11 - i);
      return {
        date: format(d, "yyyy-MM-01"),
        label: format(d, "MMM yy", { locale: fr }),
      };
    });
  }, [now]);

  // ── Data per domain ────────────────────────────────────────────────────────

  const [allData, setAllData] = useState<Record<string, ValeurRecord[]>>({});
  const [loadingDomain, setLoadingDomain] = useState<string | null>(null);

  const fetchDomainData = useCallback(
    async (domaineId: string) => {
      setLoadingDomain(domaineId);
      const fromDate = format(subMonths(startOfMonth(now), 13), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("indicateurs_valeurs")
        .select("*")
        .eq("domaine", domaineId)
        .gte("date_mois", fromDate)
        .order("date_mois", { ascending: true });

      if (!error && data) {
        setAllData((prev) => ({ ...prev, [domaineId]: data as ValeurRecord[] }));
      }
      setLoadingDomain(null);
    },
    [now]
  );

  useEffect(() => {
    if (activeTab && !(activeTab in allData)) {
      fetchDomainData(activeTab);
    }
  }, [activeTab, allData, fetchDomainData]);

  // ── Indicateurs ↔ PACQ ─────────────────────────────────────────────────────

  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [linkDialog, setLinkDialog] = useState<{open: boolean; domaine: string; label: string} | null>(null);
  const [pacqActions, setPacqActions] = useState<{id: string; titre: string; statut: string; priorite: string}[]>([]);
  const [pacqStrategiqeActions, setPacqStrategiqeActions] = useState<{id: string; intitule: string | null; avancement: string | null; priorite: string | null}[]>([]);
  const [linkedActions, setLinkedActions] = useState<{id: string; action_id: string; action_type: string}[]>([]);
  const [loadingLinkDialog, setLoadingLinkDialog] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  useEffect(() => {
    if (!activeTab) return;
    supabase.from('indicateurs_actions')
      .select('indicateur_label, indicateur_domaine')
      .eq('indicateur_domaine', activeTab)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((r: {indicateur_domaine: string; indicateur_label: string}) => {
          const key = `${r.indicateur_domaine}:${r.indicateur_label}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        setLinkedCounts((prev) => ({ ...prev, ...counts }));
      });
  }, [activeTab]);

  const openLinkDialog = async (domaine: string, label: string) => {
    setLinkDialog({ open: true, domaine, label });
    setLoadingLinkDialog(true);
    const [{ data: actions }, { data: stratActions }, { data: linked }] = await Promise.all([
      supabase.from('actions_correctives').select('id, titre, statut, priorite').order('created_at', { ascending: false }),
      supabase.from('pacq_strategique_actions').select('id, intitule, avancement, priorite').order('intitule', { ascending: true }),
      supabase.from('indicateurs_actions').select('id, action_id, action_type').eq('indicateur_domaine', domaine).eq('indicateur_label', label),
    ]);
    setPacqActions((actions || []) as {id: string; titre: string; statut: string; priorite: string}[]);
    setPacqStrategiqeActions((stratActions || []) as {id: string; intitule: string | null; avancement: string | null; priorite: string | null}[]);
    setLinkedActions((linked || []) as {id: string; action_id: string; action_type: string}[]);
    setLoadingLinkDialog(false);
  };

  const toggleLink = async (actionId: string, actionType: 'operationnel' | 'strategique' = 'operationnel') => {
    if (!linkDialog) return;
    const key = `${linkDialog.domaine}:${linkDialog.label}`;
    const existing = linkedActions.find((r) => r.action_id === actionId && r.action_type === actionType);
    if (existing) {
      await supabase.from('indicateurs_actions').delete().eq('id', existing.id);
      setLinkedActions((prev) => prev.filter((r) => r.id !== existing.id));
      setLinkedCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 1) - 1) }));
    } else {
      const { data } = await supabase.from('indicateurs_actions').insert([{
        indicateur_domaine: linkDialog.domaine,
        indicateur_label: linkDialog.label,
        action_id: actionId,
        action_type: actionType,
      }]).select().single();
      if (data) {
        setLinkedActions((prev) => [...prev, data as {id: string; action_id: string; action_type: string}]);
        setLinkedCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getDomainData = (id: string) => allData[id] || [];

  const getValue = (
    data: ValeurRecord[],
    indicateur: string,
    dateStr: string
  ): number | null => {
    const rec = data.find(
      (r) => r.indicateur === indicateur && r.date_mois === dateStr
    );
    return rec?.valeur ?? null;
  };

  const getChartData = (
    indicateur: string,
    data: ValeurRecord[]
  ) =>
    last12Months.map((m) => ({
      month: m.label,
      value: getValue(data, indicateur, m.date),
    }));

  // ── Saisie modal ───────────────────────────────────────────────────────────

  const [saisieOpen, setSaisieOpen] = useState(false);
  const [saisieValues, setSaisieValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeDomaine = useMemo(
    () => DOMAINES.find((d) => d.id === activeTab),
    [activeTab]
  );

  const openSaisie = useCallback(() => {
    if (!activeDomaine) return;
    const monthData = getDomainData(activeTab).filter(
      (r) => r.date_mois === selectedDateStr
    );
    const initial: Record<string, string> = {};
    activeDomaine.themes.forEach((t) =>
      t.indicateurs.forEach((ind) => {
        if (ind.calculated) return;
        const existing = monthData.find((r) => r.indicateur === ind.label);
        initial[ind.label] =
          existing?.valeur !== null && existing?.valeur !== undefined
            ? String(existing.valeur)
            : "";
      })
    );
    setSaisieValues(initial);
    setSaisieOpen(true);
  }, [activeDomaine, allData, activeTab, selectedDateStr]); // eslint-disable-line

  // Auto-compute locaux ratio in form state
  const locauxRatio = useMemo(() => {
    if (activeTab !== "locaux") return null;
    const prevus = parseFloat(
      saisieValues["Nombre d'entretiens complets de chambres prévus sur le mois"] || "0"
    );
    const effectues = parseFloat(
      saisieValues[
        "Nombre d'entretiens complets de chambres réellement effectués"
      ] || "0"
    );
    if (!prevus || isNaN(prevus) || isNaN(effectues)) return null;
    return Math.round((effectues / prevus) * 100);
  }, [activeTab, saisieValues]);

  const handleSave = async () => {
    if (!activeDomaine) return;
    setSaving(true);

    const rows: {
      domaine: string;
      theme: string | null;
      indicateur: string;
      date_mois: string;
      valeur: number | null;
    }[] = Object.entries(saisieValues).map(([indicateur, val]) => {
      const theme = activeDomaine.themes.find((t) =>
        t.indicateurs.some((i) => i.label === indicateur)
      );
      return {
        domaine: activeTab,
        theme: theme?.label ?? null,
        indicateur,
        date_mois: selectedDateStr,
        valeur: val === "" ? null : parseFloat(val.replace(",", ".")),
      };
    });

    // Add calculated ratio for locaux
    if (activeTab === "locaux") {
      rows.push({
        domaine: "locaux",
        theme: "Conditions d'accueil",
        indicateur: "Ratio prévu/effectués (%)",
        date_mois: selectedDateStr,
        valeur: locauxRatio,
      });
    }

    const { error } = await supabase
      .from("indicateurs_valeurs")
      .upsert(rows, { onConflict: "domaine,indicateur,date_mois" });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Valeurs enregistrées");
      setSaisieOpen(false);
      // Invalidate cached data to force re-fetch
      setAllData((prev) => {
        const next = { ...prev };
        delete next[activeTab];
        return next;
      });
    }
    setSaving(false);
  };

  // ── PDF export ─────────────────────────────────────────────────────────────

  const handleExportPdf = useCallback(() => {
    if (!activeDomaine) return;
    const domData = getDomainData(activeTab);
    const monthData = domData.filter((r) => r.date_mois === selectedDateStr);
    const prevData = domData.filter((r) => r.date_mois === prevDateStr);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const monthLabel = format(
      new Date(selYear, selMonth - 1, 1),
      "MMMM yyyy",
      { locale: fr }
    );

    // Header
    doc.setFillColor(234, 215, 255);
    doc.rect(0, 0, 210, 30, "F");
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 20, 120);
    doc.text(`Indicateurs — ${activeDomaine.label}`, 20, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 50, 150);
    doc.text(`Période : ${monthLabel}  |  EHPAD La Fleur de l'Âge`, 20, 22);

    let y = 40;

    activeDomaine.themes.forEach((theme) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      // Theme header
      doc.setFillColor(245, 240, 255);
      doc.rect(15, y - 4, 180, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(70, 20, 100);
      doc.text(theme.label, 18, y + 1);
      y += 10;

      theme.indicateurs.forEach((ind) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const val = monthData.find((r) => r.indicateur === ind.label)?.valeur ?? null;
        const prev = prevData.find((r) => r.indicateur === ind.label)?.valeur ?? null;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const labelLines = doc.splitTextToSize(ind.label, 120) as string[];
        doc.text(labelLines, 18, y);

        // Value
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        const valStr =
          val !== null
            ? `${Number.isInteger(val) ? val : val.toFixed(1)}${ind.unit || ""}`
            : "—";
        doc.text(valStr, 152, y, { align: "right" });

        // Trend
        if (val !== null && prev !== null) {
          const diff = val - prev;
          const r = diff > 0 ? 20 : diff < 0 ? 200 : 120;
          const g = diff > 0 ? 150 : diff < 0 ? 30 : 120;
          const b = 30;
          doc.setFontSize(7.5);
          doc.setTextColor(r, g, b);
          doc.text(
            `${diff > 0 ? "▲" : diff < 0 ? "▼" : "="} ${diff > 0 ? "+" : ""}${Number.isInteger(diff) ? diff : diff.toFixed(1)}`,
            190,
            y,
            { align: "right" }
          );
        }

        y += labelLines.length > 1 ? 7 * labelLines.length : 6;
      });
      y += 5;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(170);
    doc.text(
      `Document généré le ${format(new Date(), "dd/MM/yyyy", { locale: fr })} — EHPAD La Fleur de l'Âge`,
      105,
      290,
      { align: "center" }
    );

    doc.save(
      `Indicateurs_${activeDomaine.id}_${format(new Date(selYear, selMonth - 1, 1), "yyyy-MM")}.pdf`
    );
  }, [activeDomaine, allData, activeTab, selectedDateStr, prevDateStr, selYear, selMonth]); // eslint-disable-line

  // ── No access ──────────────────────────────────────────────────────────────

  if (visibleDomaines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">
          Vous n'avez pas accès à ce module.
        </p>
      </div>
    );
  }

  const domData = getDomainData(activeTab);
  const monthData = domData.filter((r) => r.date_mois === selectedDateStr);
  const prevMonthData = domData.filter((r) => r.date_mois === prevDateStr);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            Tableau de Bord — Indicateurs
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Suivi mensuel des indicateurs qualité par domaine
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          {visibleDomaines.map((d) => (
            <TabsTrigger key={d.id} value={d.id} className="text-xs">
              {d.tabLabel}
            </TabsTrigger>
          ))}
          {isAdmin && (
            <TabsTrigger value="personnalise" className="text-xs">
              Personnalisé
            </TabsTrigger>
          )}
        </TabsList>

        {visibleDomaines.map((domaine) => (
          <TabsContent key={domaine.id} value={domaine.id} className="space-y-6 mt-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={selMonth}
                  onChange={(e) => setSelMonth(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selYear}
                  onChange={(e) => setSelYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleExportPdf}
                  disabled={loadingDomain === domaine.id}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Exporter PDF
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={openSaisie}
                  disabled={loadingDomain === domaine.id}
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  Saisir les valeurs du mois
                </Button>
              </div>
            </div>

            {/* Loading */}
            {loadingDomain === domaine.id && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* Themes */}
            {loadingDomain !== domaine.id &&
              domaine.themes.map((theme) => (
                <div key={theme.id} className="space-y-4">
                  {/* Theme header */}
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      {theme.label}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {theme.indicateurs.map((ind) => (
                      <KpiCard
                        key={ind.label}
                        label={ind.label}
                        value={getValue(monthData, ind.label, selectedDateStr)}
                        prevValue={getValue(prevMonthData, ind.label, prevDateStr)}
                        unit={ind.unit}
                        actionCount={linkedCounts[`${domaine.id}:${ind.label}`] || 0}
                        onLinkClick={() => openLinkDialog(domaine.id, ind.label)}
                      />
                    ))}
                  </div>

                  {/* Charts grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {theme.indicateurs.map((ind) => {
                      const chartData = getChartData(ind.label, domData);
                      const hasData = chartData.some((d) => d.value !== null);
                      if (!hasData) return null;
                      return (
                        <div
                          key={ind.label}
                          className="rounded-lg border border-border/60 bg-card p-3"
                        >
                          <p className="text-[10px] font-medium text-muted-foreground mb-2 leading-tight">
                            {ind.label}
                            {ind.unit ? ` (${ind.unit})` : ""}
                          </p>
                          <ResponsiveContainer width="100%" height={110}>
                            <LineChart
                              data={chartData}
                              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                strokeOpacity={0.6}
                              />
                              <XAxis
                                dataKey="month"
                                tick={{ fontSize: 9 }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 9 }}
                                tickLine={false}
                                axisLine={false}
                                width={28}
                              />
                              <Tooltip
                                contentStyle={{
                                  fontSize: 11,
                                  borderRadius: 6,
                                  border: "1px solid hsl(var(--border))",
                                  background: "hsl(var(--card))",
                                  color: "hsl(var(--foreground))",
                                }}
                                formatter={(val: number | null) =>
                                  val !== null
                                    ? [`${val}${ind.unit || ""}`, ind.label]
                                    : ["—", ind.label]
                                }
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ r: 2.5, fill: "hsl(var(--primary))" }}
                                activeDot={{ r: 4 }}
                                connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>

                  {/* No chart data notice */}
                  {domData.length > 0 &&
                    theme.indicateurs.every(
                      (ind) =>
                        !getChartData(ind.label, domData).some(
                          (d) => d.value !== null
                        )
                    ) && (
                      <p className="text-xs text-muted-foreground italic">
                        Aucune donnée historique — saisissez les valeurs du mois
                        pour faire apparaître les graphiques.
                      </p>
                    )}
                </div>
              ))}

            {/* Initial empty state */}
            {loadingDomain !== domaine.id && domData.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  Aucune donnée pour ce domaine
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez sur "Saisir les valeurs du mois" pour commencer.
                </p>
              </div>
            )}
          </TabsContent>
        ))}

        {/* Tab Personnalisé */}
        {isAdmin && (
          <TabsContent value="personnalise" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Indicateurs personnalisés</h2>
                <p className="text-xs text-muted-foreground">Créés depuis les actions PACQ</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchCustomIndicateurs} disabled={loadingCustom}>
                {loadingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Actualiser"}
              </Button>
            </div>

            {loadingCustom && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!loadingCustom && customIndicateurs.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Aucun indicateur personnalisé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Créez des indicateurs depuis les actions PACQ (bouton "+ Créer" sur chaque action).
                </p>
              </div>
            )}

            {!loadingCustom && customIndicateurs.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customIndicateurs.map((ind) => (
                  <Card key={ind.id}>
                    <CardContent className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">{ind.label}</p>
                        <Button
                          variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setDeletingCustomInd(ind.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {ind.unite && <p className="text-xs text-muted-foreground">Unité : {ind.unite}</p>}
                      {ind.valeur_cible && <p className="text-xs text-muted-foreground">Cible : {ind.valeur_cible}</p>}
                      {ind.frequence && <p className="text-xs text-muted-foreground">Fréquence : {ind.frequence}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* AlertDialog — Supprimer indicateur personnalisé */}
      <AlertDialog open={!!deletingCustomInd} onOpenChange={v => { if (!v) setDeletingCustomInd(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'indicateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cet indicateur et toutes ses liaisons PACQ seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCustomIndicateur} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Liaisons PACQ */}
      <Dialog open={!!linkDialog?.open} onOpenChange={v => { if (!v) { setLinkDialog(null); setLinkSearch(""); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-primary" />
              Actions PACQ liées — {linkDialog?.label}
            </DialogTitle>
          </DialogHeader>
          {loadingLinkDialog ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (() => {
            // Actions liées (tous types confondus)
            const linkedOp = pacqActions.filter(a => linkedActions.some(r => r.action_id === a.id && r.action_type === 'operationnel'));
            const linkedSt = pacqStrategiqeActions.filter(a => linkedActions.some(r => r.action_id === a.id && r.action_type === 'strategique'));
            const hasLinked = linkedOp.length > 0 || linkedSt.length > 0;

            // Actions non liées, filtrées par recherche
            const q = linkSearch.toLowerCase();
            const unlinkedOp = pacqActions
              .filter(a => !linkedActions.some(r => r.action_id === a.id && r.action_type === 'operationnel'))
              .filter(a => !q || a.titre.toLowerCase().includes(q));
            const unlinkedSt = pacqStrategiqeActions
              .filter(a => !linkedActions.some(r => r.action_id === a.id && r.action_type === 'strategique'))
              .filter(a => !q || (a.intitule || '').toLowerCase().includes(q));

            return (
              <div className="flex flex-col gap-3 min-h-0">
                {/* Recherche */}
                <Input
                  placeholder="Rechercher une action..."
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  className="h-8 text-xs"
                />

                <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
                  {/* Actions liées */}
                  {hasLinked && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 px-1">
                        Actions liées ({linkedOp.length + linkedSt.length})
                      </p>
                      {linkedOp.map(action => (
                        <div key={action.id} className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-tight truncate">{action.titre}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Opérationnel · {action.statut} · {action.priorite}</p>
                          </div>
                          <button onClick={() => toggleLink(action.id, 'operationnel')} className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {linkedSt.map(action => (
                        <div key={action.id} className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-tight truncate">{action.intitule || '—'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Stratégique · {action.avancement || 'Non initié'} · {action.priorite || 'Normale'}</p>
                          </div>
                          <button onClick={() => toggleLink(action.id, 'strategique')} className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ajouter une liaison */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1">
                      Ajouter une liaison
                    </p>

                    {/* Opérationnel */}
                    {unlinkedOp.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground/60 px-1 italic">PACQ Opérationnel</p>
                        {unlinkedOp.map(action => (
                          <button
                            key={action.id}
                            onClick={() => toggleLink(action.id, 'operationnel')}
                            className="w-full text-left rounded-lg border border-border bg-background hover:border-primary/40 px-3 py-2 transition-all flex items-start justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium leading-tight truncate">{action.titre}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{action.statut} · {action.priorite}</p>
                            </div>
                            <span className="text-[10px] shrink-0 mt-0.5 font-medium text-muted-foreground">+ Lier</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Stratégique */}
                    {unlinkedSt.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground/60 px-1 italic">PACQ Stratégique</p>
                        {unlinkedSt.map(action => (
                          <button
                            key={action.id}
                            onClick={() => toggleLink(action.id, 'strategique')}
                            className="w-full text-left rounded-lg border border-border bg-background hover:border-primary/40 px-3 py-2 transition-all flex items-start justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium leading-tight truncate">{action.intitule || '—'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{action.avancement || 'Non initié'} · {action.priorite || 'Normale'}</p>
                            </div>
                            <span className="text-[10px] shrink-0 mt-0.5 font-medium text-muted-foreground">+ Lier</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {unlinkedOp.length === 0 && unlinkedSt.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        {q ? 'Aucune action ne correspond à la recherche.' : 'Toutes les actions disponibles sont déjà liées.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setLinkDialog(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saisie modal */}
      <Dialog open={saisieOpen} onOpenChange={setSaisieOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <PencilLine className="w-4 h-4 text-primary" />
              {activeDomaine?.label} —{" "}
              {format(new Date(selYear, selMonth - 1, 1), "MMMM yyyy", {
                locale: fr,
              })}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saisissez les valeurs pour chaque indicateur. Laissez vide si la
              donnée n'est pas disponible.
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {activeDomaine?.themes.map((theme) => (
                <div key={theme.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-0.5 w-3 rounded-full bg-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {theme.label}
                    </h3>
                  </div>
                  <div className="space-y-2 pl-2">
                    {theme.indicateurs.map((ind) => {
                      if (ind.calculated) {
                        // Show computed read-only
                        return (
                          <div
                            key={ind.label}
                            className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                          >
                            <Label className="text-xs text-muted-foreground flex-1 leading-tight">
                              {ind.label}{" "}
                              <span className="text-[9px] text-primary ml-1">
                                (calculé auto)
                              </span>
                            </Label>
                            <span className="text-sm font-bold text-primary w-20 text-right">
                              {locauxRatio !== null
                                ? `${locauxRatio}%`
                                : "—"}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={ind.label}
                          className="flex items-center gap-3"
                        >
                          <Label className="text-xs text-muted-foreground flex-1 leading-tight">
                            {ind.label}
                            {ind.unit && (
                              <span className="text-[9px] ml-1 text-muted-foreground/60">
                                ({ind.unit})
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            value={saisieValues[ind.label] ?? ""}
                            onChange={(e) =>
                              setSaisieValues((prev) => ({
                                ...prev,
                                [ind.label]: e.target.value,
                              }))
                            }
                            className="w-24 h-7 text-xs text-right shrink-0"
                            placeholder="—"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaisieOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndicateursPage;
