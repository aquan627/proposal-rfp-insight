import ExcelJS from "exceljs";
import { OVERVIEW_FIELDS, SHEETS } from "./columns";
import type { AnalysisResult } from "./types";

const NAVY = "FF1F3A5F";
const LIGHT = "FFEEF2F7";
const BORDER = { style: "thin" as const, color: { argb: "FFC9D2DE" } };
const ALL_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

type Row = Record<string, unknown>;

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "맑은 고딕", size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = ALL_BORDERS;
  });
}

function styleBody(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.font = { name: "맑은 고딕", size: 10 };
    c.alignment = { vertical: "top", wrapText: true };
    c.border = ALL_BORDERS;
  });
}

export async function buildWorkbook(result: AnalysisResult, fileTitle: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RFP Insight";
  wb.created = new Date();

  // 요약 시트
  const sum = wb.addWorksheet("요약", { views: [{ showGridLines: false }] });
  sum.columns = [{ width: 18 }, { width: 90 }];
  const title = sum.addRow([`RFP 분석 요약 — ${fileTitle}`]);
  title.font = { bold: true, size: 14, name: "맑은 고딕", color: { argb: NAVY } };
  sum.mergeCells(1, 1, 1, 2);
  sum.addRow([`생성일시: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · AI 분석 결과이므로 원문 대조 검토 필요`]).font =
    { italic: true, size: 9, color: { argb: "FF6B7785" }, name: "맑은 고딕" };
  sum.mergeCells(2, 1, 2, 2);
  sum.addRow([]);

  const ov = (result.insight?.overview ?? {}) as unknown as Row;
  styleHeader(sum.addRow(["항목", "내용"]));
  for (const f of OVERVIEW_FIELDS) {
    const r = sum.addRow([f.label, String(ov[f.key] ?? "-")]);
    styleBody(r);
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    r.getCell(1).font = { bold: true, name: "맑은 고딕", size: 10 };
  }

  const reqs = result.requirements ?? [];
  if (reqs.length) {
    sum.addRow([]);
    styleHeader(sum.addRow(["요구사항 분류", "건수 (중요도 상 / 전체)"]));
    const by = new Map<string, { total: number; high: number }>();
    for (const r of reqs) {
      const e = by.get(r.category) ?? { total: 0, high: 0 };
      e.total++;
      if (r.priority === "상") e.high++;
      by.set(r.category, e);
    }
    for (const [cat, e] of [...by.entries()].sort()) styleBody(sum.addRow([cat, `${e.high} / ${e.total}`]));
    const tot = sum.addRow(["합계", `${reqs.filter((r) => r.priority === "상").length} / ${reqs.length}`]);
    styleBody(tot);
    tot.font = { bold: true, name: "맑은 고딕", size: 10 };
  }

  // 상세 시트
  for (const def of SHEETS) {
    const src = (def.source === "requirements" ? { requirements: result.requirements } : result.insight) as Row | null;
    const rows = (src?.[def.field] as Row[] | undefined) ?? [];
    const ws = wb.addWorksheet(def.title, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [{ header: "No", key: "_no", width: 5 }, ...def.cols.map((c) => ({ header: c.label, key: c.key, width: c.width }))];
    styleHeader(ws.getRow(1));
    rows.forEach((item, i) => {
      const values: Row = { _no: i + 1 };
      for (const c of def.cols) values[c.key] = item?.[c.key] == null ? "" : String(item[c.key]);
      const r = ws.addRow(values);
      styleBody(r);
      r.getCell(1).alignment = { vertical: "top", horizontal: "center" };
      if (item?.priority === "상" || item?.kind === "참고사례(검증필요)") {
        const key = item?.priority === "상" ? "priority" : "kind";
        const cell = r.getCell(key);
        cell.font = { bold: true, name: "맑은 고딕", size: 10, color: { argb: item?.priority === "상" ? "FFB42318" : "FFB54708" } };
      }
    });
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: def.cols.length + 1 } };
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
