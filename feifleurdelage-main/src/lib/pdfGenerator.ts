import jsPDF from "jspdf";
import {
  pdfPage, pdfHeader as _ph, pdfFooter as _pf, pdfKpis, pdfSectionTitle,
  pdfTable, pdfBadge, pdfTextBlock, pdfSectionHeader, pdfProgressBar,
  captureHtmlString, buildAndSavePdf, chunkArr, fmtDate, esc,
} from "./pdfExportUtils";

const TERRACOTTA: [number, number, number] = [196, 107, 72];
const DARK: [number, number, number] = [41, 37, 33];
const LIGHT_BG: [number, number, number] = [250, 247, 243];
const SECTION_BG: [number, number, number] = [245, 240, 235];
const BORDER: [number, number, number] = [220, 210, 200];
const MUTED: [number, number, number] = [140, 130, 120];

function addHeader(doc: jsPDF, title: string) {
  // Gradient-like header band
  doc.setFillColor(...TERRACOTTA);
  doc.roundedRect(0, 0, 210, 40, 0, 0, "F");

  // Subtle accent strip
  doc.setFillColor(220, 140, 100);
  doc.rect(0, 36, 210, 4, "F");

  // Logo area circle
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 20, 10, "F");
  doc.setTextColor(...TERRACOTTA);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FÂ", 21, 23);

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EHPAD La Fleur de l'Âge", 42, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 42, 23);
  doc.setFontSize(7.5);
  doc.setTextColor(255, 220, 200);
  doc.text("Tél : 03 20 94 09 28  ·  courrier@ehpad-lafleurdelage.fr  ·  20 bis Allée des Sports — 59960 Neuville-en-Ferrain", 42, 31);

  doc.setTextColor(...DARK);
}

function addSectionBox(
  doc: jsPDF,
  label: string,
  fields: { key: string; value: string }[],
  y: number,
  accentColor: [number, number, number] = TERRACOTTA
): number {
  const startY = y;
  const boxX = 12;
  const boxW = 186;
  const padX = 8;
  const padY = 6;

  // Calculate height
  let contentHeight = 10; // header
  fields.forEach((f) => {
    const lines = doc.splitTextToSize(f.value || "Non renseigné", boxW - padX * 2 - 2);
    contentHeight += 5 + lines.length * 4.5 + 3;
  });
  contentHeight += 2;

  // Section background
  doc.setFillColor(...SECTION_BG);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(boxX, startY, boxW, contentHeight, 3, 3, "FD");

  // Accent left bar
  doc.setFillColor(...accentColor);
  doc.roundedRect(boxX, startY, 4, contentHeight, 3, 0, "F");
  doc.rect(boxX + 2, startY, 2, contentHeight, "F");

  // Section title
  let cy = startY + padY + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text(label.toUpperCase(), boxX + padX + 4, cy);
  cy += 2;

  // Divider line
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(boxX + padX + 4, cy, boxX + boxW - padX, cy);
  cy += 4;

  // Fields
  doc.setTextColor(...DARK);
  fields.forEach((f) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(f.key, boxX + padX + 4, cy);
    cy += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(f.value || "Non renseigné", boxW - padX * 2 - 6);
    doc.text(lines, boxX + padX + 4, cy);
    cy += lines.length * 4.5 + 2;
  });

  return startY + contentHeight + 6;
}

function addFooter(doc: jsPDF) {
  // Footer band
  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 278, 210, 20, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(15, 279, 195, 279);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Document confidentiel — EHPAD La Fleur de l'Âge — Système Qualité", 105, 285, { align: "center" });
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, 105, 289, { align: "center" });
}

