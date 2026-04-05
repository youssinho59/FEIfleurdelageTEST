/**
 * pdfExportUtils.ts
 * Utilitaires HTML → Canvas → PDF communs à tous les exports de l'application.
 * Charte graphique : orangé terracotta #C17B4E, beige clair, typo Arial inline.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── Palette ────────────────────────────────────────────────────────────────────
export const C = {
  primary:   '#C17B4E',
  secondary: '#F5F0EB',
  text:      '#2D2D2D',
  grey:      '#888888',
  critical:  '#DC2626',
  success:   '#16A34A',
  warning:   '#EA580C',
  border:    '#E5E7EB',
  white:     '#FFFFFF',
  PAGE_W:    794,   // A4 portrait px à 96dpi
  PAGE_H:    1123,
  PAGE_W_L:  1123,  // A4 landscape
  PAGE_H_L:  794,
};

// ── Blocs HTML communs ─────────────────────────────────────────────────────────

export const pdfHeader = (subtitle: string): string => `
<div style="background:${C.primary};padding:18px 28px;display:flex;align-items:center;gap:16px;">
  <div style="width:50px;height:50px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <span style="color:${C.primary};font-weight:700;font-size:15px;font-family:Arial,sans-serif;">FÂ</span>
  </div>
  <div>
    <div style="color:white;font-weight:700;font-size:22px;font-family:Arial,sans-serif;line-height:1.2;">EHPAD La Fleur de l'Âge</div>
    <div style="color:rgba(255,255,255,0.92);font-size:13px;font-family:Arial,sans-serif;margin-top:2px;">${subtitle}</div>
    <div style="color:rgba(255,220,195,0.85);font-size:9px;font-family:Arial,sans-serif;margin-top:3px;">Tél : 03 20 94 09 28 · courrier@ehpad-lafleurdelage.fr · 20 bis Allée des Sports, 59960 Neuville-en-Ferrain</div>
  </div>
</div>`;

export const pdfFooter = (page: number, total: number): string => {
  const date = new Date().toLocaleDateString('fr-FR');
  return `
<div style="border-top:2px solid ${C.primary};padding:7px 28px;display:flex;justify-content:space-between;align-items:center;">
  <span style="color:${C.grey};font-size:8px;font-family:Arial,sans-serif;">EHPAD La Fleur de l'Âge — Document confidentiel</span>
  <span style="color:${C.grey};font-size:8px;font-family:Arial,sans-serif;">${page} / ${total}</span>
  <span style="color:${C.grey};font-size:8px;font-family:Arial,sans-serif;">Généré le ${date}</span>
</div>`;
};

/** Enveloppe une section de contenu dans une page A4 complète (portrait ou landscape). */
export const pdfPage = (
  content: string,
  subtitle: string,
  page: number,
  total: number,
  landscape = false
): string => {
  const w = landscape ? C.PAGE_W_L : C.PAGE_W;
  const h = landscape ? C.PAGE_H_L : C.PAGE_H;
  return `
<div style="width:${w}px;min-height:${h}px;background:white;display:flex;flex-direction:column;box-sizing:border-box;">
  ${pdfHeader(subtitle)}
  <div style="flex:1;padding:16px 0;display:flex;flex-direction:column;gap:14px;">
    ${content}
  </div>
  ${pdfFooter(page, total)}
</div>`;
};

/** Cartes KPI horizontales. */
export const pdfKpis = (
  items: Array<{ label: string; value: string | number; color?: string }>
): string => `
<div style="display:flex;gap:12px;flex-wrap:wrap;padding:0 28px;">
  ${items.map(k => `
  <div style="flex:1;min-width:130px;background:white;border-radius:8px;border:1px solid ${C.border};border-left:4px solid ${k.color ?? C.primary};padding:12px 14px;">
    <div style="font-size:26px;font-weight:700;color:${k.color ?? C.primary};font-family:Arial,sans-serif;line-height:1;">${k.value}</div>
    <div style="font-size:10px;color:${C.grey};font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${k.label}</div>
  </div>`).join('')}
</div>`;

/** Titre de section avec filet coloré. */
export const pdfSectionTitle = (title: string, color = C.primary): string => `
<div style="padding:0 28px;">
  <div style="font-size:16px;font-weight:700;color:${color};font-family:Arial,sans-serif;border-bottom:2px solid ${color};padding-bottom:4px;margin-bottom:10px;">${title}</div>
</div>`;

/** Titre de section secondaire. */
export const pdfSubTitle = (text: string): string => `
<div style="padding:0 28px;">
  <div style="font-size:13px;font-weight:600;color:${C.text};font-family:Arial,sans-serif;margin-bottom:6px;">${text}</div>
</div>`;

