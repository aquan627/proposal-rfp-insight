import Anthropic from "@anthropic-ai/sdk";
import { buildRequest } from "@/lib/prompt";
import type { Part } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CHARS = 400_000;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { part?: Part; text?: string; companyNote?: string }
    | null;
  const part = body?.part;
  const text = (body?.text ?? "").trim();
  if (part !== "insight" && part !== "requirements") {
    return Response.json({ error: "part 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (text.length < 200) {
    return Response.json({ error: "RFP 텍스트가 너무 짧습니다(200자 이상)." }, { status: 400 });
  }

  const truncated = text.length > MAX_CHARS;
  const { system, tool, userContent } = buildRequest(
    part,
    truncated ? text.slice(0, MAX_CHARS) : text,
    body?.companyNote ?? "",
  );

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      if (truncated) send({ type: "warning", message: `RFP가 길어 앞부분 ${MAX_CHARS.toLocaleString()}자만 분석합니다.` });

      let snapshot: unknown = null;
      let lastSent = 0;
      try {
        const msg = client.messages.stream({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
          max_tokens: part === "requirements" ? 32000 : 16000,
          system,
          tools: [tool as unknown as Anthropic.Tool],
          tool_choice: { type: "tool", name: tool.name },
          messages: [{ role: "user", content: userContent }],
        });

        msg.on("inputJson", (_delta, snap) => {
          snapshot = snap;
          const now = Date.now();
          if (now - lastSent > 700) {
            lastSent = now;
            send({ type: "progress", counts: countItems(snap) });
          }
        });

        const final = await msg.finalMessage();
        const block = final.content.find((b) => b.type === "tool_use");
        const data = block && block.type === "tool_use" ? block.input : snapshot;
        if (final.stop_reason === "max_tokens") {
          send({ type: "warning", message: "출력 한도에 도달해 결과 일부가 잘렸을 수 있습니다. RFP를 나눠서 분석해 보세요." });
        }
        send({ type: "result", data });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError ? `Claude API 오류(${err.status}): ${err.message}` : String(err);
        if (snapshot) send({ type: "result", data: snapshot, partial: true });
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function countItems(snap: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (snap && typeof snap === "object") {
    for (const [k, v] of Object.entries(snap)) if (Array.isArray(v)) out[k] = v.length;
  }
  return out;
}
