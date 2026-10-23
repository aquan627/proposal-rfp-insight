import { buildWorkbook } from "@/lib/excel";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { result?: AnalysisResult; title?: string } | null;
  if (!body?.result) return Response.json({ error: "분석 결과가 없습니다." }, { status: 400 });

  const title = (body.title || "RFP").slice(0, 80);
  const buf = await buildWorkbook(body.result, title);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `RFP분석_${title.replace(/[\\/:*?"<>|]/g, "_")}_${stamp}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
