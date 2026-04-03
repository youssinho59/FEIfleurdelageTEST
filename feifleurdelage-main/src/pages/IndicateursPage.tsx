import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type DbDomaine = {
  slug: string;
  label: string;
  ordre: number;
  is_system: boolean;
  acces_roles: string[];
  created_by: string | null;
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


const CUSTOM_DOMAIN: DomaineDef = {
  id: "personnalise",
  label: "Personnalisé",
  tabLabel: "Personnalisé",
  themes: [
    {
      id: "indicateurs_personnalises",
      label: "Indicateurs personnalisés",
      indicateurs: [],
    },
  ],
};

const DOMAINES_META: DomaineDef[] = [...DOMAINES, CUSTOM_DOMAIN];

const SERVICE_OPTIONS = [
  "Administration",
  "Cuisine",
  "Technique",
  "Lingerie",
  "Animation",
  "Soins/Hôtellerie",
  "Entretien",
];

type DbIndicateur = {
  id: string;
  domaine: string;
  theme: string | null;
  label: string;
  unite: string | null;
  valeur_cible: string | null;
  frequence: string | null;
  service: string | null;
  created_at: string;
};

const DEFAULT_INDICATEURS: Omit<DbIndicateur, "id" | "created_at">[] = DOMAINES.flatMap((domaine) =>
  domaine.themes.flatMap((theme) =>
    theme.indicateurs.map((ind) => ({
      domaine: domaine.id,
      theme: theme.label,
      label: ind.label,
      unite: ind.unit || null,
      valeur_cible: null,
      frequence: null,
      service: null,
    }))
  )
);

const ManagedKpiCard = ({
  label,
  value,
  prevValue,
  unit,
  actionCount,
  onLinkClick,
  service,
  onDeleteClick,
  canDelete,
}: {
  label: string;
  value: number | null;
  prevValue: number | null;
  unit?: string | null;
  actionCount?: number;
  onLinkClick?: () => void;
  service?: string | null;
  onDeleteClick?: () => void;
  canDelete?: boolean;
}) => {
  return (
    <div className="relative">
      <KpiCard
        label={label}
        value={value}
        prevValue={prevValue}
        unit={unit || undefined}
        actionCount={actionCount}
        onLinkClick={onLinkClick}
      />
      {service && (
        <span className="absolute left-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">
          {service}
        </span>
      )}
      {canDelete && onDeleteClick && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

const ROLE_OPTIONS = [
  "admin", "animatrice", "ergothérapeute", "psychologue", "médecin",
  "hôtellerie", "IDE", "aide-soignant", "AS", "ASH",
];

const IndicateursPage = () => {
  const { isAdmin, userServices, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [dbDomaines, setDbDomaines] = useState<DbDomaine[]>([]);
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [addDomainForm, setAddDomainForm] = useState({ label: "", acces_roles: ["admin"] });
  const [addingDomain, setAddingDomain] = useState(false);
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<DbDomaine | null>(null);
  const [deletingDomain, setDeletingDomain] = useState(false);

  const fetchDomaines = useCallback(async () => {
    const { data, error } = await supabase
      .from("indicateurs_domaines")
      .select("*")
      .order("ordre", { ascending: true });
    if (!error && data) setDbDomaines(data as DbDomaine[]);
  }, []);

  useEffect(() => { fetchDomaines(); }, [fetchDomaines]);

  const visibleDomaines = useMemo((): DomaineDef[] => {
    if (dbDomaines.length === 0) return [];
    return dbDomaines
      .filter((d) => {
        if (isAdmin) return true;
        if (d.is_system) {
          const allowed = DOMAINE_ACCESS[d.slug] || [];
          if (allowed.length === 0) return false;
          return userServices.some((s) =>
            allowed.some((a) => a.toLowerCase() === s.toLowerCase())
          );
        } else {
          const allowed = d.acces_roles || [];
          if (allowed.length === 0 || (allowed.length === 1 && allowed[0] === "admin")) return false;
          return userServices.some((s) =>
            allowed.some((a) => a.toLowerCase() === s.toLowerCase())
          );
        }
      })
      .map((d) => {
        const systemDef = DOMAINES_META.find((sd) => sd.id === d.slug);
        if (systemDef) return systemDef;
        return { id: d.slug, label: d.label, tabLabel: d.label, themes: [] };
      });
  }, [dbDomaines, isAdmin, userServices]);

  const [activeTab, setActiveTab] = useState<string>("");
  const [allIndicateurs, setAllIndicateurs] = useState<DbIndicateur[]>([]);
  const [loadingIndicateurs, setLoadingIndicateurs] = useState(false);
  const [allData, setAllData] = useState<Record<string, ValeurRecord[]>>({});
  const [loadingDomain, setLoadingDomain] = useState<string | null>(null);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; domaine: string; label: string } | null>(null);
  const [pacqActions, setPacqActions] = useState<{ id: string; titre: string; statut: string; priorite: string }[]>([]);
  const [pacqStrategiqeActions, setPacqStrategiqeActions] = useState<{ id: string; intitule: string | null; avancement: string | null; priorite: string | null }[]>([]);
  const [linkedActions, setLinkedActions] = useState<{ id: string; action_id: string; action_type: string }[]>([]);
  const [loadingLinkDialog, setLoadingLinkDialog] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    domaine: "animation",
    theme: "",
    label: "",
    unite: "",
    valeur_cible: "",
    frequence: "",
    service: "",
  });
  const [savingCreate, setSavingCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DbIndicateur | null>(null);
  const [deletingIndicator, setDeletingIndicator] = useState(false);
  const [saisieOpen, setSaisieOpen] = useState(false);
  const [saisieValues, setSaisieValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(startOfMonth(now), 11 - i);
      return {
        date: format(d, "yyyy-MM-01"),
        label: format(d, "MMM yy", { locale: fr }),
      };
    });
  }, [now]);

  useEffect(() => {
    if (visibleDomaines.length > 0 && !activeTab) {
      const paramDomaine = searchParams.get("domaine");
      const availableIds = visibleDomaines.map((d) => d.id);
      if (paramDomaine && availableIds.includes(paramDomaine)) {
        setActiveTab(paramDomaine);
      } else {
        setActiveTab(visibleDomaines[0].id);
      }
    }
  }, [visibleDomaines, activeTab, searchParams]);

  const ensureDefaultIndicateurs = useCallback(async () => {
    const { count, error } = await supabase
      .from("indicateurs")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    if ((count ?? 0) === 0) {
      const { error: seedError } = await supabase.from("indicateurs").insert(DEFAULT_INDICATEURS);
      if (seedError) {
        throw seedError;
      }
    }
  }, []);

  const fetchIndicateurDefinitions = useCallback(async () => {
    setLoadingIndicateurs(true);
    try {
      await ensureDefaultIndicateurs();
      const { data, error } = await supabase
        .from("indicateurs")
        .select("*")
        .order("domaine", { ascending: true })
        .order("theme", { ascending: true })
        .order("label", { ascending: true });

      if (error) throw error;
      setAllIndicateurs((data as DbIndicateur[]) || []);
    } catch (error) {
      toast.error("Erreur indicateurs : " + ((error as Error).message || "inconnue"));
    } finally {
      setLoadingIndicateurs(false);
    }
  }, [ensureDefaultIndicateurs]);

  useEffect(() => {
    fetchIndicateurDefinitions();
  }, [fetchIndicateurDefinitions]);

  const getDefinitionsForDomain = useCallback(
    (domaineId: string) => allIndicateurs.filter((ind) => ind.domaine === domaineId),
    [allIndicateurs]
  );

  const buildThemesForDomain = useCallback(
    (domaineId: string) => {
      const defs = getDefinitionsForDomain(domaineId);
      const meta = DOMAINES_META.find((d) => d.id === domaineId);
      const defaultThemeLabels = (meta?.themes || []).map((theme) => theme.label);
      const grouped = new Map<string, DbIndicateur[]>();

      defs.forEach((ind) => {
        const themeLabel = ind.theme || (domaineId === "personnalise" ? "Indicateurs personnalisés" : "Autres");
        const arr = grouped.get(themeLabel) || [];
        arr.push(ind);
        grouped.set(themeLabel, arr);
      });

      const orderedLabels = [
        ...defaultThemeLabels.filter((label) => grouped.has(label)),
        ...Array.from(grouped.keys())
          .filter((label) => !defaultThemeLabels.includes(label))
          .sort((a, b) => a.localeCompare(b, "fr")),
      ];

      return orderedLabels.map((label) => ({
        id: label.toLowerCase().replace(/[^a-z0-9]+/gi, "_"),
        label,
        indicateurs: grouped.get(label) || [],
      }));
    },
    [getDefinitionsForDomain]
  );

  const fetchDomainData = useCallback(
    async (domaineId: string) => {
      if (!domaineId) return;
      setLoadingDomain(domaineId);
      try {
        const fromDate = format(subMonths(startOfMonth(now), 13), "yyyy-MM-dd");
        const { data, error } = await supabase
          .from("indicateurs_valeurs")
          .select("*")
          .eq("domaine", domaineId)
          .gte("date_mois", fromDate)
          .order("date_mois", { ascending: true });

        if (error) throw error;
        setAllData((prev) => ({ ...prev, [domaineId]: (data as ValeurRecord[]) || [] }));
      } catch (error) {
        toast.error("Erreur données : " + ((error as Error).message || "inconnue"));
      } finally {
        setLoadingDomain(null);
      }
    },
    [now]
  );

  useEffect(() => {
    if (activeTab && !(activeTab in allData)) {
      fetchDomainData(activeTab);
    }
  }, [activeTab, allData, fetchDomainData]);

  useEffect(() => {
    if (!activeTab) return;
    supabase
      .from("indicateurs_actions")
      .select("indicateur_label, indicateur_domaine")
      .eq("indicateur_domaine", activeTab)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((r: { indicateur_domaine: string; indicateur_label: string }) => {
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
      supabase.from("actions_correctives").select("id, titre, statut, priorite").order("created_at", { ascending: false }),
      supabase.from("pacq_strategique_actions").select("id, intitule, avancement, priorite").order("intitule", { ascending: true }),
      supabase.from("indicateurs_actions").select("id, action_id, action_type").eq("indicateur_domaine", domaine).eq("indicateur_label", label),
    ]);
    setPacqActions((actions || []) as { id: string; titre: string; statut: string; priorite: string }[]);
    setPacqStrategiqeActions((stratActions || []) as { id: string; intitule: string | null; avancement: string | null; priorite: string | null }[]);
    setLinkedActions((linked || []) as { id: string; action_id: string; action_type: string }[]);
    setLoadingLinkDialog(false);
  };

  const toggleLink = async (actionId: string, actionType: "operationnel" | "strategique" = "operationnel") => {
    if (!linkDialog) return;
    const key = `${linkDialog.domaine}:${linkDialog.label}`;
    const existing = linkedActions.find((r) => r.action_id === actionId && r.action_type === actionType);
    if (existing) {
      await supabase.from("indicateurs_actions").delete().eq("id", existing.id);
      setLinkedActions((prev) => prev.filter((r) => r.id !== existing.id));
      setLinkedCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 1) - 1) }));
    } else {
      const indicateur = allIndicateurs.find(
        (ind) => ind.domaine === linkDialog.domaine && ind.label === linkDialog.label
      );
      const { data } = await supabase
        .from("indicateurs_actions")
        .insert([
          {
            indicateur_id: indicateur?.id || null,
            indicateur_domaine: linkDialog.domaine,
            indicateur_label: linkDialog.label,
            action_id: actionId,
            action_type: actionType,
          },
        ])
        .select()
        .single();
      if (data) {
        setLinkedActions((prev) => [...prev, data as { id: string; action_id: string; action_type: string }]);
        setLinkedCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    }
  };

  const getDomainData = (id: string) => allData[id] || [];

  const getValue = (data: ValeurRecord[], indicateur: string, dateStr: string): number | null => {
    const rec = data.find((r) => r.indicateur === indicateur && r.date_mois === dateStr);
    return rec?.valeur ?? null;
  };

  const getChartData = (indicateur: string, data: ValeurRecord[]) =>
    last12Months.map((m) => ({
      month: m.label,
      value: getValue(data, indicateur, m.date),
    }));

  const getThemeOptionsForDomaine = useCallback(
    (domaineId: string) => {
      const defaults = (DOMAINES_META.find((d) => d.id === domaineId)?.themes || []).map((theme) => theme.label);
      const existing = Array.from(
        new Set(
          getDefinitionsForDomain(domaineId)
            .map((ind) => ind.theme)
            .filter(Boolean) as string[]
        )
      );
      const fallback = domaineId === "personnalise" ? ["Indicateurs personnalisés"] : [];
      return Array.from(new Set([...defaults, ...existing, ...fallback]));
    },
    [getDefinitionsForDomain]
  );

  const openCreateDialog = (domaineId?: string) => {
    const targetDomaine = domaineId || activeTab || visibleDomaines[0]?.id || "animation";
    const themeOptions = getThemeOptionsForDomaine(targetDomaine);
    setCreateForm({
      domaine: targetDomaine,
      theme: themeOptions[0] || (targetDomaine === "personnalise" ? "Indicateurs personnalisés" : ""),
      label: "",
      unite: "",
      valeur_cible: "",
      frequence: "",
      service: "",
    });
    setCreateDialogOpen(true);
  };

  const handleCreateIndicator = async () => {
    if (!createForm.label.trim()) {
      toast.error("Le libellé est obligatoire.");
      return;
    }

    setSavingCreate(true);
    try {
      const payload = {
        domaine: createForm.domaine,
        theme: createForm.theme.trim() || null,
        label: createForm.label.trim(),
        unite: createForm.unite.trim() || null,
        valeur_cible: createForm.valeur_cible.trim() || null,
        frequence: createForm.frequence.trim() || null,
        service: createForm.service || null,
      };

      const { error } = await supabase.from("indicateurs").insert(payload);
      if (error) throw error;

      toast.success("Indicateur créé");
      setCreateDialogOpen(false);
      if (activeTab !== payload.domaine) {
        setActiveTab(payload.domaine);
      }
      await fetchIndicateurDefinitions();
      setAllData((prev) => {
        const next = { ...prev };
        delete next[payload.domaine];
        return next;
      });
    } catch (error) {
      toast.error("Erreur : " + ((error as Error).message || "inconnue"));
    } finally {
      setSavingCreate(false);
    }
  };

  const handleDeleteIndicator = async () => {
    if (!deleteTarget) return;
    setDeletingIndicator(true);
    try {
      await supabase.from("indicateurs_actions").delete().eq("indicateur_id", deleteTarget.id);
      await supabase
        .from("indicateurs_actions")
        .delete()
        .eq("indicateur_domaine", deleteTarget.domaine)
        .eq("indicateur_label", deleteTarget.label);
      await supabase
        .from("indicateurs_valeurs")
        .delete()
        .eq("domaine", deleteTarget.domaine)
        .eq("indicateur", deleteTarget.label);
      const { error } = await supabase.from("indicateurs").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      toast.success("Indicateur supprimé");
      setDeleteTarget(null);
      await fetchIndicateurDefinitions();
      setAllData((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.domaine];
        return next;
      });
    } catch (error) {
      toast.error("Erreur : " + ((error as Error).message || "inconnue"));
    } finally {
      setDeletingIndicator(false);
    }
  };

  const activeDefinitions = useMemo(() => getDefinitionsForDomain(activeTab), [activeTab, getDefinitionsForDomain]);
  const activeThemes = useMemo(() => buildThemesForDomain(activeTab), [activeTab, buildThemesForDomain]);
  const activeDomaine = useMemo(() => visibleDomaines.find((d) => d.id === activeTab) || null, [activeTab, visibleDomaines]);

  const handleAddDomain = async () => {
    if (!addDomainForm.label.trim()) return;
    setAddingDomain(true);
    try {
      const slug = addDomainForm.label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      const maxOrdre = dbDomaines.reduce((m, d) => Math.max(m, d.ordre), 0);
      const { error } = await supabase.from("indicateurs_domaines").insert({
        slug,
        label: addDomainForm.label.trim(),
        ordre: maxOrdre + 1,
        is_system: false,
        acces_roles: addDomainForm.acces_roles,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success(`Domaine "${addDomainForm.label.trim()}" créé`);
      setAddDomainOpen(false);
      setAddDomainForm({ label: "", acces_roles: ["admin"] });
      await fetchDomaines();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || String(error);
      toast.error("Erreur création domaine : " + msg);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deleteDomainTarget) return;
    setDeletingDomain(true);
    try {
      const { error } = await supabase
        .from("indicateurs_domaines")
        .delete()
        .eq("slug", deleteDomainTarget.slug);
      if (error) throw error;
      toast.success(`Domaine "${deleteDomainTarget.label}" supprimé`);
      setDeleteDomainTarget(null);
      if (activeTab === deleteDomainTarget.slug) setActiveTab("");
      await fetchDomaines();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || String(error);
      toast.error("Erreur suppression domaine : " + msg);
    } finally {
      setDeletingDomain(false);
    }
  };

  const openSaisie = useCallback(() => {
    if (!activeTab || activeDefinitions.length === 0) return;
    const monthData = getDomainData(activeTab).filter((r) => r.date_mois === selectedDateStr);
    const initial: Record<string, string> = {};
    activeDefinitions.forEach((ind) => {
      const existing = monthData.find((r) => r.indicateur === ind.label);
      initial[ind.label] =
        existing?.valeur !== null && existing?.valeur !== undefined ? String(existing.valeur) : "";
    });
    setSaisieValues(initial);
    setSaisieOpen(true);
  }, [activeDefinitions, activeTab, allData, selectedDateStr]);

  const locauxRatio = useMemo(() => {
    if (activeTab !== "locaux") return null;
    const prevus = parseFloat(saisieValues["Nombre d'entretiens complets de chambres prévus sur le mois"] || "0");
    const effectues = parseFloat(
      saisieValues["Nombre d'entretiens complets de chambres réellement effectués"] || "0"
    );
    if (!prevus || Number.isNaN(prevus) || Number.isNaN(effectues)) return null;
    return Math.round((effectues / prevus) * 100);
  }, [activeTab, saisieValues]);

  const handleSave = async () => {
    if (!activeTab || activeDefinitions.length === 0) return;
    setSaving(true);

    const rows: {
      domaine: string;
      theme: string | null;
      indicateur: string;
      date_mois: string;
      valeur: number | null;
    }[] = activeDefinitions.map((ind) => ({
      domaine: activeTab,
      theme: ind.theme || null,
      indicateur: ind.label,
      date_mois: selectedDateStr,
      valeur: saisieValues[ind.label] === "" ? null : parseFloat(saisieValues[ind.label].replace(",", ".")),
    }));

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
      setAllData((prev) => {
        const next = { ...prev };
        delete next[activeTab];
        return next;
      });
    }
    setSaving(false);
  };

  const handleExportPdf = useCallback(() => {
    if (!activeDomaine || activeThemes.length === 0) return;
    const domData = getDomainData(activeTab);
    const monthData = domData.filter((r) => r.date_mois === selectedDateStr);
    const prevData = domData.filter((r) => r.date_mois === prevDateStr);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const monthLabel = format(new Date(selYear, selMonth - 1, 1), "MMMM yyyy", { locale: fr });

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
    activeThemes.forEach((theme) => {
      if (y > 255) {
        doc.addPage();
        y = 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(45, 45, 45);
      doc.text(theme.label, 14, y);
      y += 6;

      theme.indicateurs.forEach((ind) => {
        if (y > 282) {
          doc.addPage();
          y = 18;
        }

        const val = monthData.find((r) => r.indicateur === ind.label)?.valeur;
        const prev = prevData.find((r) => r.indicateur === ind.label)?.valeur;
        const diff = val !== null && val !== undefined && prev !== null && prev !== undefined ? val - prev : null;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(ind.label, 18, y);
        const rightValue = val !== null && val !== undefined ? `${val}${ind.unite || ""}` : "—";
        doc.text(rightValue, 185, y, { align: "right" });

        if (diff !== null) {
          doc.setFontSize(8);
          doc.setTextColor(diff > 0 ? 20 : diff < 0 ? 180 : 120, diff > 0 ? 130 : diff < 0 ? 50 : 120, diff > 0 ? 80 : diff < 0 ? 60 : 120);
          doc.text(`Écart M-1 : ${diff > 0 ? "+" : ""}${diff}`, 185, y + 4, { align: "right" });
          doc.setTextColor(45, 45, 45);
        }

        y += 8;
      });

      y += 4;
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Document généré le ${format(new Date(), "dd/MM/yyyy", { locale: fr })} — EHPAD La Fleur de l'Âge`,
      105,
      290,
      { align: "center" }
    );

    doc.save(`Indicateurs_${activeDomaine.id}_${format(new Date(selYear, selMonth - 1, 1), "yyyy-MM")}.pdf`);
  }, [activeDomaine, activeThemes, activeTab, allData, selectedDateStr, prevDateStr, selYear, selMonth]);

  if (visibleDomaines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Vous n'avez pas accès à ce module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">Tableau de Bord — Indicateurs</h1>
        </div>
        <p className="text-sm text-muted-foreground">Suivi mensuel des indicateurs qualité par domaine</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          {visibleDomaines.map((d) => {
            const dbDom = dbDomaines.find((db) => db.slug === d.id);
            const isCustom = dbDom ? !dbDom.is_system : false;
            return (
              <TabsTrigger key={d.id} value={d.id} className="text-xs relative pr-5">
                {d.tabLabel}
                {isCustom && isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteDomainTarget(dbDom!); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </TabsTrigger>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => setAddDomainOpen(true)}
              className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Ajouter un domaine"
            >
              <span className="text-base leading-none">+</span>
            </button>
          )}
        </TabsList>

        {visibleDomaines.map((domaine) => {
          const domainData = getDomainData(domaine.id);
          const monthData = domainData.filter((r) => r.date_mois === selectedDateStr);
          const prevMonthData = domainData.filter((r) => r.date_mois === prevDateStr);
          const definitions = getDefinitionsForDomain(domaine.id);
          const themes = buildThemesForDomain(domaine.id);
          const isLoading = loadingDomain === domaine.id || loadingIndicateurs;
          const dbDom = dbDomaines.find((db) => db.slug === domaine.id);
          const isCustomDomain = dbDom ? !dbDom.is_system : false;

          return (
            <TabsContent key={domaine.id} value={domaine.id} className="space-y-6 mt-4">
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

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {(isAdmin || isCustomDomain) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => openCreateDialog(domaine.id)}
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                      Ajouter un indicateur
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleExportPdf}
                    disabled={isLoading || definitions.length === 0}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Exporter PDF
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={openSaisie}
                    disabled={isLoading || definitions.length === 0 || activeTab !== domaine.id}
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    Saisir les valeurs du mois
                  </Button>
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!isLoading && definitions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Aucun indicateur dans cet onglet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAdmin ? 'Ajoutez un indicateur pour commencer.' : 'Aucun indicateur n\'est encore configuré.'}
                  </p>
                </div>
              )}

              {!isLoading && definitions.length > 0 && themes.map((theme) => (
                <div key={theme.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold text-foreground">{theme.label}</h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {theme.indicateurs.map((ind) => (
                      <ManagedKpiCard
                        key={ind.id}
                        label={ind.label}
                        value={getValue(monthData, ind.label, selectedDateStr)}
                        prevValue={getValue(prevMonthData, ind.label, prevDateStr)}
                        unit={ind.unite}
                        actionCount={linkedCounts[`${domaine.id}:${ind.label}`] || 0}
                        onLinkClick={() => openLinkDialog(domaine.id, ind.label)}
                        service={ind.service}
                        canDelete={isAdmin}
                        onDeleteClick={() => setDeleteTarget(ind)}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {theme.indicateurs.map((ind) => {
                      const chartData = getChartData(ind.label, domainData);
                      const hasData = chartData.some((d) => d.value !== null);
                      if (!hasData) return null;
                      return (
                        <div key={ind.id} className="rounded-lg border border-border/60 bg-card p-3">
                          <p className="text-[10px] font-medium text-muted-foreground mb-2 leading-tight">
                            {ind.label}
                            {ind.unite ? ` (${ind.unite})` : ""}
                          </p>
                          <ResponsiveContainer width="100%" height={110}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} />
                              <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
                              <Tooltip
                                contentStyle={{
                                  fontSize: 11,
                                  borderRadius: 6,
                                  border: "1px solid hsl(var(--border))",
                                  background: "hsl(var(--card))",
                                  color: "hsl(var(--foreground))",
                                }}
                                formatter={(val: number | null) =>
                                  val !== null ? [`${val}${ind.unite || ""}`, ind.label] : ["—", ind.label]
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

                  {domainData.length > 0 &&
                    theme.indicateurs.every((ind) => !getChartData(ind.label, domainData).some((d) => d.value !== null)) && (
                      <p className="text-xs text-muted-foreground italic">
                        Aucune donnée historique — saisissez les valeurs du mois pour faire apparaître les graphiques.
                      </p>
                    )}
                </div>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'indicateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.label}</strong> sera définitivement supprimé, ainsi que ses valeurs mensuelles et ses liaisons PACQ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIndicator}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deletingIndicator}
            >
              {deletingIndicator ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un indicateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Onglet / domaine</Label>
              <Select
                value={createForm.domaine}
                onValueChange={(value) => {
                  const nextThemes = getThemeOptionsForDomaine(value);
                  setCreateForm((prev) => ({
                    ...prev,
                    domaine: value,
                    theme: nextThemes[0] || (value === "personnalise" ? "Indicateurs personnalisés" : ""),
                  }));
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choisir un onglet" />
                </SelectTrigger>
                <SelectContent>
                  {visibleDomaines.map((domaine) => (
                    <SelectItem key={domaine.id} value={domaine.id} className="text-xs">
                      {domaine.tabLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Thème / catégorie</Label>
              <Select value={createForm.theme} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, theme: value }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choisir un thème" />
                </SelectTrigger>
                <SelectContent>
                  {getThemeOptionsForDomaine(createForm.domaine).map((theme) => (
                    <SelectItem key={theme} value={theme} className="text-xs">
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Libellé *</Label>
              <Input
                className="h-9 text-xs"
                placeholder="Ex. Taux de réunions éthiques tenues"
                value={createForm.label}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Unité</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Ex. %"
                  value={createForm.unite}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, unite: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valeur cible</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Ex. 12"
                  value={createForm.valeur_cible}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, valeur_cible: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fréquence</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Ex. Mensuelle"
                  value={createForm.frequence}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, frequence: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service interne</Label>
                <Select
                  value={createForm.service || "aucun"}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, service: value === "aucun" ? "" : value }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun" className="text-xs">Aucun</SelectItem>
                    {SERVICE_OPTIONS.map((service) => (
                      <SelectItem key={service} value={service} className="text-xs">
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateIndicator} disabled={savingCreate || !createForm.label.trim()}>
              {savingCreate ? "Enregistrement..." : "Créer l'indicateur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkDialog?.open} onOpenChange={(v) => { if (!v) { setLinkDialog(null); setLinkSearch(""); } }}>
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
            const linkedOp = pacqActions.filter((a) => linkedActions.some((r) => r.action_id === a.id && r.action_type === "operationnel"));
            const linkedSt = pacqStrategiqeActions.filter((a) => linkedActions.some((r) => r.action_id === a.id && r.action_type === "strategique"));
            const hasLinked = linkedOp.length > 0 || linkedSt.length > 0;
            const q = linkSearch.toLowerCase();
            const unlinkedOp = pacqActions
              .filter((a) => !linkedActions.some((r) => r.action_id === a.id && r.action_type === "operationnel"))
              .filter((a) => !q || a.titre.toLowerCase().includes(q));
            const unlinkedSt = pacqStrategiqeActions
              .filter((a) => !linkedActions.some((r) => r.action_id === a.id && r.action_type === "strategique"))
              .filter((a) => !q || (a.intitule || "").toLowerCase().includes(q));

            return (
              <>
                <Input
                  placeholder="Rechercher une action..."
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  className="text-xs"
                />
                <ScrollArea className="mt-3 h-[55vh] pr-3">
                  <div className="space-y-4">
                    {hasLinked && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Déjà liées</p>
                        {[...linkedOp.map((a) => ({ id: a.id, title: a.titre, type: "operationnel" as const })), ...linkedSt.map((a) => ({ id: a.id, title: a.intitule || "Action stratégique", type: "strategique" as const }))].map((action) => (
                          <div key={`${action.type}-${action.id}`} className="flex items-center justify-between rounded-lg border p-2">
                            <p className="text-xs font-medium">{action.title}</p>
                            <Button variant="ghost" size="sm" onClick={() => toggleLink(action.id, action.type)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PACQ opérationnel</p>
                      {unlinkedOp.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucune action disponible.</p>
                      ) : unlinkedOp.map((action) => (
                        <div key={action.id} className="flex items-center justify-between rounded-lg border p-2">
                          <div>
                            <p className="text-xs font-medium">{action.titre}</p>
                            <p className="text-[10px] text-muted-foreground">{action.priorite} · {action.statut}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => toggleLink(action.id, "operationnel")}>
                            Lier
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PACQ stratégique</p>
                      {unlinkedSt.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucune action disponible.</p>
                      ) : unlinkedSt.map((action) => (
                        <div key={action.id} className="flex items-center justify-between rounded-lg border p-2">
                          <div>
                            <p className="text-xs font-medium">{action.intitule || "Action stratégique"}</p>
                            <p className="text-[10px] text-muted-foreground">{action.priorite || "—"} · {action.avancement || "—"}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => toggleLink(action.id, "strategique")}>
                            Lier
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog création domaine personnalisé */}
      <Dialog open={addDomainOpen} onOpenChange={(v) => { if (!v) { setAddDomainOpen(false); setAddDomainForm({ label: "", acces_roles: ["admin"] }); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau domaine</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du domaine *</Label>
              <Input
                className="h-9 text-xs"
                placeholder="Ex. Kinésithérapie"
                value={addDomainForm.label}
                onChange={(e) => setAddDomainForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accès (rôles/services)</Label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((role) => {
                  const checked = addDomainForm.acces_roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        setAddDomainForm((p) => ({
                          ...p,
                          acces_roles: checked
                            ? p.acces_roles.filter((r) => r !== role)
                            : [...p.acces_roles, role],
                        }))
                      }
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddDomain} disabled={addingDomain || !addDomainForm.label.trim()}>
              {addingDomain ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog suppression domaine personnalisé */}
      <AlertDialog open={!!deleteDomainTarget} onOpenChange={(v) => { if (!v) setDeleteDomainTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le domaine {deleteDomainTarget?.label} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les indicateurs saisis seront conservés en base. Seul l'onglet sera supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDomain}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDomain}
              disabled={deletingDomain}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingDomain ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saisieOpen} onOpenChange={setSaisieOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Saisir les valeurs du mois</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-5 pb-2">
              {activeThemes.map((theme) => (
                <div key={theme.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold">{theme.label}</h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {theme.indicateurs.map((ind) => {
                      const isCalculated = activeTab === "locaux" && ind.label === "Ratio prévu/effectués (%)";
                      return (
                        <div key={ind.id} className="space-y-1.5 rounded-lg border p-3">
                          <Label className="text-xs leading-snug">{ind.label}</Label>
                          <Input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            disabled={isCalculated}
                            value={isCalculated ? (locauxRatio ?? "") : (saisieValues[ind.label] || "")}
                            onChange={(e) => setSaisieValues((prev) => ({ ...prev, [ind.label]: e.target.value }))}
                            placeholder={ind.unite ? `Valeur (${ind.unite})` : "Valeur"}
                          />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{ind.unite ? `Unité : ${ind.unite}` : "Sans unité"}</span>
                            {ind.valeur_cible && <span>Cible : {ind.valeur_cible}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSaisieOpen(false)} disabled={saving}>
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
