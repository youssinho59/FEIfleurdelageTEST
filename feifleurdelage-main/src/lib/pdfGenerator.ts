import jsPDF from "jspdf";

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
  doc.text("EHPAD La Fleur de l'Âge", 42, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 42, 28);

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
}) {
  const doc = new jsPDF();
  addHeader(doc, "Fiche d'Événement Indésirable (FEI)");

  let y = 48;
  y = addRefBadge(doc, data.id, y);

  // Section: Identification
  y = addSectionBox(doc, "Identification", [
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

  // Section: Actions correctives
  y = addSectionBox(doc, "Actions correctives", [
    { key: "Mesures prises", value: data.actions_correctives || "Aucune action corrective renseignée" },
  ], y, [80, 140, 100]);

  addFooter(doc);
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
}) {
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

  y = addSectionBox(doc, "Description détaillée", [
    { key: "Détail", value: data.description },
  ], y, [100, 100, 120]);

  y = addSectionBox(doc, "Réponse apportée", [
    { key: "Mesures / Réponse", value: data.reponse_apportee || "En attente de traitement" },
  ], y, [80, 140, 100]);

  addFooter(doc);
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
