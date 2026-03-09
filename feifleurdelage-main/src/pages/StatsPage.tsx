import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, FileText, AlertTriangle, Users, CheckCircle, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { generateStatsPdf } from "@/lib/pdfGenerator";
import { toast } from "sonner";

const COLORS = ["#c46b48", "#d4956e", "#e8b896", "#a85636", "#c98b6e", "#8b5e3c", "#d4a574"];

const StatsPage = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [feiData, setFeiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fei")
      .select("*")
      .gte("date_evenement", dateFrom)
      .lte("date_evenement", dateTo)
      .order("date_evenement", { ascending: true });
    setFeiData(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setDateFrom(`${year}-01-01`);
    setDateTo(`${year}-12-31`);
  }, [year]);

  // Stats computations
  const byType: Record<string, number> = {};
  const byDeclarant: Record<string, number> = {};
  let totalGravite = 0;
  let withActions = 0;

  feiData.forEach((f) => {
    byType[f.type_fei] = (byType[f.type_fei] || 0) + 1;
    byDeclarant[f.declarant_nom] = (byDeclarant[f.declarant_nom] || 0) + 1;
    totalGravite += f.gravite;
    if (f.actions_correctives) withActions++;
  });

  const typeChartData = Object.entries(byType).map(([name, value]) => ({ name, value }));
  const declarantChartData = Object.entries(byDeclarant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const avgGravite = feiData.length > 0 ? (totalGravite / feiData.length).toFixed(1) : "—";

  const handleExportPdf = () => {
    if (feiData.length === 0) {
      toast.error("Aucune donnée à exporter pour cette période");
      return;
    }
    const pdf = generateStatsPdf(feiData, dateFrom, dateTo);
    pdf.save(`Rapport_FEI_${dateFrom}_${dateTo}.pdf`);
    toast.success("Rapport PDF généré !");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Statistiques FEI</h1>
          <p className="text-muted-foreground">Analyses et rapports sur les événements indésirables</p>
        </div>
        <div className="flex gap-2">
          <Link to="/gestion-fei">
            <Button variant="outline" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Gérer les FEI
            </Button>
          </Link>
          <Button onClick={handleExportPdf} className="gap-2">
            <Download className="w-4 h-4" />
            Exporter en PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Année rapide</Label>
              <div className="flex gap-2">
                {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
                  <Button
                    key={y}
                    variant={year === y ? "default" : "outline"}
                    size="sm"
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Du</Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Au</Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total FEI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{feiData.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gravité moyenne</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="text-2xl font-bold">{avgGravite}/5</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Déclarants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-2xl font-bold">{Object.keys(byDeclarant).length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avec actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">
                {feiData.length > 0 ? `${Math.round((withActions / feiData.length) * 100)}%` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {feiData.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Répartition par type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {typeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Par déclarant</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={declarantChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(16, 55%, 52%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{loading ? "Chargement..." : "Aucune FEI pour cette période"}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions list */}
      {feiData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Récapitulatif des actions correctives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feiData
                .filter((f) => f.actions_correctives)
                .map((f) => (
                  <div key={f.id} className="p-3 rounded-lg bg-secondary">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span className="font-medium">{f.type_fei}</span>
                      <span>{new Date(f.date_evenement).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="text-sm">{f.actions_correctives}</p>
                  </div>
                ))}
              {feiData.filter((f) => f.actions_correctives).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune action corrective enregistrée</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsPage;
