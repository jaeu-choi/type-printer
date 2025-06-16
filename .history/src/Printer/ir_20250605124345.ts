// src/ir.ts
import 
/**
 * 🎯 완전한 중간 표현(IR) - TypeScript 타입 시스템의 모든 연산 과정을 추적
 */

/**
 * 메인 TypeNode - 모든 타입의 기본 구조
 */
export interface TypeNode {
  /** 노드 종류 식별자 */
  kind: TypeNodeKind;

  /** 타입 이름 (reference, primitive 등에서 사용) */
  name?: string;

  /** 리터럴 값 (primitive, literal 타입에서 사용) */
  literal?: string;

  /** 자식 노드들 (재귀 구조) */
  children?: TypeNode[];

  /** 제네릭 타입 인수들 */
  typeArguments?: TypeNode[];

  /** 객체 타입의 프로퍼티들 */
  objectMembers?: ObjectMember[];

  /** 배열 타입의 요소 타입 */
  elementType?: TypeNode;

  /** 인덱스 접근 타입의 키 타입 */
  indexKeyType?: TypeNode;

  // === 🆕 타입별 특화 정보 ===

  /** 조건부 타입 특화 정보 */
  conditionalInfo?: ConditionalTypeInfo;

  /** 템플릿 리터럴 타입 특화 정보 */
  templateLiteralInfo?: TemplateLiteralTypeInfo;

  /** 인덱스 액세스 타입 특화 정보 */
  indexAccessInfo?: IndexAccessTypeInfo;

  /** 함수 타입 특화 정보 */
  functionInfo?: FunctionTypeInfo;

  /** 매핑 타입 특화 정보 */
  mappingInfo?: MappingTypeInfo;

  // === 🆕 과정 추적 정보 ===

  /** 매핑 타입 순회 과정 단계들 */
  iterationSteps?: IterationStepNode[];

  /** 중간 계산 과정들 */
  intermediateSteps?: IntermediateStep[];

  /** 확장된 메타데이터 */
  metadata?: TypeNodeMetadata;
}

/** 타입 노드 종류 */
export type TypeNodeKind =
  | "primitive"
  | "literal"
  | "reference"
  | "union"
  | "intersection"
  | "array"
  | "object"
  | "function"
  | "conditional"
  | "mapped"
  | "template"
  | "indexAccess"
  | "operator"
  | "utility"
  | "unknown";

/** 객체 프로퍼티 */
export interface ObjectMember {
  key: string;
  node: TypeNode;
  optional?: boolean;
  readonly?: boolean;
}

// === 🎯 타입별 특화 정보 ===

/** 조건부 타입 정보 (T extends U ? X : Y) */
export interface ConditionalTypeInfo {
  /** 검사 대상 타입 (T) */
  checkType: TypeNode;

  /** 확장 조건 타입 (U) */
  extendsType: TypeNode;

  /** 조건이 참일 때 타입 (X) */
  trueType: TypeNode;

  /** 조건이 거짓일 때 타입 (Y) */
  falseType: TypeNode;

  /** 조건 평가 결과 (실제 런타임에서 결정됨) */
  resolved?: boolean;

  /** 조건 평가 과정 */
  evaluationProcess?: {
    condition: string;
    assignabilityCheck: boolean;
    reasoning: string;
  };
}

/** 템플릿 리터럴 타입 정보 */
export interface TemplateLiteralTypeInfo {
  /** 템플릿 구성 요소들 */
  parts: TypeNode[];

  /** 해결된 문자열 (가능한 경우) */
  resolvedString?: string;

  /** 템플릿 평가 과정 */
  evaluationSteps?: {
    step: number;
    part: string;
    resolved: string;
    description: string;
  }[];
}

/** 인덱스 액세스 타입 정보 (T[K]) */
export interface IndexAccessTypeInfo {
  /** 객체 타입 (T) */
  objectType: TypeNode;

  /** 인덱스 타입 (K) */
  indexType: TypeNode;

  /** 해결된 타입 */
  resolvedType: TypeNode;

  /** 액세스 과정 */
  accessProcess?: {
    objectKeys: string[];
    indexValue: string;
    matchingKey: string;
    resultType: string;
  };
}

/** 함수 타입 정보 */
export interface FunctionTypeInfo {
  /** 타입 매개변수들 */
  typeParameters?: TypeNode[];

  /** 매개변수들 */
  parameters: FunctionParameter[];

  /** 반환 타입 */
  returnType: TypeNode;

  /** 함수 시그니처 */
  signature?: string;
}

/** 함수 매개변수 */
export interface FunctionParameter {
  name: string;
  type: TypeNode;
  optional?: boolean;
  rest?: boolean;
}

/** 매핑 타입 정보 */
export interface MappingTypeInfo {
  /** 이터레이터 변수명 (K) */
  iteratorVar: string;

  /** 제약 조건 (keyof T) */
  constraint: TypeNode;

  /** 값 표현식 (T[K]) */
  valueExpression: TypeNode;

  /** 키 리매핑 정보 (as 절) */
  keyRemapping?: {
    enabled: boolean;
    expression: TypeNode;
  };

