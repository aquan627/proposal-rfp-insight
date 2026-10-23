"use client";

export interface Extracted {
  text: string;
  pages?: number;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

async function fromPdf(buf: ArrayBuffer): Promise<Extracted> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = text as string[];
  return {
    pages: totalPages,
    text: pages.map((t, i) => `[p.${i + 1}]\n${t.trim()}`).join("\n\n"),
  };
}

async function fromDocx(buf: ArrayBuffer): Promise<Extracted> {
  // @ts-expect-error - browser bundle has no type declarations
  const mammoth = (await import("mammoth/mammoth.browser")).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return { text: value };
}

async function fromHwpx(buf: ArrayBuffer): Promise<Extracted> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const sections = Object.keys(zip.files)
    .filter((n) => /^Contents\/section\d+\.xml$/i.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (!sections.length) throw new Error("HWPX 본문을 찾지 못했습니다.");
  const parts: string[] = [];
  for (const name of sections) {
    const xml = await zip.file(name)!.async("string");
    const text = xml
      .replace(/<hp:tab[^>]*\/>/g, "\t")
      .replace(/<hp:lineBreak[^>]*\/>/g, "\n")
      .replace(/<\/hp:p>/g, "\n")
      .replace(/<\/hp:tc>/g, " | ")
      .replace(/<[^>]+>/g, "");
    parts.push(decode(text));
  }
  return { text: parts.join("\n").replace(/\n{3,}/g, "\n\n") };
}

export async function extractText(file: File): Promise<Extracted> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buf = await file.arrayBuffer();
  switch (ext) {
    case "pdf":
      return fromPdf(buf);
    case "docx":
      return fromDocx(buf);
    case "hwpx":
      return fromHwpx(buf);
    case "txt":
    case "md":
      return { text: new TextDecoder().decode(buf) };
    case "hwp":
      throw new Error("HWP(구버전)는 직접 읽을 수 없습니다. 한글에서 PDF 또는 HWPX로 저장 후 올려주세요.");
    default:
      throw new Error(`지원하지 않는 형식입니다: .${ext} (PDF, HWPX, DOCX, TXT 지원)`);
  }
}
