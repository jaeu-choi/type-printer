import * as 
export interface PrintOptions {
  expanded?: boolean; // true: 명목적 과정 + 참조 추적 표시, false: 최종 결과만
  verbose?: boolean;
  final?: boolean;
  format?: "tree" | "compact" | "expanded";
  maxDepth?: number;
  mappedAnalysis?: {
    enabled: boolean; // 매핑 분석 모드 활성화
    pattern: string; // 매핑 타입명 (예: "TranslateKeys")
    typeArgs: string[]; // 타입 인자들 (예: ["From", "To"])
  };
}

export enum AnalyzableKind {
  TYPEALIAS = "TYPEALIAS",
  INTERFACE = "INTERFACE",
  VARIABLE = "VARIABLE",
  FUNCTION = "FUNCTION",
  UNKNOWN = "UNKNOWN",
  ENUM = "ENUM",
  CLASS = "CLASS",
}

export interface TypeStructure {
  type:
    | "primitive"
    | "union"
    | "intersection"
    | "array"
    | "reference"
    | "literal"
    | "object"
    | "operator"
    | "access"
    | "conditional"
    | "mapped"
    | "template"
    | "function";
  name?: string;
  value?: string;
  children?: TypeStructure[]; // 명목적 과정 (expanded 모드에서만 사용)
  properties?: ObjectProperty[];
  computedResult?: TypeStructure; // 최종 계산 결과 (기본 표시용)
  metadata?: {
    isBuiltin?: boolean;
    typeArgs?: string[];
    originalText?: string;
    operator?: string;
    condition?: string;
    referencePath?: string[];
    originalTypeName?: string;
    finalTypeString?: string; // TypeChecker로 계산된 최종 타입 문자열
    [key: string]: any;
    skipRecomputation?: boolean;
  };
}

export interface ObjectProperty {
  name: string;
  type: TypeStructure;
  optional?: boolean;
  readonly?: boolean;
}

export interface TypeInfo {
  kind: AnalyzableKind;
  name: string;
  originalSource: string;
  structure: TypeStructure;
}

export interface TypeCollectionContext {
  checker: import("typescript").TypeChecker;
  program: import("typescript").Program;
  depth: number;
  maxDepth: number;
  referencePath: string[];
  genericContext?: Map<string, TypeStructure>;
  isInstantiated: boolean;
  sourceFile: import("typescript").SourceFile;
  expanded: boolean; // 명목적 과정 표시 여부
}

export interface TypeHandler {
  canHandle(node: import("typescript").TypeNode): boolean;
  handle(
    node: import("typescript").TypeNode,
    context: TypeCollectionContext
  ): TypeStructure;
}

interface MappingAnalysisResult {
  mappedTypeName: string;
  typeArgs: string[];
  pattern: MappingPattern;
  finalResult: FinalMappingResult;
  keyAnalysis: KeyAnalysis[];
  iterations: any[]; // 포맷터를 위한 이터레이션 구조
  metadata: {
    analysisMethod: string;
    totalKeys: number;
    hasConditionalLogic: boolean;
    hasKeyRemapping: boolean;
  };
}

interface MappingPattern {
  iteratorVar: string;
  constraint: ts.TypeNode;
  valueExpression: ts.TypeNode;
  conditionalExpression: ts.ConditionalTypeNode | null;
  hasKeyRemapping: boolean;
}

interface FinalMappingResult {
  finalType: ts.Type;
  finalTypeString: string;
  resultStructure: TypeStructure;
  isUnion: boolean;
  properties: Array<{ name: string; type: ts.Type }>;
}

interface KeyAnalysis {
  originalKey: string;
  finalKeys: string[];
  steps: MappingStep[];
  hasConditionalBranch: boolean;
  hasNestedMapping: boolean;
  metadata: {
    sourceType: string;
    analysisMethod: string;
  };
}

interface MappingStep {
  stepType:
    | "iterator-assignment"
    | "index-access"
    | "conditional-evaluation"
    | "nested-mapping"
    | "final-mapping";
  description: string;
  expression: string;
  result: TypeStructure;
}

interface ConditionalEvaluationResult {
  condition: string;
  result: boolean;
  selectedBranch: "true" | "false";
  branchResult: TypeStructure;
  nestedMapping: any | null;
}
