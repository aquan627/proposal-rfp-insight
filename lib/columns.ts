export interface Col {
  key: string;
  label: string;
  width: number; // excel width (chars)
}

export interface SheetDef {
  id: string;
  title: string;
  source: "requirements" | "insight";
  field: string; // array field name in the result
  cols: Col[];
}

export const SHEETS: SheetDef[] = [
  {
    id: "objectives",
    title: "목적·목표·기대효과",
    source: "insight",
    field: "objectives",
    cols: [
      { key: "type", label: "구분", width: 10 },
      { key: "content", label: "내용", width: 80 },
      { key: "source", label: "근거", width: 20 },
    ],
  },
  {
    id: "requirements",
    title: "요구사항 분석",
    source: "requirements",
    field: "requirements",
    cols: [
      { key: "id", label: "요구사항 ID", width: 13 },
      { key: "category", label: "분류", width: 15 },
      { key: "name", label: "요구사항명", width: 26 },
      { key: "summary", label: "세부내용 요약", width: 50 },
      { key: "priority", label: "중요도", width: 8 },
      { key: "difficulty", label: "난이도", width: 8 },
      { key: "response", label: "대응방안", width: 50 },
      { key: "risk", label: "리스크·확인사항", width: 36 },
      { key: "source", label: "근거", width: 14 },
    ],
  },
  {
    id: "asis",
    title: "AS-IS 현황",
    source: "insight",
    field: "asis",
    cols: [
      { key: "area", label: "영역", width: 16 },
      { key: "current", label: "현황", width: 55 },
      { key: "issue", label: "문제점·이슈", width: 55 },
      { key: "source", label: "근거", width: 16 },
    ],
  },
  {
    id: "gaps",
    title: "갭분석",
    source: "insight",
    field: "gaps",
    cols: [
      { key: "area", label: "영역", width: 16 },
      { key: "asis", label: "AS-IS", width: 38 },
      { key: "tobe", label: "TO-BE", width: 38 },
      { key: "gap", label: "Gap", width: 34 },
      { key: "action", label: "해소방안", width: 42 },
      { key: "reqIds", label: "관련 요구사항", width: 18 },
    ],
  },
  {
    id: "benchmarks",
    title: "벤치마킹",
    source: "insight",
    field: "benchmarks",
    cols: [
      { key: "target", label: "대상", width: 24 },
      { key: "kind", label: "출처구분", width: 18 },
      { key: "content", label: "주요 내용", width: 55 },
      { key: "implication", label: "시사점", width: 50 },
    ],
  },
  {
    id: "strategies",
    title: "추진전략",
    source: "insight",
    field: "strategies",
    cols: [
      { key: "name", label: "전략명", width: 26 },
      { key: "content", label: "핵심 추진내용", width: 55 },
      { key: "reqIds", label: "연계 요구사항", width: 20 },
      { key: "differentiation", label: "차별화 포인트", width: 45 },
      { key: "evalLink", label: "연계 평가항목", width: 22 },
    ],
  },
  {
    id: "evaluation",
    title: "평가항목",
    source: "insight",
    field: "evaluation",
    cols: [
      { key: "category", label: "평가부문", width: 20 },
      { key: "item", label: "평가항목", width: 40 },
      { key: "score", label: "배점", width: 8 },
      { key: "response", label: "대응 포인트", width: 60 },
    ],
  },
  {
    id: "questions",
    title: "질의사항",
    source: "insight",
    field: "questions",
    cols: [
      { key: "category", label: "구분", width: 12 },
      { key: "question", label: "질의 내용", width: 60 },
      { key: "source", label: "관련 RFP 위치", width: 18 },
      { key: "reason", label: "질의 사유", width: 36 },
    ],
  },
];

export const OVERVIEW_FIELDS: { key: string; label: string }[] = [
  { key: "projectName", label: "사업명" },
  { key: "client", label: "발주기관" },
  { key: "period", label: "사업기간" },
  { key: "budget", label: "사업예산" },
  { key: "evaluation", label: "평가방식" },
  { key: "scope", label: "사업범위" },
];
