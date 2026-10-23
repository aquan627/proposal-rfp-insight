"use client";

import { useMemo, useRef, useState } from "react";
import { extractText } from "@/lib/extract";
import { OVERVIEW_FIELDS, SHEETS } from "@/lib/columns";
import type { AnalysisResult, InsightResult, Part, Requirement } from "@/lib/types";

type FileItem = { name: string; size: number; text?: string; pages?: number; error?: string; loading?: boolean };
type PartState = { status: "idle" | "running" | "done" | "error"; counts?: Record<string, number>; message?: string };

const PART_LABEL: Record<Part, string> = { insight: "종합 분석 (개요·AS-IS·갭·전략 등)", requirements: "요구사항 분석" };
const COUNT_LABEL: Record<string, string> = {
  requirements: "요구사항", objectives: "목적·목표", asis: "AS-IS", gaps: "갭", benchmarks: "벤치마킹",
  strategies: "전략", evaluation: "평가항목", questions: "질의",
};

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pasted, setPasted] = useState("");
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const [parts, setParts] = useState<Record<Part, PartState>>({ insight: { status: "idle" }, requirements: { status: "idle" } });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult>({ insight: null, requirements: null });
  const [tab, setTab] = useState(SHEETS[1].id);
  const [q, setQ] = useState("");
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rfpText = useMemo(() => {
    const fromFiles = files
      .filter((f) => f.text)
      .map((f) => `===== 파일: ${f.name} =====\n${f.text}`)
      .join("\n\n");
    return [fromFiles, pasted.trim()].filter(Boolean).join("\n\n");
  }, [files, pasted]);

  const running = parts.insight.status === "running" || parts.requirements.status === "running";
  const loadingFiles = files.some((f) => f.loading);
  const hasResult = !!(result.insight || result.requirements);
  const title = result.insight?.overview?.projectName || files[0]?.name.replace(/\.[^.]+$/, "") || "RFP";

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list).map((f) => ({ file: f, item: { name: f.name, size: f.size, loading: true } as FileItem }));
    setFiles((prev) => [...prev, ...added.map((a) => a.item)]);
    await Promise.all(
      added.map(async ({ file, item }) => {
        let next: FileItem;
        try {
          const ex = await extractText(file);
          next = { ...item, loading: false, text: ex.text, pages: ex.pages };
          if (ex.text.replace(/\s|\[p\.\d+\]/g, "").length < 50)
            next.error = "텍스트가 거의 없습니다(스캔 이미지 PDF일 수 있음). OCR 후 다시 올려주세요.";
        } catch (e) {
          next = { ...item, loading: false, error: e instanceof Error ? e.message : String(e) };
        }
        setFiles((prev) => prev.map((p) => (p === item ? next : p)));
      }),
    );
  }

  async function runPart(part: Part) {
    setParts((p) => ({ ...p, [part]: { status: "running" } }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part, text: rfpText, companyNote: note }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `요청 실패 (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let errorMsg = "";
      let got = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "progress") setParts((p) => ({ ...p, [part]: { status: "running", counts: ev.counts } }));
          else if (ev.type === "warning") setWarnings((w) => [...w, `[${PART_LABEL[part]}] ${ev.message}`]);
          else if (ev.type === "error") errorMsg = ev.message;
          else if (ev.type === "result") {
            got = true;
            setResult((r) =>
              part === "requirements"
                ? { ...r, requirements: ((ev.data?.requirements ?? []) as Requirement[]) }
                : { ...r, insight: ev.data as InsightResult },
            );
          }
        }
      }
      if (errorMsg) throw new Error(got ? `${errorMsg} (부분 결과만 표시)` : errorMsg);
      if (!got) throw new Error("응답이 중간에 끊겼습니다. 다시 시도해 주세요.");
      setParts((p) => ({ ...p, [part]: { ...p[part], status: "done" } }));
    } catch (e) {
      setParts((p) => ({ ...p, [part]: { ...p[part], status: "error", message: e instanceof Error ? e.message : String(e) } }));
    }
  }

  function analyze() {
    setWarnings([]);
    setResult({ insight: null, requirements: null });
    runPart("insight");
    runPart("requirements");
  }

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, title }),
      });
      if (!res.ok) throw new Error("엑셀 생성 실패");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "RFP분석.xlsx");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setWarnings((w) => [...w, e instanceof Error ? e.message : String(e)]);
    } finally {
      setDownloading(false);
    }
  }

  const sheet = SHEETS.find((s) => s.id === tab)!;
  const rowsFor = (id: string) => {
    const s = SHEETS.find((x) => x.id === id)!;
    const src = (s.source === "requirements" ? { requirements: result.requirements } : result.insight) as Record<string, unknown> | null;
    return ((src?.[s.field] as Record<string, unknown>[] | undefined) ?? []);
  };
  const rows = rowsFor(tab).filter((r) => !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <header className="top">
        <div className="wrap">
          <h1>RFP Insight</h1>
          <span>제안 RFP 분석 → 요구사항·AS-IS·갭분석·추진전략 엑셀 정리</span>
        </div>
      </header>

      <main className="wrap">
        <div className="grid">
          <section className="panel">
            <h2><span className="step">1</span>RFP 입력</h2>
            <div
              className={`drop${over ? " over" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
            >
              <strong>파일을 끌어다 놓거나 클릭</strong>
              <div className="hint">PDF · HWPX · DOCX · TXT — 제안요청서 본문과 과업지시서 등 여러 개 가능</div>
              <input ref={inputRef} type="file" multiple hidden accept=".pdf,.hwpx,.hwp,.docx,.txt,.md"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>
            {files.length > 0 && (
              <ul className="files">
                {files.map((f, i) => (
                  <li key={i} className={f.error ? "bad" : ""}>
                    <span>
                      {f.loading && <span className="spin" />}
                      {f.name}
                      {f.error && <> — {f.error}</>}
                    </span>
                    <span className="meta">
                      {f.text && `${f.pages ? `${f.pages}p · ` : ""}${f.text.length.toLocaleString()}자`}
                      <button className="x" aria-label="삭제" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>×</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <label className="lbl">또는 텍스트 붙여넣기</label>
            <textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="RFP 본문 일부나 요구사항 표를 붙여넣어도 됩니다." />
          </section>

          <section className="panel">
            <h2><span className="step">2</span>제안사 정보 <span className="hint">(선택)</span></h2>
            <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={"추진전략·차별화에 반영할 강점\n예) 은행 차세대 지급결제 구축 3건 수행, 자체 정산 솔루션 보유, 금융보안원 인증 경험"} />
            <div className="actions">
              <button className="btn" disabled={!rfpText || running || loadingFiles} onClick={analyze}>
                {running ? "분석 중…" : "분석 시작"}
              </button>
              <span className="hint">{rfpText ? `입력 ${rfpText.length.toLocaleString()}자` : "RFP를 먼저 넣어주세요"}</span>
            </div>
            {(running || hasResult || parts.insight.status === "error" || parts.requirements.status === "error") && (
              <div className="prog" style={{ marginTop: 14 }}>
                {(["requirements", "insight"] as Part[]).map((p) => {
                  const st = parts[p];
                  const counts = Object.entries(st.counts ?? {}).filter(([, n]) => n > 0)
                    .map(([k, n]) => `${COUNT_LABEL[k] ?? k} ${n}`).join(" · ");
                  return (
                    <div className="row" key={p}>
                      <span className="name">{PART_LABEL[p]}</span>
                      <span className={`st ${st.status}`}>
                        {st.status === "running" && <><span className="spin" />{counts || "RFP 읽는 중"}</>}
                        {st.status === "done" && "완료"}
                        {st.status === "error" && "실패"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {(["requirements", "insight"] as Part[]).map((p) =>
              parts[p].status === "error" ? <div key={p} className="msg err">{PART_LABEL[p]}: {parts[p].message}</div> : null,
            )}
            {warnings.map((w, i) => <div key={i} className="msg warn">{w}</div>)}
          </section>
        </div>

        {hasResult && (
          <section className="panel result">
            <h2 style={{ justifyContent: "space-between" }}>
              <span><span className="step">3</span> 분석 결과</span>
              <button className="btn" disabled={running || downloading} onClick={download}>
                {downloading ? "생성 중…" : "엑셀 다운로드"}
              </button>
            </h2>

            {result.insight?.overview && (
              <dl className="ov">
                {OVERVIEW_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "scope" ? "wide" : ""}>
                    <dt>{f.label}</dt>
                    <dd>{(result.insight!.overview as unknown as Record<string, string>)[f.key] || "-"}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="tabs">
              {SHEETS.map((s) => (
                <button key={s.id} className={tab === s.id ? "on" : ""} onClick={() => setTab(s.id)}>
                  {s.title}<span className="n">{rowsFor(s.id).length}</span>
                </button>
              ))}
            </div>
            <div className="filter">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="표 안에서 검색" />
              {q && <span className="hint">{rows.length}건</span>}
            </div>
            <div className="tbl-wrap">
              {rows.length === 0 ? (
                <div className="empty">
                  {parts[sheet.source].status === "running" ? "분석 중입니다…" : "해당 항목이 없습니다."}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>No</th>{sheet.cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="no">{i + 1}</td>
                        {sheet.cols.map((c) => {
                          const v = String(r[c.key] ?? "");
                          const cls = (c.key === "priority" && v === "상") ? "hi" : (c.key === "kind" && v.includes("검증")) ? "chk" : "";
                          return <td key={c.key} className={cls}>{v}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        <footer>
          AI 분석 결과는 초안입니다. 특히 &lsquo;참고사례(검증필요)&rsquo;로 표시된 벤치마킹과 &lsquo;추론&rsquo; 근거 항목은 원문·출처를 반드시 확인하세요.
          업로드한 RFP 텍스트는 분석을 위해 OpenAI API로 전송되며, 이 앱은 저장하지 않습니다.
        </footer>
      </main>
    </>
  );
}