  /** 수정자들 */
  modifiers?: {
    readonly?: boolean;
    optional?: boolean;
  };
}

// === 🎯 과정 추적 정보 ===

/** 매핑 타입 순회 과정의 단일 단계 */
export interface IterationStepNode {
  /** 현재 순회 중인 키 */
  key: string;

  /** 단계 번호 */
  stepNumber: number;

  /** 이 단계에서 수행한 중간 계산들 */
  intermediateSteps?: {
    /** 이터레이터 할당 (K = "user") */
    iteratorAssignment?: TypeNode;

    /** 인덱스 액세스 (T[K]) */
    indexAccess?: TypeNode;

    /** 조건 검사 (T[K] extends object) */
    conditionCheck?: TypeNode;

    /** 템플릿 리터럴 (${K}.${K2}) */
    templateLiteral?: TypeNode;

    /** 키 리매핑 과정 */
    keyRemapping?: TypeNode;
  };

  /** 조건부 분기 결과 */
  conditionalBranch?: {
    condition: string;
    result: boolean;
    trueBranchNode?: TypeNode;
    falseBranchNode?: TypeNode;
    reasoning: string;
  };

  /** 중첩 매핑이 있는 경우 */
  nestedMapping?: {
    isNested: boolean;
    innerIterator?: string;
    innerSteps?: IterationStepNode[];
  };

  /** 단계별 메타데이터 */
  stepMetadata?: {
    description: string;
    originalKey: string;
    finalKeys: string[];
    processingTime?: number;
    complexity: "simple" | "conditional" | "nested";
  };
}

/** 일반적인 중간 계산 과정 */
export interface IntermediateStep {
  /** 단계 종류 */
  stepType: IntermediateStepType;

  /** 단계 설명 */
  description: string;

  /** 입력 */
  input: TypeNode;

  /** 출력 */
  output: TypeNode;

  /** 변환 과정 설명 */
  transformation: string;

  /** 단계 메타데이터 */
  metadata?: {
    operator?: string;
    condition?: string;
    reasoning?: string;
  };
}

/** 중간 단계 종류 */
export type IntermediateStepType =
  | "generic-resolution"
  | "index-access"
  | "conditional-evaluation"
  | "template-evaluation"
  | "union-distribution"
  | "intersection-merging"
  | "keyof-extraction"
  | "typeof-evaluation"
  | "utility-application";

// === 🎯 확장된 메타데이터 ===

/** 타입 노드 메타데이터 */
export interface TypeNodeMetadata {
  /** 원본 AST 텍스트 */
  originalText?: string;

  /** TypeChecker로 계산된 최종 타입 문자열 */
  finalTypeString?: string;

  /** 타입 인수들 */
  typeArgs?: string[];

  /** 참조 경로 (순환 참조 추적용) */
  referencePath?: string[];

  /** 원본 타입명 */
  originalTypeName?: string;

  /** 내장 타입 여부 */
  isBuiltin?: boolean;

  /** 제네릭 관련 정보 */
  genericInfo?: {
    isGeneric: boolean;
    isInstantiated: boolean;
    typeParameters?: string[];
    resolvedArguments?: string[];
  };

  /** 분석 방법 */
  analysisMethod?:
    | "ast-parsing"
    | "type-checker"
    | "generic-resolution"
    | "reverse-engineering"
    | "simulation";

  /** 성능 정보 */
  performance?: {
    analysisTime: number;
    memoryUsage?: number;
    cacheHit?: boolean;
  };

  /** 디버깅 정보 */
  debug?: {
    warnings: string[];
    fallbackUsed?: boolean;
    partialAnalysis?: boolean;
  };

  /** 사용자 정의 속성들 */
  [key: string]: any;
}

// === 🎯 헬퍼 타입들 ===

/** 타입 생성 컨텍스트 - 실용적 버전 */
export interface TypeCreationContext {
  /** TypeScript 타입 체커 */
  checker: ts.TypeChecker;

  /** TypeScript 프로그램 */
  program: ts.Program;

  /** 소스 파일 */
  sourceFile: ts.SourceFile;

  /** 현재 깊이 */
  depth: number;

  /** 최대 깊이 */
  maxDepth: number;

  /** 순환 참조 추적을 위한 참조 경로 */
  referencePath: string[];

  /** 제네릭 컨텍스트 */
  genericContext?: Map<string, TypeNode>;

  /** 현재 매핑 컨텍스트 */
  mappingContext?: {
    iteratorVar: string;
    iteratorValue: string;
    parentType: TypeNode;
  };

  /** 분석 옵션 */
  options?: {
    trackIntermediate: boolean;
    includeDebugInfo: boolean;
    expanded: boolean; // 명목적 과정 표시 여부
  };

  /** 제네릭 인스턴스화 여부 */
  isInstantiated?: boolean;
}

/**
 * 🔧 컨텍스트 생성 헬퍼
 */