function addRefBadge(doc: jsPDF, id: string, y: number): number {
  // Reference badge
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(12, y, 60, 8, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.text(`Réf: ${id.slice(0, 8).toUpperCase()}`, 16, y + 5.5);

  return y + 14;
}

export function generateFeiPdf(data: {
  id: string;
  date_evenement: string;
  lieu: string;
  description: string;
  gravite: number;
  type_fei: string;
  actions_correctives: string | null;
  declarant_nom: string;
  created_at: string;
  // Catégorie
  categorie_fei?: string;
  // ARS (FEIGS)
  nature_evenement_ars?: string | null;
  circonstances_ars?: string | null;
  consequences_resident_ars?: string | null;
  mesures_prises_ars?: string | null;
  statut_ars?: string | null;
  date_envoi_ars?: string | null;
  // Traitement admin (optionnel — complet si fourni)
  statut?: string;
  analyse?: string | null;
  plan_action?: string | null;
  retour_declarant?: string | null;
  retour_traitement?: string | null;
  date_retour_traitement?: string | null;
  retour_cloture?: string | null;
  date_retour_cloture?: string | null;
  date_cloture?: string | null;
  managed_at?: string | null;
  gestionnaire_nom?: string;
}) {
  const categorie = data.categorie_fei || "standard";
  const docTitle = categorie === "feigs"
    ? "Fiche d'Événement Indésirable Grave et Significatif (FEIGS)"
    : categorie === "feig"
    ? "Fiche d'Événement Indésirable Grave (FEIG)"
    : "Fiche d'Événement Indésirable (FEI)";
  const catLabel = categorie === "feigs"
    ? "FEIGS — Événement Indésirable Grave et Sanitaire"
    : categorie === "feig"
    ? "FEIG — Événement Indésirable Grave"
    : "FEI Standard";

  const hasAdminContent = !!(data.analyse || data.plan_action || data.retour_declarant || data.retour_traitement || data.retour_cloture || data.date_cloture);

  const doc = new jsPDF();
  addHeader(doc, docTitle);

  let y = 48;
  y = addRefBadge(doc, data.id, y);

  // Section: Identification
  y = addSectionBox(doc, "Identification", [
    { key: "Catégorie", value: catLabel },
    { key: "Date de l'événement", value: new Date(data.date_evenement).toLocaleDateString("fr-FR") },
    { key: "Type d'événement", value: data.type_fei },
    { key: "Déclarant", value: data.declarant_nom },
  ], y, TERRACOTTA);

  // Section: Localisation & Gravité
  const graviteLabel = `${data.gravite}/5${data.gravite >= 4 ? " ⚠ CRITIQUE" : data.gravite >= 3 ? " ⚠ Modérée" : ""}`;
  y = addSectionBox(doc, "Localisation & Gravité", [
    { key: "Lieu", value: data.lieu },
    { key: "Niveau de gravité", value: graviteLabel },
  ], y, [180, 90, 60]);

  // Section: Description
  y = addSectionBox(doc, "Description de l'événement", [
    { key: "Détail", value: data.description },
  ], y, [100, 100, 120]);

  // Section: Actions correctives (agent)
  y = addSectionBox(doc, "Actions correctives (déclarant)", [
    { key: "Mesures prises", value: data.actions_correctives || "Aucune action corrective renseignée" },
  ], y, [80, 140, 100]);

  // ── Page 2 : Traitement administratif (si disponible) ──
  if (hasAdminContent) {
    addFooter(doc);
    doc.addPage();
    addHeader(doc, "Traitement administratif — FEI");
    let adminY = 48;
    adminY = addRefBadge(doc, data.id, adminY);

    const ADMIN_BLUE: [number, number, number] = [37, 99, 235];
    const statuts: Record<string, string> = {
      nouveau: "Nouveau", en_cours_analyse: "En cours d'analyse",
      actions_en_cours: "Actions en cours", cloture: "Clôturé", archive: "Archivé",
    };

    adminY = addSectionBox(doc, "Synthèse du traitement", [
      { key: "Statut", value: statuts[data.statut || ""] || (data.statut || "—") },
      { key: "Gestionnaire", value: data.gestionnaire_nom || "—" },
      { key: "Traité le", value: data.managed_at ? new Date(data.managed_at).toLocaleDateString("fr-FR") : "—" },
      { key: "Date de clôture", value: data.date_cloture ? new Date(data.date_cloture).toLocaleDateString("fr-FR") : "Non clôturée" },
    ], adminY, ADMIN_BLUE);

    if (data.analyse) {
      adminY = addSectionBox(doc, "Analyse de l'événement", [
        { key: "Analyse", value: data.analyse },
      ], adminY, [100, 60, 180]);
    }
    if (data.plan_action) {
      adminY = addSectionBox(doc, "Plan d'action", [
        { key: "Actions planifiées", value: data.plan_action },
      ], adminY, [180, 140, 40]);
    }
    if (data.retour_traitement) {
      const labelTraitement = data.date_retour_traitement
        ? `Retour au traitement — ${new Date(data.date_retour_traitement).toLocaleDateString("fr-FR")}`
        : "Retour au traitement";
      adminY = addSectionBox(doc, labelTraitement, [
        { key: "Message", value: data.retour_traitement },
      ], adminY, [30, 140, 80]);
    } else if (data.retour_declarant) {
      adminY = addSectionBox(doc, "Retour au déclarant", [
        { key: "Message", value: data.retour_declarant },
      ], adminY, [30, 140, 80]);
    }
    if (data.retour_cloture) {
      const labelCloture = data.date_retour_cloture
        ? `Retour à la clôture — ${new Date(data.date_retour_cloture).toLocaleDateString("fr-FR")}`
        : "Retour à la clôture";
      adminY = addSectionBox(doc, labelCloture, [
        { key: "Message", value: data.retour_cloture },
      ], adminY, [20, 100, 60]);
    }

    addFooter(doc);
  }

  // ── Page ARS : Déclaration ARS (FEIGS ou FEIG) ──
  if (categorie === "feigs" || categorie === "feig") {
    if (!hasAdminContent) addFooter(doc);
    const ARS_RED: [number, number, number] = [185, 28, 28];
    const arsStatutLabel = data.statut_ars === "declare"
      ? `Déclaré à l'ARS${data.date_envoi_ars ? ` le ${new Date(data.date_envoi_ars).toLocaleDateString("fr-FR")}` : ""}`
      : "À déclarer à l'ARS";

    doc.addPage();
    addHeader(doc, "Déclaration ARS — Informations réglementaires");
    let arsY = 48;
    arsY = addRefBadge(doc, data.id, arsY);

    addSectionBox(doc, categorie === "feigs" ? "Déclaration ARS — FEIGS" : "Déclaration ARS — FEIG", [
      { key: "Statut de la déclaration", value: arsStatutLabel },
      { key: "Nature de l'événement", value: data.nature_evenement_ars || "Non renseigné" },
      { key: "Circonstances", value: data.circonstances_ars || "Non renseigné" },
      { key: "Conséquences pour le résident", value: data.consequences_resident_ars || "Non renseigné" },
      { key: "Mesures prises", value: data.mesures_prises_ars || "Non renseigné" },
    ], arsY, ARS_RED);

    addFooter(doc);
  } else if (!hasAdminContent) {
    addFooter(doc);
  }

  return doc;
}

export function generatePlaintePdf(data: {
  id: string;
  date_plainte: string;
  demandeur: string;
  objet: string;
  description: string;
  reponse_apportee: string | null;
  declarant_nom: string;
  created_at: string;
  // Traitement admin (optionnel)
  statut?: string;
  analyse?: string | null;
  plan_action?: string | null;
  actions_correctives?: string | null;
  retour_declarant?: string | null;
  retour_traitement?: string | null;
  date_retour_traitement?: string | null;
  retour_cloture?: string | null;
  date_retour_cloture?: string | null;
  date_cloture?: string | null;
  managed_at?: string | null;
  gestionnaire_nom?: string;
}) {
  const hasAdminContent = !!(data.analyse || data.plan_action || data.actions_correctives || data.retour_declarant || data.retour_traitement || data.retour_cloture || data.date_cloture);

  const doc = new jsPDF();
  addHeader(doc, "Fiche Plainte / Réclamation");

  let y = 48;
  y = addRefBadge(doc, data.id, y);

  y = addSectionBox(doc, "Identification", [
    { key: "Date", value: new Date(data.date_plainte).toLocaleDateString("fr-FR") },
    { key: "Demandeur", value: data.demandeur },
    { key: "Déclarant", value: data.declarant_nom },
  ], y, TERRACOTTA);

  y = addSectionBox(doc, "Objet de la plainte", [
    { key: "Objet", value: data.objet },
  ], y, [180, 90, 60]);

  y = addSectionBox(doc, "Réponse initiale (déclarant)", [
    { key: "Réponse / Mesures immédiates", value: data.reponse_apportee || "Aucune réponse initiale renseignée" },
  ], y, [80, 140, 100]);

  y = addSectionBox(doc, "Description détaillée", [
    { key: "Détail", value: data.description },
  ], y, [100, 100, 120]);

  // ── Page 2 : Traitement administratif (si disponible) ──
  if (hasAdminContent) {
    addFooter(doc);
    doc.addPage();
    addHeader(doc, "Traitement administratif — Réclamation");
    let adminY = 48;
    adminY = addRefBadge(doc, data.id, adminY);

    const ADMIN_BLUE: [number, number, number] = [37, 99, 235];
    const statuts: Record<string, string> = {
      nouveau: "Nouveau", en_cours: "En cours", traite: "Traité",
    };

    adminY = addSectionBox(doc, "Synthèse du traitement", [
      { key: "Statut", value: statuts[data.statut || ""] || (data.statut || "—") },
      { key: "Gestionnaire", value: data.gestionnaire_nom || "—" },
      { key: "Traité le", value: data.managed_at ? new Date(data.managed_at).toLocaleDateString("fr-FR") : "—" },
      { key: "Date de clôture", value: data.date_cloture ? new Date(data.date_cloture).toLocaleDateString("fr-FR") : "Non clôturée" },
    ], adminY, ADMIN_BLUE);

    if (data.analyse) {
      adminY = addSectionBox(doc, "Analyse de la réclamation", [
        { key: "Analyse", value: data.analyse },
      ], adminY, [100, 60, 180]);
    }
    if (data.plan_action) {
      adminY = addSectionBox(doc, "Plan d'action", [
        { key: "Actions planifiées", value: data.plan_action },
      ], adminY, [180, 140, 40]);
    }
    if (data.actions_correctives) {
      adminY = addSectionBox(doc, "Actions correctives mises en place", [
        { key: "Mesures concrètes", value: data.actions_correctives },
      ], adminY, [80, 140, 100]);
    }
    if (data.retour_traitement) {
      const labelTraitement = data.date_retour_traitement
        ? `Retour au traitement — ${new Date(data.date_retour_traitement).toLocaleDateString("fr-FR")}`
        : "Retour au traitement";
      adminY = addSectionBox(doc, labelTraitement, [
        { key: "Message", value: data.retour_traitement },
      ], adminY, [30, 140, 80]);
    } else if (data.retour_declarant) {
      adminY = addSectionBox(doc, "Retour au déclarant", [
        { key: "Message", value: data.retour_declarant },
      ], adminY, [30, 140, 80]);
    }
    if (data.retour_cloture) {
      const labelCloture = data.date_retour_cloture
        ? `Retour à la clôture — ${new Date(data.date_retour_cloture).toLocaleDateString("fr-FR")}`
        : "Retour à la clôture";
      adminY = addSectionBox(doc, labelCloture, [
        { key: "Message", value: data.retour_cloture },
      ], adminY, [20, 100, 60]);
    }

    addFooter(doc);
  } else {
    addFooter(doc);
  }

  return doc;
}

export function generateStatsPdf(
  feiData: Array<{ type_fei: string; gravite: number; declarant_nom: string; actions_correctives: string | null; date_evenement: string }>,
  dateFrom: string,
  dateTo: string
) {
  const doc = new jsPDF();
  addHeader(doc, `Rapport Statistiques FEI — ${dateFrom} au ${dateTo}`);

  let y = 48;

  const byType: Record<string, number> = {};
  const byDeclarant: Record<string, number> = {};
  let withActions = 0;

  feiData.forEach((f) => {
    byType[f.type_fei] = (byType[f.type_fei] || 0) + 1;
    byDeclarant[f.declarant_nom] = (byDeclarant[f.declarant_nom] || 0) + 1;
    if (f.actions_correctives) withActions++;
  });

  // Summary box
  y = addSectionBox(doc, "Résumé", [
    { key: "Total FEI", value: `${feiData.length} fiches d'événements indésirables` },
    { key: "Avec actions correctives", value: `${withActions} (${feiData.length > 0 ? Math.round((withActions / feiData.length) * 100) : 0}%)` },
    { key: "Sans actions correctives", value: `${feiData.length - withActions}` },
  ], y, TERRACOTTA);

  // By type
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const typeFields = typeEntries.map(([type, count]) => ({
    key: type,
    value: `${count} occurrences (${Math.round((count / feiData.length) * 100)}%)`,
  }));
  y = addSectionBox(doc, "Répartition par type", typeFields, y, [180, 90, 60]);

  // By declarant
  const declEntries = Object.entries(byDeclarant).sort((a, b) => b[1] - a[1]);
  const declFields = declEntries.map(([name, count]) => ({
    key: name,
    value: `${count} déclaration(s)`,
  }));
  y = addSectionBox(doc, "Répartition par déclarant", declFields, y, [100, 100, 120]);

  addFooter(doc);
  return doc;
}

// ─── Cartographie des risques PDF ─────────────────────────────────────────────

type RisquePdf = {
  id: string;
  categorie: string;
  intitule_risque: string;
  descriptif: string | null;
  facteurs_favorisants: string | null;
  mesures_en_place: string | null;
  probabilite: number;
  gravite: number;
  criticite_brute: number;
  niveau_maitrise: number;
  criticite_residuelle: number;
  proposition_amelioration: string | null;
  date_evaluation: string;
  pacq_action_titre?: string | null;
};

function getCriticiteLabel(cr: number): string {
  if (cr <= 24) return "Maîtrisé";
  if (cr <= 74) return "Modéré";
  return "Critique";
}

function getCrBadgeType(cr: number): 'success' | 'warning' | 'error' {
  if (cr <= 24) return 'success';
  if (cr <= 74) return 'warning';
  return 'error';
}

function parseFfav(raw: string | null): string {
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((s: string) => `• ${s}`).join('\n');
    if (typeof parsed === 'string') return parsed;
  } catch {
    // not JSON
  }
  return raw;
}

