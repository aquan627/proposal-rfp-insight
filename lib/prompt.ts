import type { Part } from "./types";

const str = (description: string) => ({ type: "string", description });
const level = (description: string) => ({ type: "string", enum: ["상", "중", "하"], description });
const arr = (properties: Record<string, unknown>, description: string) => ({
  type: "array",
  description,
  items: { type: "object", properties, required: Object.keys(properties) },
});

export const REQ_CATEGORIES = [
  "ECR 시스템장비",
  "SFR 기능",
  "PER 성능",
  "SIR 인터페이스",
  "DAR 데이터",
  "TER 테스트",
  "SER 보안",
  "QUR 품질",
  "COR 제약사항",
  "PMR 프로젝트관리",
  "PSR 프로젝트지원",
  "기타",
];

export const TOOLS = {
  requirements: {
    name: "submit_requirements",
    description: "RFP에서 추출·분석한 요구사항 목록을 제출한다.",
    input_schema: {
      type: "object",
      properties: {
        requirements: arr(
          {
            id: str("RFP에 표기된 요구사항 고유번호(예: SFR-001). 없으면 분류약어-순번으로 부여"),
            category: { type: "string", enum: REQ_CATEGORIES, description: "요구사항 분류" },
            name: str("요구사항 명칭"),
            summary: str("세부내용 핵심 요약(1~2문장)"),
            priority: level("제안/평가 관점 중요도"),
            difficulty: level("구현 난이도"),
            response: str("제안사의 대응방안(구체적 기술·방법론, 1~2문장)"),
            risk: str("리스크 또는 발주처 확인 필요사항. 없으면 '-'"),
            source: str("RFP 내 근거 위치(페이지·장절·표 번호 등). 모르면 '-'"),
          },
          "RFP의 모든 요구사항. 누락 없이 RFP 순서대로",
        ),
      },
      required: ["requirements"],
    },
  },
  insight: {
    name: "submit_insight",
    description: "RFP 종합 분석 결과를 제출한다.",
    input_schema: {
      type: "object",
      properties: {
        overview: {
          type: "object",
          properties: {
            projectName: str("사업명"),
            client: str("발주기관"),
            period: str("사업기간"),
            budget: str("사업예산(VAT 포함 여부 명시)"),
            scope: str("사업범위 요약(3~5문장)"),
            evaluation: str("평가방식(기술:가격 비율, 협상에 의한 계약 등)"),
          },
          required: ["projectName", "client", "period", "budget", "scope", "evaluation"],
        },
        objectives: arr(
          {
            type: { type: "string", enum: ["목적", "목표", "기대효과"] },
            content: str("내용"),
            source: str("RFP 근거 위치 또는 '추론'"),
          },
          "사업 목적·목표·기대효과. 각 구분별 2개 이상",
        ),
        asis: arr(
          {
            area: str("영역(업무/시스템/인프라/데이터/조직 등)"),
            current: str("현황"),
            issue: str("문제점·이슈"),
            source: str("RFP 근거 위치 또는 '추론'"),
          },
          "AS-IS 현황 분석",
        ),
        gaps: arr(
          {
            area: str("영역"),
            asis: str("AS-IS"),
            tobe: str("TO-BE(RFP가 요구하는 목표 모습)"),
            gap: str("차이(Gap)"),
            action: str("Gap 해소방안"),
            reqIds: str("관련 요구사항 ID(쉼표 구분). 모르면 '-'"),
          },
          "AS-IS 대비 TO-BE 갭분석",
        ),
        benchmarks: arr(
          {
            target: str("벤치마킹 대상(기관·사례·솔루션)"),
            kind: { type: "string", enum: ["RFP 언급", "참고사례(검증필요)"] },
            content: str("주요 내용"),
            implication: str("본 사업 시사점"),
          },
          "벤치마킹. RFP에 언급된 사례 우선, 그 외 일반 지식 기반 사례는 반드시 '참고사례(검증필요)'로 표기",
        ),
        strategies: arr(
          {
            name: str("전략명(짧은 슬로건형)"),
            content: str("핵심 추진내용"),
            reqIds: str("연계 요구사항 ID"),
            differentiation: str("경쟁사 대비 차별화 포인트"),
            evalLink: str("연계 평가항목. 모르면 '-'"),
          },
          "제안 추진전략 3~6개",
        ),
        evaluation: arr(
          {
            category: str("평가부문(예: 전략 및 방법론)"),
            item: str("평가항목"),
            score: str("배점. 없으면 '-'"),
            response: str("제안서 대응 포인트"),
          },
          "기술평가 항목·배점. RFP에 없으면 빈 배열",
        ),
        questions: arr(
          {
            category: str("구분(범위/일정/기술/계약 등)"),
            question: str("발주처 질의 내용"),
            source: str("관련 RFP 위치"),
            reason: str("질의 사유(모호·상충·누락 등)"),
          },
          "제안설명회/질의응답용 발주처 확인 질의사항",
        ),
      },
      required: ["overview", "objectives", "asis", "gaps", "benchmarks", "strategies", "evaluation", "questions"],
    },
  },
} as const;

const SYSTEM = `당신은 한국 금융권·공공 SI 제안 경험이 풍부한 제안 PM이자 RFP 분석 전문가다.
원칙:
- 모든 출력은 한국어. 문장은 개조식으로 간결하게.
- RFP에 명시된 사실과 당신의 추론을 구분한다. 근거(source)에 RFP 위치를 적고, 추론이면 '추론'이라고 쓴다.
- RFP에 없는 수치·기관명·사례를 사실처럼 지어내지 않는다.
- 결과는 반드시 지정된 도구를 호출해 제출한다.`;

export function buildRequest(part: Part, rfpText: string, companyNote: string) {
  const tool = TOOLS[part];
  const task =
    part === "requirements"
      ? `아래 RFP의 요구사항을 빠짐없이 추출해 분석하라.
- RFP에 요구사항 고유번호가 있으면 그대로 사용하고, 요구사항 목록표가 없으면 본문에서 '~해야 한다', '~할 것' 등의 요구를 찾아 분류한다.
- 분류는 조달청 표준 요구사항 분류(ECR/SFR/PER/SIR/DAR/TER/SER/QUR/COR/PMR/PSR)를 따른다.
- 대응방안은 제안사 입장에서 구체적으로, 리스크에는 모호하거나 범위가 과도한 부분을 짚는다.`
      : `아래 RFP를 제안 준비 관점에서 종합 분석하라: 사업개요, 목적·목표·기대효과, AS-IS, 갭분석, 벤치마킹, 추진전략, 평가항목, 발주처 질의사항.
- 추진전략은 평가항목과 핵심 요구사항에 연결해 수주 가능성을 높이는 방향으로 도출한다.`;

  const note = companyNote.trim()
    ? `\n\n<제안사_정보>\n${companyNote.trim()}\n</제안사_정보>\n추진전략·차별화 포인트에 위 제안사 강점을 반영하라.`
    : "";

  return {
    system: SYSTEM,
    tool,
    userContent: `${task}${note}\n\n<rfp>\n${rfpText}\n</rfp>`,
  };
}
