# RFP Insight — 제안 RFP 분석기

RFP(제안요청서)를 올리면 Claude가 제안 준비에 필요한 분석을 수행하고 엑셀로 정리합니다.

## 분석 항목 (엑셀 시트)

| 시트 | 내용 |
|---|---|
| 요약 | 사업개요(사업명·발주기관·기간·예산·평가방식·범위), 요구사항 분류별 건수 |
| 목적·목표·기대효과 | 구분 / 내용 / RFP 근거 |
| 요구사항 분석 | ID, 조달청 표준 분류(SFR·PER·SER…), 요약, 중요도·난이도, 대응방안, 리스크·확인사항 |
| AS-IS 현황 | 영역 / 현황 / 문제점 |
| 갭분석 | AS-IS → TO-BE, Gap, 해소방안, 관련 요구사항 |
| 벤치마킹 | RFP 언급 사례 / 참고사례(검증필요) 구분 |
| 추진전략 | 전략명, 핵심내용, 연계 요구사항·평가항목, 차별화 포인트 |
| 평가항목 | 기술평가 항목·배점·대응 포인트 |
| 질의사항 | 제안설명회·질의응답용 발주처 확인 사항 |

## 입력 형식

PDF(텍스트 PDF), HWPX, DOCX, TXT, 텍스트 붙여넣기. 여러 파일(본문+과업지시서 등)을 함께 올릴 수 있습니다.
- HWP(구버전)는 한글에서 PDF 또는 HWPX로 저장 후 업로드
- 스캔 이미지 PDF는 OCR 후 업로드

텍스트 추출은 브라우저에서 수행하고, 추출된 텍스트만 서버를 거쳐 Claude API로 전송합니다. 앱은 데이터를 저장하지 않습니다.

## 배포 (Vercel)

1. Vercel에서 이 저장소를 Import
2. Environment Variables에 `ANTHROPIC_API_KEY` 등록 (선택: `ANTHROPIC_MODEL`, 기본 `claude-sonnet-5-5`)
3. Deploy

분석 API는 최대 300초 실행(`maxDuration = 300`)으로 설정되어 있습니다. 요구사항이 매우 많은 RFP는 출력 한도에 걸릴 수 있으니 파일을 나눠 분석하세요.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # API 키 입력
npm run dev
```

## 구조

```
app/page.tsx              UI (업로드·진행상태·결과 표·엑셀 다운로드)
app/api/analyze/route.ts  Claude 호출 (종합분석 / 요구사항 병렬, tool use 구조화 출력, NDJSON 스트리밍)
app/api/excel/route.ts    exceljs로 서식 적용된 xlsx 생성
lib/prompt.ts             시스템 프롬프트·출력 스키마
lib/extract.ts            PDF(unpdf)·DOCX(mammoth)·HWPX(jszip) 텍스트 추출
lib/columns.ts            시트/표 컬럼 정의
```

## 실업무 적용 시

고객사 RFP·내부 자료는 외부 API 전송이 제한될 수 있습니다. `app/api/analyze/route.ts`의 Claude 호출부를 사내 폐쇄형 LLM 엔드포인트(Amazon Bedrock·Google Vertex AI의 Claude 또는 사내 모델)로 교체하면 동일한 UI·엑셀 출력을 그대로 쓸 수 있습니다.