export async function generateCartographiePdf(risques: RisquePdf[], categories: string[]): Promise<void> {
  const SUBTITLE = "Cartographie des risques professionnels";
  const ROWS_PER_PAGE = 8;
  const today = new Date().toISOString().split("T")[0];

  const total    = risques.length;
  const maitrise = risques.filter(r => r.criticite_residuelle <= 24).length;
  const modere   = risques.filter(r => r.criticite_residuelle > 24 && r.criticite_residuelle <= 74).length;
  const critique = risques.filter(r => r.criticite_residuelle > 74).length;

  const pages: string[] = [];
  let pageNum = 0;

  // Calcul du total de pages approximatif
  let totalPages = 1; // synthèse
  categories.forEach(cat => {
    const n = risques.filter(r => r.categorie === cat).length;
    if (n > 0) totalPages += Math.ceil(n / ROWS_PER_PAGE);
  });

  // ── Page de garde ────────────────────────────────────────────────────────────
  pageNum++;
  const coverContent = `
    ${pdfSectionTitle("Cartographie des Risques Professionnels")}
    ${pdfKpis([
      { label: "Total risques",      value: total,    color: "#C17B4E" },
      { label: "Maîtrisés (CR≤24)",  value: maitrise, color: "#16A34A" },
      { label: "Modérés (CR 25-74)", value: modere,   color: "#EA580C" },
      { label: "Critiques (CR>74)",  value: critique, color: "#DC2626" },
    ])}
    ${pdfSectionTitle("Répartition par catégorie")}
    ${pdfTable(
      ["Catégorie", "Nb risques", "Dont critiques", "Dont maîtrisés"],
      categories
        .filter(cat => risques.some(r => r.categorie === cat))
        .map(cat => {
          const cats = risques.filter(r => r.categorie === cat);
          const crit = cats.filter(r => r.criticite_residuelle > 74).length;
          const mait = cats.filter(r => r.criticite_residuelle <= 24).length;
          return [
            esc(cat),
            String(cats.length),
            crit > 0 ? pdfBadge(String(crit), 'error') : '0',
            mait > 0 ? pdfBadge(String(mait), 'success') : '0',
          ];
        }),
      ['50%', '17%', '17%', '16%']
    )}`;
  pages.push(pdfPage(coverContent, SUBTITLE, pageNum, totalPages));

  // ── Pages par catégorie ───────────────────────────────────────────────────────
  for (const cat of categories) {
    const catRisques = risques.filter(r => r.categorie === cat);
    if (catRisques.length === 0) continue;

    const chunks = chunkArr(catRisques, ROWS_PER_PAGE);
    for (const chunk of chunks) {
      pageNum++;
      const rows = chunk.map((r, idx) => {
        const ff = parseFfav(r.facteurs_favorisants);
        const pacqCell = r.pacq_action_titre
          ? `<span style="background:#DCFCE7;color:#16A34A;padding:2px 6px;border-radius:4px;font-size:9px;">${esc(r.pacq_action_titre)}</span>`
          : '—';
        return [
          `<strong>${esc(r.intitule_risque)}</strong>`,
          esc(r.descriptif ?? '—'),
          ff.split('\n').map(l => esc(l)).join('<br/>'),
          `${r.probabilite} · ${r.gravite} · ${r.niveau_maitrise}`,
          pdfBadge(`${r.criticite_residuelle} — ${getCriticiteLabel(r.criticite_residuelle)}`, getCrBadgeType(r.criticite_residuelle)),
          esc(r.proposition_amelioration ?? '—'),
          pacqCell,
        ];
      });

      const content = `
        ${pdfSectionHeader(`Catégorie : ${cat}`, `${catRisques.length} risque(s) identifié(s)`)}
        ${pdfTable(
          ["Risque", "Descriptif", "Facteurs favorisants", "P · G · M", "CR résiduelle", "Proposition d'amélioration", "Action PACQS"],
          rows,
          ['18%', '15%', '16%', '7%', '12%', '18%', '14%']
        )}`;
      pages.push(pdfPage(content, SUBTITLE, pageNum, totalPages));
    }
  }

  // ── Page synthèse ─────────────────────────────────────────────────────────────
  pageNum++;
  const synthRows = categories
    .filter(cat => risques.some(r => r.categorie === cat))
    .map(cat => {
      const cats = risques.filter(r => r.categorie === cat);
      const crit = cats.filter(r => r.criticite_residuelle > 74).length;
      const mod  = cats.filter(r => r.criticite_residuelle > 24 && r.criticite_residuelle <= 74).length;
      const mait = cats.filter(r => r.criticite_residuelle <= 24).length;
      return [
        esc(cat),
        String(cats.length),
        mait > 0 ? pdfBadge(String(mait), 'success') : '0',
        mod  > 0 ? pdfBadge(String(mod),  'warning') : '0',
        crit > 0 ? pdfBadge(String(crit), 'error')   : '0',
      ];
    });

  const synthContent = `
    ${pdfSectionTitle("Synthèse globale")}
    ${pdfKpis([
      { label: "Total risques",      value: total,    color: "#C17B4E" },
      { label: "Maîtrisés",          value: maitrise, color: "#16A34A" },
      { label: "Modérés",            value: modere,   color: "#EA580C" },
      { label: "Critiques",          value: critique, color: "#DC2626" },
    ])}
    ${pdfSectionTitle("Tableau récapitulatif par catégorie")}
    ${pdfTable(
      ["Catégorie", "Total", "Maîtrisés", "Modérés", "Critiques"],
      synthRows,
      ['40%', '12%', '16%', '16%', '16%']
    )}`;
  pages.push(pdfPage(synthContent, SUBTITLE, pageNum, totalPages));

  await buildAndSavePdf(pages, `cartographie-risques-${today}.pdf`);
}
