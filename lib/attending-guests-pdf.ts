import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { Guest, InvitationCategory } from "@/lib/supabase";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const ROW_SIZE = 11;
const ROW_HEIGHT = 19;
const HEADING_SIZE = 13;
const TEXT_COLOR = rgb(0.13, 0.12, 0.11);
const MUTED_COLOR = rgb(0.45, 0.43, 0.4);
const RULE_COLOR = rgb(0.85, 0.83, 0.8);

const sections: { category: InvitationCategory; title: string }[] = [
  { category: "ceremony_reception", title: "Ceremony & reception" },
  { category: "reception_only", title: "Reception only" },
];

const undecomposableLetters: Record<string, string> = { Ł: "L", ł: "l", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ı: "i" };

// Standard PDF fonts only cover WinAnsi; drawing anything else throws.
function toDrawableText(text: string, supported: Set<number>) {
  return Array.from(text, (char) => {
    if (supported.has(char.codePointAt(0)!)) return char;
    const base = undecomposableLetters[char] ?? char.normalize("NFD").replace(/\p{M}/gu, "");
    return Array.from(base).every((part) => supported.has(part.codePointAt(0)!)) && base ? base : "?";
  }).join("");
}

function fitToWidth(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let fitted = text;
  while (fitted.length > 0 && font.widthOfTextAtSize(`${fitted}…`, size) > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted.trimEnd()}…`;
}

export async function buildAttendingGuestsPdf(guests: Pick<Guest, "name" | "invitation_category">[], generatedAt = new Date()) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Attending guests");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supportedChars = new Set(regular.getCharacterSet());
  const contentWidth = PAGE_WIDTH - MARGIN_X * 2;

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  page.drawText("Attending guests", { x: MARGIN_X, y, size: 22, font: bold, color: TEXT_COLOR });
  y -= 22;
  const generatedLabel = generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(`${guests.length} attending · Generated ${generatedLabel}`, { x: MARGIN_X, y, size: 10, font: regular, color: MUTED_COLOR });
  y -= 30;

  const drawHeading = (title: string) => {
    page.drawText(title, { x: MARGIN_X, y, size: HEADING_SIZE, font: bold, color: TEXT_COLOR });
    y -= 8;
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, thickness: 0.75, color: RULE_COLOR });
    y -= ROW_HEIGHT;
  };

  const startNewPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
  };

  for (const [index, section] of sections.entries()) {
    const names = guests.filter((guest) => guest.invitation_category === section.category).map((guest) => guest.name);
    const title = `${section.title} (${names.length})`;
    if (index > 0) y -= 14;
    if (y - HEADING_SIZE - ROW_HEIGHT * 2 < MARGIN_BOTTOM) startNewPage();
    drawHeading(title);

    if (names.length === 0) {
      page.drawText("No guests", { x: MARGIN_X, y, size: ROW_SIZE, font: regular, color: MUTED_COLOR });
      y -= ROW_HEIGHT;
      continue;
    }

    const numberWidth = regular.widthOfTextAtSize(`${names.length}.`, ROW_SIZE);
    for (const [position, name] of names.entries()) {
      if (y < MARGIN_BOTTOM) {
        startNewPage();
        drawHeading(`${title} (continued)`);
      }
      const number = `${position + 1}.`;
      page.drawText(number, { x: MARGIN_X + numberWidth - regular.widthOfTextAtSize(number, ROW_SIZE), y, size: ROW_SIZE, font: regular, color: MUTED_COLOR });
      const nameX = MARGIN_X + numberWidth + 10;
      const text = fitToWidth(toDrawableText(name, supportedChars), regular, ROW_SIZE, contentWidth - (nameX - MARGIN_X));
      page.drawText(text, { x: nameX, y, size: ROW_SIZE, font: regular, color: TEXT_COLOR });
      y -= ROW_HEIGHT;
    }
  }

  const pages = pdf.getPages();
  for (const [index, current] of pages.entries()) {
    const label = `Page ${index + 1} of ${pages.length}`;
    current.drawText(label, {
      x: (PAGE_WIDTH - regular.widthOfTextAtSize(label, 9)) / 2,
      y: 32,
      size: 9,
      font: regular,
      color: MUTED_COLOR,
    });
  }

  return pdf.save();
}
