import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export type ReportOutcome = {
  id: string;
  code: string;
  name: string;
  available: number | string | null;
  earned: number | string | null;
  pendingQuestions: number;
};

export type ReportSection = {
  title: string;
  earned: number | string | null;
  available: number | string | null;
};

export type ReportCard = {
  studentId: string;
  firstName: string;
  lastName: string;
  phase: string;
  attemptNo?: number;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | string | null;
  maxScore: number | string | null;
  correct: number;
  wrong: number;
  blank: number;
  partial: number;
  pending: number;
  outcomes: ReportOutcome[];
  sections?: ReportSection[];
};

export type ReportDeck = {
  examTitle: string;
  companyName: string;
  instituteName: string;
  academicYearName: string;
  gradeName: string;
  branchName: string;
  examTotal?: number | string | null;
  cards: ReportCard[];
};

const PHASE: Record<string, string> = {
  IN_PROGRESS: "Sınavda",
  FINISHED: "Tamamlandı",
  EVALUATED: "Yayınlandı",
};

function phaseLabel(card: { phase: string; attemptNo?: number }) {
  const phase = PHASE[card.phase] ?? card.phase;
  return card.attemptNo && card.attemptNo > 0 ? `${phase} · ${card.attemptNo}. deneme` : phase;
}

const NAVY: [number, number, number] = [20, 54, 92];
const TEAL: [number, number, number] = [15, 118, 110];
const MUTED: [number, number, number] = [90, 104, 120];
const PAPER: [number, number, number] = [247, 244, 239];
const LINE: [number, number, number] = [214, 206, 196];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

type Fonts = { regular: string; bold: string };

let fontsPromise: Promise<Fonts> | null = null;

