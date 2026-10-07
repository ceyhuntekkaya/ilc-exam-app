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

export type ReportCard = {
  studentId: string;
  firstName: string;
  lastName: string;
  phase: string;
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
};

export type ReportDeck = {
  examTitle: string;
  companyName: string;
  instituteName: string;
  academicYearName: string;
  gradeName: string;
  branchName: string;
  cards: ReportCard[];
};

const PHASE: Record<string, string> = {
  IN_PROGRESS: "Sınavda",
  FINISHED: "Tamamlandı",
  EVALUATED: "Yayınlandı",
};

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
  const bytes = renderReportPdf(deck, await loadFonts());
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

export function renderReportPdf(deck: ReportDeck, fonts: Fonts) {
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
    drawCard(doc, deck, card);
  });
  stampPages(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

function drawCard(doc: jsPDF, deck: ReportDeck, card: ReportCard) {
  const startPage = doc.getCurrentPageInfo().pageNumber;
  drawBanner(doc, deck.examTitle);
  let y = 32;
  y = drawIdentity(doc, deck, card, y);
  y = drawStats(doc, card, y + 2);
  y = drawOutcomeIntro(doc, card, y + 8);
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

function drawBanner(doc: jsPDF, examTitle: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setFillColor(...TEAL);
  doc.rect(0, 22, PAGE_W, 1.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(14);
  doc.text("Karne", MARGIN, 14);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.text(ellipsize(doc, examTitle || "Sınav", 118), PAGE_W - MARGIN, 14, { align: "right" });
}

function drawIdentity(doc: jsPDF, deck: ReportDeck, card: ReportCard, y: number) {
  doc.setTextColor(...NAVY);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(18);
  const nameLines = linesOf(doc, fullName(card) || "Öğrenci", CONTENT_W).slice(0, 2);
  doc.text(nameLines, MARGIN, y);
  y += nameLines.length * 7.2 + 1.5;

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEAL);
  doc.text(PHASE[card.phase] ?? card.phase, MARGIN, y);
  y += 8;

  y = drawFact(doc, "Kurum", deck.companyName, MARGIN, y, CONTENT_W);
  const facts = [
    ["Kampüs", deck.instituteName],
    ["Sezon", deck.academicYearName],
    ["Seviye", deck.gradeName],
    ["Şube", deck.branchName],
    ["Sınav", deck.examTitle],
    ["Durum", PHASE[card.phase] ?? card.phase],
  ] as const;
  const colW = (CONTENT_W - 8) / 2;
  for (let i = 0; i < facts.length; i += 2) {
    const leftH = factHeight(doc, facts[i][1], colW);
    const rightH = factHeight(doc, facts[i + 1][1], colW);
    drawFact(doc, facts[i][0], facts[i][1], MARGIN, y, colW);
    drawFact(doc, facts[i + 1][0], facts[i + 1][1], MARGIN + colW + 8, y, colW);
    y += Math.max(leftH, rightH);
  }
  return y;
}

function drawStats(doc: jsPDF, card: ReportCard, y: number) {
  const score = num(card.score);
  const max = num(card.maxScore);
  const counts = `Doğru ${card.correct}    Yanlış ${card.wrong}    Boş ${card.blank}    Kısmi ${card.partial}    Bekleyen ${card.pending}`;
  const boxH = 36;
  doc.setFillColor(...PAPER);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(`${points(score)} / ${points(max)}`, MARGIN + 4, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(`%${percent(score, max)}`, PAGE_W - MARGIN - 4, y + 8, { align: "right" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(counts, MARGIN + 4, y + 16);

  drawStatLine(doc, "Sınava giriş", when(card.startedAt), MARGIN + 4, y + 23);
  drawStatLine(doc, "Teslim", when(card.submittedAt), MARGIN + 4, y + 30);
  return y + boxH;
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

function drawFact(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(label, x, y);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const lines = linesOf(doc, shown(value), width).slice(0, 2);
  doc.text(lines, x, y + 4.6);
  return y + factHeight(doc, value, width);
}

function factHeight(doc: jsPDF, value: string, width: number) {
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  const count = Math.min(2, linesOf(doc, shown(value), width).length);
  return 4.6 + count * 4.8 + 2.4;
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