export function createTypeCreationContext(
  checker: ts.TypeChecker,
  program: ts.Program,
  sourceFile: ts.SourceFile,
  options?: {
    maxDepth?: number;
    expanded?: boolean;
    includeDebugInfo?: boolean;
  }
): TypeCreationContext {
  return {
    checker,
    program,
    sourceFile,
    depth: 0,
    maxDepth: options?.maxDepth || 10,
    referencePath: [],
    options: {
      trackIntermediate: true,
      includeDebugInfo: options?.includeDebugInfo || false,
      expanded: options?.expanded || false,
    },
  };
}

/**
 * 🔧 컨텍스트 복사 (깊이 증가)
 */
export function createChildContext(
  parent: TypeCreationContext,
  typeName?: string
): TypeCreationContext {
  return {
    ...parent,
    depth: parent.depth + 1,
    referencePath: typeName
      ? [...parent.referencePath, typeName]
      : parent.referencePath,
  };
}

/**
 * 🔧 제네릭 컨텍스트 추가
 */
export function createGenericContext(
  parent: TypeCreationContext,
  genericBindings: Map<string, TypeNode>
): TypeCreationContext {
  return {
    ...parent,
    genericContext: new Map([
      ...(parent.genericContext || []),
      ...genericBindings,
    ]),
  };
}

// === 🔧 TypeNodeUtils 인터페이스 수정 (복잡도 제거) ===

/** 타입 노드 유틸리티 */
export interface TypeNodeUtils {
  /** 타입 노드가 특정 종류인지 확인 */
  isKind(node: TypeNode, kind: TypeNodeKind): boolean;

  /** 타입 노드를 문자열로 변환 */
  stringify(node: TypeNode): string;

  /** 타입 노드 깊은 복사 */
  clone(node: TypeNode): TypeNode;

  /** 타입 노드 비교 */
  equals(a: TypeNode, b: TypeNode): boolean;

  /** 메타데이터 병합 */
  mergeMetadata(
    target: TypeNodeMetadata,
    source: TypeNodeMetadata
  ): TypeNodeMetadata;
}

// === 🔧 TypeNodeMetadata 수정 (복잡도 제거) ===

/** 타입 노드 메타데이터 */
export interface TypeNodeMetadata {
  /** 원본 AST 텍스트 */
  originalText?: string;

  /** TypeChecker로 계산된 최종 타입 문자열 */
  finalTypeString?: string;

  /** 타입 인수들 */
  typeArgs?: string[];

  /** 참조 경로 (순환 참조 추적용) */
  referencePath?: string[];

  /** 원본 타입명 */
  originalTypeName?: string;

  /** 내장 타입 여부 */
  isBuiltin?: boolean;

  /** 제네릭 관련 정보 */
  genericInfo?: {
    isGeneric: boolean;
    isInstantiated: boolean;
    typeParameters?: string[];
    resolvedArguments?: string[];
  };

  /** 분석 방법 */
  analysisMethod?:
    | "ast-parsing"
    | "type-checker"
    | "generic-resolution"
    | "reverse-engineering"
    | "simulation";

  /** 성능 정보 */
  performance?: {
    analysisTime: number;
    memoryUsage?: number;
    cacheHit?: boolean;
  };

  /** 디버깅 정보 */
  debug?: {
    warnings: string[];
    fallbackUsed?: boolean;
    partialAnalysis?: boolean;
  };

  /** 사용자 정의 속성들 */
  [key: string]: any;
}

/** 타입 노드 생성 헬퍼 */
export interface TypeNodeFactory {
  createPrimitive(
    literal: string,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createReference(
    name: string,
    typeArgs?: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createUnion(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createIntersection(
    members: TypeNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createArray(
    elementType: TypeNode,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createObject(
    members: ObjectMember[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createConditional(
    info: ConditionalTypeInfo,
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
  createMapped(
    info: MappingTypeInfo,
    iterations?: IterationStepNode[],
    metadata?: Partial<TypeNodeMetadata>
  ): TypeNode;
}

/** 타입 노드 유틸리티 */
export interface TypeNodeUtils {
  /** 타입 노드가 특정 종류인지 확인 */
  isKind(node: TypeNode, kind: TypeNodeKind): boolean;

  /** 타입 노드의 복잡도 계산 */

  /** 타입 노드를 문자열로 변환 */
  stringify(node: TypeNode): string;

  /** 타입 노드 깊은 복사 */
  clone(node: TypeNode): TypeNode;

  /** 타입 노드 비교 */
  equals(a: TypeNode, b: TypeNode): boolean;

  /** 메타데이터 병합 */
  mergeMetadata(
    target: TypeNodeMetadata,
    source: TypeNodeMetadata
  ): TypeNodeMetadata;
}

// === 🎯 확장 포인트 ===

/** 사용자 정의 타입 노드 확장 */
export interface CustomTypeNodeExtension {
  /** 사용자 정의 종류 */
  customKind?: string;

  /** 사용자 정의 데이터 */
  customData?: Record<string, any>;

  /** 사용자 정의 처리 함수 */
  customProcessor?: (node: TypeNode, context: TypeCreationContext) => TypeNode;
}
