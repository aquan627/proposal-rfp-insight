import OpenAI from "openai";
import { parse as parsePartial } from "partial-json";
import { buildRequest } from "@/lib/prompt";
import type { Part } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CHARS = 400_000;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요." },
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

  const client = new OpenAI();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      if (truncated) send({ type: "warning", message: `RFP가 길어 앞부분 ${MAX_CHARS.toLocaleString()}자만 분석합니다.` });

      let args = "";
      let lastSent = 0;
      const snapshot = () => {
        try {
          return args ? parsePartial(args) : null;
        } catch {
          return null;
        }
      };

      try {
        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-6.1-sol",
          max_completion_tokens: part === "requirements" ? 32000 : 16000,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.input_schema as unknown as Record<string, unknown>,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: tool.name } },
        });

        let finishReason: string | null = null;
        for await (const chunk of completion) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta?.tool_calls?.[0]?.function?.arguments;
          if (delta) {
            args += delta;
            const now = Date.now();
            if (now - lastSent > 700) {
              lastSent = now;
              send({ type: "progress", counts: countItems(snapshot()) });
            }
          }
          if (choice.finish_reason) finishReason = choice.finish_reason;
        }

        let data: unknown;
        try {
          data = JSON.parse(args);
        } catch {
          data = snapshot();
        }
        if (!data) throw new Error("모델이 분석 결과를 반환하지 않았습니다.");
        if (finishReason === "length") {
          send({ type: "warning", message: "출력 한도에 도달해 결과 일부가 잘렸을 수 있습니다. RFP를 나눠서 분석해 보세요." });
        }
        send({ type: "result", data });
      } catch (err) {
        const message =
          err instanceof OpenAI.APIError ? `OpenAI API 오류(${err.status}): ${err.message}` : String(err);
        const partial = snapshot();
        if (partial) send({ type: "result", data: partial, partial: true });
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
