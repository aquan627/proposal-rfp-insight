export type Level = "상" | "중" | "하";

export interface Requirement {
  id: string;
  category: string;
  name: string;
  summary: string;
  priority: Level;
  difficulty: Level;
  response: string;
  risk: string;
  source: string;
}

export interface Overview {
  projectName: string;
  client: string;
  period: string;
  budget: string;
  scope: string;
  evaluation: string;
}

export interface Objective {
  type: "목적" | "목표" | "기대효과";
  content: string;
  source: string;
}

export interface AsIs {
  area: string;
  current: string;
  issue: string;
  source: string;
}

export interface Gap {
  area: string;
  asis: string;
  tobe: string;
  gap: string;
  action: string;
  reqIds: string;
}

export interface Benchmark {
  target: string;
  kind: "RFP 언급" | "참고사례(검증필요)";
  content: string;
  implication: string;
}

export interface Strategy {
  name: string;
  content: string;
  reqIds: string;
  differentiation: string;
  evalLink: string;
}

export interface EvalItem {
  category: string;
  item: string;
  score: string;
  response: string;
}

export interface Question {
  category: string;
  question: string;
  source: string;
  reason: string;
}

export interface InsightResult {
  overview: Overview;
  objectives: Objective[];
  asis: AsIs[];
  gaps: Gap[];
  benchmarks: Benchmark[];
  strategies: Strategy[];
  evaluation: EvalItem[];
  questions: Question[];
}

export interface AnalysisResult {
  insight: InsightResult | null;
  requirements: Requirement[] | null;
}

export type Part = "insight" | "requirements";