export function reportFileName(deck: ReportDeck) {
  const parts = ["Karneler", deck.examTitle, deck.gradeName, deck.branchName]
    .map((part) => (part ?? "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return `${parts.join(" - ")}.pdf`;
}

export async function downloadReportCards(deck: ReportDeck) {
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()]);
  const bytes = renderReportPdf(deck, fonts, logo);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFileName(deck);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function renderReportPdf(deck: ReportDeck, fonts: Fonts, logo: string | null = null) {
  if (deck.cards.length === 0) {
    throw new Error("Bu şubede karnesi çıkarılacak öğrenci yok");
  }
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans", "normal");
  doc.setProperties({
    title: reportFileName(deck).replace(/\.pdf$/, ""),
    creator: "ILC Center Exams",
  });

  deck.cards.forEach((card, index) => {
    if (index > 0) doc.addPage();
    drawCard(doc, deck, card, logo);
  });
  stampPages(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

function drawCard(doc: jsPDF, deck: ReportDeck, card: ReportCard, logo: string | null) {
  const startPage = doc.getCurrentPageInfo().pageNumber;
  let y = drawBanner(doc, deck.examTitle, logo);
  y = drawIdentity(doc, deck, card, y);
  const examScale = examHeadline(num(card.score), num(card.maxScore), num(deck.examTotal)).scale;
  y = drawStats(doc, card, num(deck.examTotal), y + 1.5);
  y = drawSections(doc, sectionsOnExamScale(card.sections ?? [], examScale), y + 3);
  y = drawOutcomeIntro(doc, card, y + 5);
  if (card.outcomes.length === 0) return;

  const student = fullName(card);
  autoTable(doc, {
    startY: y,
    margin: { top: 16, right: MARGIN, bottom: 16, left: MARGIN },
    head: [["Kazanım", "Alınabilecek", "Alınan", "Oran"]],
    body: card.outcomes.map((row) => [
      outcomeCell(row),
      points(row.available),
      points(row.earned),
      ratioLabel(num(row.earned), num(row.available)),
    ]),
    theme: "grid",
    styles: {
      font: "NotoSans",
      fontStyle: "normal",
      fontSize: 9,
      textColor: NAVY,
      lineColor: LINE,
      lineWidth: 0.15,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      font: "NotoSans",
      fontStyle: "bold",
      fillColor: NAVY,
      textColor: 255,
      fontSize: 8,
      valign: "middle",
    },
    alternateRowStyles: { fillColor: PAPER },
    columnStyles: {
      0: { cellWidth: 108 },
      1: { cellWidth: 28, halign: "right" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
    },
    showHead: "everyPage",
    didDrawPage: () => {
      if (doc.getCurrentPageInfo().pageNumber === startPage) return;
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(`${student} · Karne`, MARGIN, 10);
    },
  });
}

const LOGO_H = 11;
const LOGO_W = LOGO_H * (375 / 175);

function drawBanner(doc: jsPDF, examTitle: string, logo: string | null) {
  const top = 4;
  if (logo) doc.addImage(logo, "PNG", MARGIN, top, LOGO_W, LOGO_H);
  const textLeft = MARGIN + (logo ? LOGO_W + 3.2 : 0);
  const baseline = top + LOGO_H * 0.62;
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Karne", textLeft, baseline);
  const titleRoom = PAGE_W - MARGIN - (textLeft + doc.getTextWidth("Karne") + 6);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.text(ellipsize(doc, examTitle || "Sınav", Math.max(36, titleRoom)), PAGE_W - MARGIN, baseline, { align: "right" });
  const rule = top + LOGO_H + 2.4;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.7);
  doc.line(0, rule, PAGE_W, rule);
  return rule + 5.5;
}

function drawIdentity(doc: jsPDF, deck: ReportDeck, card: ReportCard, y: number) {
  const name = fullName(card) || "Öğrenci";
  const phase = phaseLabel(card);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  const phaseWidth = doc.getTextWidth(phase);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  const nameRoom = Math.max(40, CONTENT_W - phaseWidth - 4);
  const fittedName = ellipsize(doc, name, nameRoom);
  const drawnName = doc.getTextWidth(fittedName);
  doc.text(fittedName, MARGIN, y);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text(phase, MARGIN + drawnName + 3, y);
  y += 4.2;

  const grade = [deck.gradeName, deck.branchName].map((part) => (part ?? "").trim()).filter(Boolean).join(" / ");
  const bits = [
    labeled("Kurum", deck.companyName),
    labeled("Kampüs", deck.instituteName),
    labeled("Sezon", deck.academicYearName),
    grade ? `Seviye ${grade}` : "",
  ].filter(Boolean);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  const lines = linesOf(doc, bits.join("   ·   "), CONTENT_W).slice(0, 2);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 3.5 + 1.2;
}

function drawStats(doc: jsPDF, card: ReportCard, examTotal: number, y: number) {
  const scaled = examHeadline(num(card.score), num(card.maxScore), examTotal);
  const counts = `Doğru ${card.correct}    Yanlış ${card.wrong}    Boş ${card.blank}    Kısmi ${card.partial}    Bekleyen ${card.pending}`;
  const boxH = 28;
  doc.setFillColor(...PAPER);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(`${points(scaled.shown)} / ${points(scaled.scale)}`, MARGIN + 4, y + 9);
  doc.setFontSize(12);
  doc.setTextColor(...TEAL);
  doc.text(`%${percent(scaled.shown, scaled.scale)}`, PAGE_W - MARGIN - 4, y + 9, { align: "right" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(counts, MARGIN + 4, y + 16);

  drawStatLine(doc, "Sınava giriş", when(card.startedAt), MARGIN + 4, y + 22);
  drawStatLine(doc, "Teslim", when(card.submittedAt), MARGIN + 4, y + 26.5);
  return y + boxH;
}

function sectionsOnExamScale(sections: ReportSection[], scale: number): ReportSection[] {
  const target = Math.round(scale);
  const sum = sections.reduce((total, section) => total + num(section.available), 0);
  if (sections.length === 0 || sum <= 0 || target <= 0) return sections;
  let assigned = 0;
  return sections.map((section, index) => {
    const raw = num(section.available);
    const share = (raw / sum) * target;
    const available = index === sections.length - 1
      ? Math.max(0, target - assigned)
      : Math.max(0, Math.round(share));
    assigned += available;
    const earned = raw <= 0 ? 0 : Math.min(available, Math.round((num(section.earned) / raw) * available));
    return { ...section, earned, available };
  });
}

function drawSections(doc: jsPDF, sections: ReportSection[], y: number) {
  if (sections.length === 0) return y;
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Bölümler", MARGIN, y);
  y += 4.8;

  const gap = 8;
  const colW = (CONTENT_W - gap) / 2;
  const rowH = 5.2;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const x = MARGIN + (index % 2) * (colW + gap);
    const lineY = y + Math.floor(index / 2) * rowH;
    const score = `${points(section.earned)} / ${points(section.available)}`;
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(9);
    const scoreW = doc.getTextWidth(score);
    doc.setFont("NotoSans", "normal");
    const separator = " : ";
    const separatorW = doc.getTextWidth(separator);
    doc.setTextColor(...NAVY);
    const title = ellipsize(doc, section.title?.trim() || "Bölüm", Math.max(16, colW - scoreW - separatorW));
    const label = `${title}${separator}`;
    const labelW = doc.getTextWidth(label);
    doc.text(label, x, lineY);
    doc.setFont("NotoSans", "bold");
    doc.text(score, x + labelW, lineY);
  }
  return y + Math.ceil(sections.length / 2) * rowH + 1;
}

function drawStatLine(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(label, x, y);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(value, x + 28, y);
}

function drawOutcomeIntro(doc: jsPDF, card: ReportCard, y: number) {
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Kazanımlar", MARGIN, y);
  y += 5;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const note =
    "Bir sorunun puanı, bağlı olduğu her kazanıma tam yazılır. Soru 5 puansa her kazanım da 5 puan üzerinden hesaplanır.";
  const noteLines = linesOf(doc, note, CONTENT_W);
  doc.text(noteLines, MARGIN, y);
  y += noteLines.length * 3.6 + 3;
  if (card.outcomes.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Bu sınavın sorularına kazanım bağlı değil.", MARGIN, y);
  }
  return y;
}

function labeled(label: string, value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text ? `${label} ${text}` : "";
}

function examHeadline(score: number, max: number, examTotal: number) {
  const scale = Math.round(examTotal > 0 ? examTotal : 100);
  if (max <= 0 || scale <= 0) return { shown: 0, scale };
  return { shown: Math.round((score / max) * scale), scale };
}

function outcomeCell(row: ReportOutcome) {
  const lines = [shown(row.name)];
  if (row.code?.trim()) lines.push(row.code.trim());
  if (row.pendingQuestions > 0) lines.push(`${row.pendingQuestions} sorunun puanı bekliyor`);
  return lines.join("\n");
}

function stampPages(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${page} / ${total}`, PAGE_W / 2, PAGE_H - 8, { align: "center" });
  }
}

function ellipsize(doc: jsPDF, text: string, width: number) {
  const value = text.trim() || "—";
  if (doc.getTextWidth(value) <= width) return value;
  let cut = value;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function linesOf(doc: jsPDF, text: string, width: number) {
  const raw = doc.splitTextToSize(text, width);
  return Array.isArray(raw) ? raw : [String(raw)];
}

function fullName(card: { firstName: string; lastName: string }) {
  return `${card.firstName} ${card.lastName}`.trim();
}

function shown(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text || "—";
}

function when(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMMM yyyy, HH:mm", { locale: tr });
}

function num(value: number | string | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function points(value: number | string | null | undefined) {
  return num(value).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function percent(score: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((score / max) * 100);
}

function ratioLabel(earned: number, available: number) {
  if (available <= 0) return "—";
  return `%${Math.round((earned / available) * 100)}`;
}

let logoPromise: Promise<string | null> | null = null;

async function loadLogo() {
  logoPromise ??= fetchLogo();
  return logoPromise;
}

async function fetchLogo() {
  try {
    const response = await fetch("/brand/logo.png");
    if (!response.ok) return null;
    return flattenLogo(await response.blob());
  } catch {
    return null;
  }
}

async function flattenLogo(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) return bufferToBase64(await blob.arrayBuffer());
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

async function loadFonts(): Promise<Fonts> {
  fontsPromise ??= Promise.all([
    fetchFont("/fonts/NotoSans-Regular.ttf"),
    fetchFont("/fonts/NotoSans-Bold.ttf"),
  ]).then(([regular, bold]) => ({ regular, bold }));
  return fontsPromise;
}

async function fetchFont(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Karne yazı tipi yüklenemedi");
  return bufferToBase64(await response.arrayBuffer());
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
