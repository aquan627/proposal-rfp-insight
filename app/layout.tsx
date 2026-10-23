import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RFP Insight — 제안 RFP 분석",
  description: "RFP를 올리면 요구사항·AS-IS·갭분석·추진전략을 분석해 엑셀로 정리합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