/** Tableau avec en-têtes orangés et lignes alternées. */
export const pdfTable = (
  headers: string[],
  rows: string[][],
  colWidths?: string[]
): string => {
  const th = `background:${C.primary};color:white;padding:7px 9px;text-align:left;font-size:10px;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;`;
  const td = `padding:6px 9px;border:1px solid ${C.border};color:${C.text};vertical-align:top;font-family:Arial,sans-serif;font-size:10px;line-height:1.4;`;
  return `
<div style="padding:0 28px;overflow:hidden;">
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      ${headers.map((h, i) => `<th style="${th}${colWidths?.[i] ? `width:${colWidths[i]};` : ''}">${h}</th>`).join('')}
    </tr></thead>
    <tbody>
      ${rows.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? 'white' : C.secondary};">
        ${row.map(cell => `<td style="${td}">${cell}</td>`).join('')}
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
};

/** Badge coloré inline (succès, erreur, avertissement, info, neutre, critique). */
export const pdfBadge = (
  text: string,
  type: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'critical' = 'neutral'
): string => {
  const s: Record<string, string> = {
    success:  'background:#DCFCE7;color:#16A34A;',
    error:    'background:#FEE2E2;color:#DC2626;',
    warning:  'background:#FEF9C3;color:#CA8A04;',
    info:     'background:#DBEAFE;color:#1D4ED8;',
    neutral:  'background:#F3F4F6;color:#6B7280;',
    critical: 'background:#DC2626;color:white;',
  };
  return `<span style="${s[type]}padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;font-family:Arial,sans-serif;">${esc(text)}</span>`;
};

/** Barre de progression. */
export const pdfProgressBar = (pct: number, color = C.primary): string => `
<div style="padding:0 28px;">
  <div style="background:${C.border};border-radius:6px;height:10px;overflow:hidden;">
    <div style="background:${color};height:100%;width:${Math.min(100, Math.max(0, pct))}%;border-radius:6px;"></div>
  </div>
  <div style="text-align:center;font-size:11px;color:${C.grey};font-family:Arial,sans-serif;margin-top:4px;">${pct}%</div>
</div>`;

/** Bloc texte avec titre et fond beige. */
export const pdfTextBlock = (label: string, text: string, color = C.primary): string => `
<div style="padding:0 28px;">
  <div style="background:${C.secondary};border-radius:6px;padding:11px 14px;border-left:3px solid ${color};">
    <div style="font-size:10px;font-weight:700;color:${C.grey};font-family:Arial,sans-serif;text-transform:uppercase;margin-bottom:5px;">${label}</div>
    <div style="font-size:11px;color:${C.text};font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap;">${esc(text)}</div>
  </div>
</div>`;

/** Insère une image (dataUrl) capturée depuis le DOM. */
export const pdfImage = (dataUrl: string, caption?: string): string => `
<div style="padding:0 28px;">
  <img src="${dataUrl}" style="width:100%;border-radius:4px;border:1px solid ${C.border};" />
  ${caption ? `<div style="text-align:center;font-size:9px;color:${C.grey};font-family:Arial,sans-serif;margin-top:4px;">${caption}</div>` : ''}
</div>`;

/** Header de section coloré (pour DUERP / PACQS). */
export const pdfSectionHeader = (text: string, sub?: string, color = '#1e3a6e'): string => `
<div style="padding:0 28px;">
  <div style="background:${color};border-radius:6px;padding:10px 14px;">
    <div style="color:white;font-weight:700;font-size:13px;font-family:Arial,sans-serif;">${esc(text)}</div>
    ${sub ? `<div style="color:rgba(255,255,255,0.75);font-size:10px;font-family:Arial,sans-serif;margin-top:3px;">${esc(sub)}</div>` : ''}
  </div>
</div>`;

// ── Échappement HTML ───────────────────────────────────────────────────────────

export function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Formatage date ─────────────────────────────────────────────────────────────

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR');
}

// ── Capture DOM → dataUrl ──────────────────────────────────────────────────────

/** Capture un string HTML dans un div caché et retourne une dataUrl PNG. */
export async function captureHtmlString(html: string, landscape = false): Promise<string> {
  const w = landscape ? C.PAGE_W_L : C.PAGE_W;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;background:white;z-index:-1;`;
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const target = (wrapper.firstElementChild as HTMLElement) ?? wrapper;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      width: w,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** Capture un élément DOM existant par son ID. */
export async function captureById(id: string): Promise<string | null> {
  const el = document.getElementById(id);
  if (!el) return null;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

/** Capture un élément DOM existant directement. */
export async function captureElement(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

// ── Assemblage PDF ─────────────────────────────────────────────────────────────

/**
 * Assemble et télécharge un PDF multi-pages.
 * Chaque élément de `pages` est soit :
 *  - un string HTML (déjà wrappé avec pdfPage) → sera capturé,
 *  - ou un { dataUrl, landscape } déjà capturé.
 */
export async function buildAndSavePdf(
  pages: Array<string | { dataUrl: string; landscape?: boolean }>,
  filename: string,
  defaultLandscape = false
): Promise<void> {
  if (pages.length === 0) return;

  const orient = defaultLandscape ? 'l' : 'p';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: orient });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage('a4', orient);

    let dataUrl: string;
    let landscape = defaultLandscape;

    const p = pages[i];
    if (typeof p === 'string') {
      dataUrl = await captureHtmlString(p, landscape);
    } else {
      dataUrl = p.dataUrl;
      landscape = p.landscape ?? defaultLandscape;
    }

    const img = new Image();
    await new Promise<void>(res => { img.onload = () => res(); img.src = dataUrl; });

    const pw = landscape ? 297 : 210;
    const ph = landscape ? 210 : 297;
    const ratio = img.height / img.width;
    const renderH = Math.min(ph, pw * ratio);

    pdf.addImage(dataUrl, 'PNG', 0, 0, pw, renderH);
  }

  pdf.save(filename);
}

// ── Utilitaire ─────────────────────────────────────────────────────────────────

/** Découpe un tableau en tranches de `size`. */
export function chunkArr<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
