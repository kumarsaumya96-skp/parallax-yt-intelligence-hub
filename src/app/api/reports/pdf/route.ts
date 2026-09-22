import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { NextResponse } from "next/server";
import { getWorkspaceReportData } from "@/lib/report-data";
import {
  parseCsvSelection,
  parseCustomDateRange,
  parseReportRange,
  pdfPagesForSections,
} from "@/lib/report-selection";

const violet = rgb(0.427, 0.29, 1);
const ink = rgb(0.09, 0.125, 0.2);
const muted = rgb(0.42, 0.45, 0.52);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function heading(page: PDFPage, font: PDFFont, title: string, subtitle: string) {
  page.drawText(title, { x: 54, y: 738, size: 24, font, color: ink });
  page.drawText(subtitle, { x: 54, y: 714, size: 10, color: muted });
  page.drawLine({
    start: { x: 54, y: 696 },
    end: { x: 558, y: 696 },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.94),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sections = parseCsvSelection(url.searchParams, "sections");
  const selectedMetrics = parseCsvSelection(url.searchParams, "metrics");
  const selectedPages = pdfPagesForSections(sections);
  const data = await getWorkspaceReportData(
    url.searchParams.get("brandId") ?? "brand-1",
    parseReportRange(url.searchParams.get("range")),
    parseCustomDateRange(url.searchParams),
  );
  const document = await PDFDocument.create();
  document.setTitle(`${data.brand.name} - Parallax YouTube Report`);
  document.setAuthor("Parallax");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  const cover = document.addPage([612, 792]);
  cover.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(0.975, 0.977, 0.988) });
  cover.drawRectangle({ x: 0, y: 684, width: 612, height: 108, color: violet });
  cover.drawText("PARALLAX", { x: 54, y: 742, size: 11, font: bold, color: rgb(1, 1, 1) });
  cover.drawText("YOUTUBE INTELLIGENCE HUB", {
    x: 54,
    y: 718,
    size: 9,
    font: regular,
    color: rgb(0.9, 0.87, 1),
  });
  cover.drawText(data.brand.name, { x: 54, y: 510, size: 33, font: bold, color: ink });
  cover.drawText("YouTube Performance & Strategy Report", {
    x: 54,
    y: 474,
    size: 17,
    font: regular,
    color: muted,
  });
  cover.drawText(data.period, { x: 54, y: 438, size: 12, font: bold, color: violet });
  cover.drawRectangle({
    x: 54,
    y: 158,
    width: 504,
    height: 122,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.9, 0.91, 0.94),
    borderWidth: 1,
  });
  cover.drawText("Prepared for client review", { x: 78, y: 238, size: 10, font: bold, color: ink });
  cover.drawText("Includes owned-channel analytics, public competitor signals,", {
    x: 78,
    y: 210,
    size: 10,
    font: regular,
    color: muted,
  });
  cover.drawText("evidence-backed opportunities and approved recommendations.", {
    x: 78,
    y: 192,
    size: 10,
    font: regular,
    color: muted,
  });

  if (selectedPages.includes("executive")) {
    const executive = document.addPage([612, 792]);
    heading(executive, bold, "Executive summary", `${data.brand.name} - ${data.period}`);
    let y = 650;
    for (const line of wrap(data.executiveSummary, regular, 12, 500)) {
      executive.drawText(line, { x: 54, y, size: 12, font: regular, color: ink });
      y -= 21;
    }
    const metrics = [
      ["Views", data.aggregate.views.toLocaleString()],
      ["Watch time", `${Math.round(data.aggregate.watchMinutes / 60).toLocaleString()} h`],
      ["Net subscribers", `+${data.aggregate.netSubscribers.toLocaleString()}`],
      ["Engagement", `${(data.aggregate.engagement * 100).toFixed(1)}%`],
    ].filter(([label]) => selectedMetrics === null || selectedMetrics.includes(label));
    metrics.forEach(([label, value], index) => {
      const x = 54 + (index % 2) * 258;
      const boxY = 470 - Math.floor(index / 2) * 104;
      executive.drawRectangle({
        x,
        y: boxY,
        width: 242,
        height: 84,
        color: rgb(0.975, 0.977, 0.988),
        borderColor: rgb(0.91, 0.92, 0.95),
        borderWidth: 1,
      });
      executive.drawText(label, { x: x + 18, y: boxY + 54, size: 9, font: regular, color: muted });
      executive.drawText(value, { x: x + 18, y: boxY + 24, size: 20, font: bold, color: ink });
    });
    executive.drawText("Recommended action", {
      x: 54,
      y: 246,
      size: 12,
      font: bold,
      color: violet,
    });
    const action = data.isDemo
      ? "Restore weekly long-form cadence and extend the strongest decision-focused topic with one follow-up video and three search-led Shorts."
      : data.metrics.length > 0
        ? "Review the measured period with the account team, then sync detailed traffic-source analytics before assigning a content driver."
        : "Connect YouTube and complete the first owned-channel analytics sync.";
    y = 218;
    for (const line of wrap(action, regular, 11, 500)) {
      executive.drawText(line, { x: 54, y, size: 11, font: regular, color: ink });
      y -= 19;
    }
  }

  if (selectedPages.includes("content")) {
    const content = document.addPage([612, 792]);
    heading(content, bold, "Content performance", "Top videos in the selected report period");
    let y = 662;
    content.drawRectangle({ x: 54, y: y - 4, width: 504, height: 28, color: violet });
    content.drawText("Video", { x: 68, y: y + 6, size: 9, font: bold, color: rgb(1, 1, 1) });
    content.drawText("Format", { x: 390, y: y + 6, size: 9, font: bold, color: rgb(1, 1, 1) });
    content.drawText("Views", { x: 492, y: y + 6, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 34;
    data.topVideos.slice(0, 8).forEach((video, index) => {
      if (index % 2 === 0)
        content.drawRectangle({
          x: 54,
          y: y - 22,
          width: 504,
          height: 46,
          color: rgb(0.975, 0.977, 0.988),
        });
      const safeTitle = video.title.replaceAll("·", "-").replaceAll("—", "-");
      const title = safeTitle.length > 49 ? `${safeTitle.slice(0, 46)}...` : safeTitle;
      content.drawText(title, { x: 68, y, size: 9, font: regular, color: ink });
      content.drawText(video.format, { x: 390, y, size: 9, font: regular, color: muted });
      content.drawText(video.views.toLocaleString(), {
        x: 492,
        y,
        size: 9,
        font: bold,
        color: ink,
      });
      y -= 46;
    });
    content.drawText("Interpretation", { x: 54, y: 230, size: 12, font: bold, color: violet });
    const interpretation = data.isDemo
      ? "Top demo content is concentrated in practical explainers and comparison-led formats. Use this as a direction signal while continuing to test topic, title and opening execution."
      : data.topVideos.length > 0
        ? "This table uses available video metadata. Detailed retention and traffic-source evidence remain required before assigning causality."
        : "No video rows are available for this brand yet.";
    y = 202;
    for (const line of wrap(interpretation, regular, 10.5, 500)) {
      content.drawText(line, { x: 54, y, size: 10.5, font: regular, color: ink });
      y -= 18;
    }
  }

  if (selectedPages.includes("strategy")) {
    const strategy = document.addPage([612, 792]);
    heading(
      strategy,
      bold,
      "Strategy opportunities",
      "Transparent signals - not guaranteed predictions",
    );
    let y = 654;
    data.opportunities.slice(0, 4).forEach((item) => {
      strategy.drawRectangle({
        x: 54,
        y: y - 86,
        width: 504,
        height: 98,
        color: rgb(0.975, 0.977, 0.988),
        borderColor: rgb(0.91, 0.92, 0.95),
        borderWidth: 1,
      });
      strategy.drawText(`${item.score}`, { x: 74, y: y - 20, size: 23, font: bold, color: violet });
      strategy.drawText(item.type.toUpperCase(), {
        x: 74,
        y: y - 39,
        size: 7.5,
        font: bold,
        color: muted,
      });
      const titleLines = wrap(item.title.replaceAll("—", "-"), bold, 11, 390).slice(0, 2);
      titleLines.forEach((line, index) =>
        strategy.drawText(line, {
          x: 126,
          y: y - 12 - index * 15,
          size: 11,
          font: bold,
          color: ink,
        }),
      );
      strategy.drawText(`${item.priority} priority - ${item.format}`, {
        x: 126,
        y: y - 52,
        size: 9,
        font: regular,
        color: muted,
      });
      strategy.drawText(
        item.signals
          .filter((signal) => signal.value !== null)
          .slice(0, 3)
          .map((signal) => `${signal.label} ${Math.round((signal.value ?? 0) * 100)}`)
          .join("  -  "),
        { x: 126, y: y - 71, size: 8.5, font: regular, color: ink },
      );
      y -= 118;
    });
    strategy.drawText("Parallax - YouTube Intelligence Hub - Internal notes excluded", {
      x: 54,
      y: 50,
      size: 8,
      font: regular,
      color: muted,
    });
  }

  const bytes = await document.save();
  const safeName = data.brand.name
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .toLowerCase();
  return new NextResponse(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-youtube-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
