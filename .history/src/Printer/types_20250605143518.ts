// src/types.ts

import { TypeNode, TypeCreationContext } from "./ir";

/**
 * 🎯 IR 시스템 기반으로 재설계된 타입 정의들
 *
 * 주요 변경사항:
 * - TypeStructure → TypeNode (IR) 사용
 * - TypeCollectionContext → TypeCreationContext 사용
 * - 기존 레거시 타입들 정리
 */

// ==============================
// 🎯 출력 옵션
// ==============================

export interface PrintOptions {
  /** 확장 모드 - 명목적 과정 + 참조 추적 표시 */
  expanded?: boolean;

  /** 상세 출력 모드 */
  verbose?: boolean;

  /** 최종 결과만 표시 */
  final?: boolean;

  /** 출력 형식 */
  format?: "tree" | "compact" | "expanded";

  /** 최대 깊이 */
  maxDepth?: number;

  /** 🆕 IR 기반 고급 분석 옵션 */
  advanced?: {
    /** 중간 단계 추적 */
    trackIntermediateSteps?: boolean;

    /** 성능 정보 포함 */
    includePerformanceInfo?: boolean;

    /** 매핑 타입 이터레이션 분석 */
    analyzeMappingIterations?: boolean;

    /** 조건부 타입 분기 추적 */
    traceConditionalBranches?: boolean;
  };

  /** 🔧 디버깅 옵션 */
  debug?: {
    /** 핸들러 정보 표시 */
    showHandlerInfo?: boolean;

    /** 타입 플래그 정보 표시 */
    showTypeFlags?: boolean;

    /** 메타데이터 전체 표시 */
    showFullMetadata?: boolean;
  };

  /** 🎨 출력 스타일링 */
  styling?: {
    /** 색상 사용 여부 */
    useColors?: boolean;

    /** 들여쓰기 크기 */
    indentSize?: number;

    /** 최대 줄 길이 */
    maxLineLength?: number;
  };
}

// ==============================
// 🎯 분석 가능한 타입 종류
// ==============================

export enum AnalyzableKind {
  TYPEALIAS = "TYPEALIAS",
  INTERFACE = "INTERFACE",
  VARIABLE = "VARIABLE",
  FUNCTION = "FUNCTION",
  UNKNOWN = "UNKNOWN",
  ENUM = "ENUM",
  CLASS = "CLASS",
}

// ==============================
// 🎯 메인 타입 정보 (IR 기반)
// ==============================

/**
 * 🎯 분석된 타입 정보 - 이제 IR 기반
 */
export interface TypeInfo {
  /** 타입 종류 */
  kind: AnalyzableKind;

  /** 타입 이름 */
  name: string;

  /** 원본 소스 코드 */
  originalSource: string;

  /** 🆕 IR 기반 타입 구조 */
  structure: TypeNode;

  /** 🆕 분석 메타데이터 */
  analysisInfo?: {
    /** 분석에 사용된 핸들러 */
    handlerUsed?: string;

    /** 분석 시간 (ms) */
    analysisTime?: number;

    /** 분석 깊이 */
    depth?: number;

    /** 경고 메시지들 */
    warnings?: string[];
  };
}

// ==============================
// 🔧 유틸리티 타입들
// ==============================

/**
 * 타입 분석 결과
 */
export interface TypeAnalysisResult {
  /** 성공 여부 */
  success: boolean;

  /** 타입 정보 (성공시) */
  typeInfo?: TypeInfo;

  /** 에러 정보 (실패시) */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  /** 분석 통계 */
  stats?: {
    totalTime: number;
    handlersUsed: string[];
    nodesCreated: number;
  };
}

/**
 * 포맷팅 결과
 */
export interface FormattingResult {
  /** 포맷된 텍스트 */
  formattedText: string;

  /** 사용된 포맷터 */
  formatterUsed: string;

  /** 포맷팅 옵션 */
  optionsUsed: PrintOptions;

  /** 통계 정보 */
  stats?: {
    lineCount: number;
    characterCount: number;
    formattingTime: number;
  };
}

// ==============================
// 🎯 핸들러 관련 타입들
// ==============================

/**
 * 핸들러 사용 통계
 */
export interface HandlerUsageStats {
  /** 핸들러 이름 */
  handlerName: string;

  /** 사용 횟수 */
  usageCount: number;

  /** 성공 횟수 */
  successCount: number;

  /** 실패 횟수 */
  failureCount: number;

  /** 평균 처리 시간 */
  averageProcessingTime: number;
}

/**
 * 시스템 상태 정보
 */
export interface SystemStatus {
  /** 초기화 여부 */
  initialized: boolean;

  /** 등록된 핸들러 수 */
  handlerCount: number;

  /** 핸들러 목록 */
  handlers: Array<{
    name: string;
    priority: number;
    status: "active" | "inactive" | "error";
  }>;

  /** 메모리 사용량 */
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

// ==============================
// 🔧 타입 가드 함수들
// ==============================

/**
 * TypeInfo 타입 가드
 */
export function isTypeInfo(obj: any): obj is TypeInfo {
  return (
    obj &&
    typeof obj.kind === "string" &&
    typeof obj.name === "string" &&
    typeof obj.originalSource === "string" &&
    obj.structure &&
    typeof obj.structure.kind === "string"
  );
}

/**
 * TypeAnalysisResult 타입 가드
 */
export function isSuccessfulAnalysis(
  result: TypeAnalysisResult
): result is TypeAnalysisResult & { typeInfo: TypeInfo } {
  return result.success && !!result.typeInfo;
}

/**
 * 특정 타입 종류인지 확인
 */
export function isOfKind(typeInfo: TypeInfo, kind: AnalyzableKind): boolean {
  return typeInfo.kind === kind;
}

// ==============================
// 🔧 옵션 헬퍼 함수들
// ==============================

/**
 * 기본 출력 옵션 생성
 */
export function createDefaultPrintOptions(): PrintOptions {
  return {
    expanded: false,
    verbose: false,
    final: false,
    format: "tree",
    maxDepth: 10,
    advanced: {
      trackIntermediateSteps: false,
      includePerformanceInfo: false,
      analyzeMappingIterations: false,
      traceConditionalBranches: false,
    },
    debug: {
      showHandlerInfo: false,
      showTypeFlags: false,
      showFullMetadata: false,
    },
    styling: {
      useColors: true,
      indentSize: 2,
      maxLineLength: 100,
    },
  };
}

/**
 * 확장된 출력 옵션 생성
 */
export function createExpandedPrintOptions(): PrintOptions {
  return {
    ...createDefaultPrintOptions(),
    expanded: true,
    verbose: true,
    advanced: {
      trackIntermediateSteps: true,
      includePerformanceInfo: true,
      analyzeMappingIterations: true,
      traceConditionalBranches: true,
    },
  };
}

/**
 * 디버그 출력 옵션 생성
 */
export function createDebugPrintOptions(): PrintOptions {
  return {
    ...createExpandedPrintOptions(),
    debug: {
      showHandlerInfo: true,
      showTypeFlags: true,
      showFullMetadata: true,
    },
  };
}

/**
 * 옵션 병합 헬퍼
 */
export function mergePrintOptions(
  base: PrintOptions,
  override: Partial<PrintOptions>
): PrintOptions {
  return {
    ...base,
    ...override,
    advanced: {
      ...base.advanced,
      ...override.advanced,
    },
    debug: {
      ...base.debug,
      ...override.debug,
    },
    styling: {
      ...base.styling,
      ...override.styling,
    },
  };
}

// ==============================
// 🗑️ 레거시 타입들 (제거 예정)
// ==============================

/**
 * @deprecated TypeStructure는 더 이상 사용되지 않습니다. TypeNode를 사용하세요.
 */
export interface LegacyTypeStructure {
  type: string;
  // 레거시 호환성을 위해 남겨둠
}

/**
 * @deprecated TypeCollectionContext는 더 이상 사용되지 않습니다. TypeCreationContext를 사용하세요.
 */
export interface LegacyTypeCollectionContext {
  // 레거시 호환성을 위해 남겨둠
}

// ==============================
// 🎯 상수 정의
// ==============================

/**
 * 시스템 상수들
 */
export const TypeSystemConstants = {
  /** 기본 최대 깊이 */
  DEFAULT_MAX_DEPTH: 10,

  /** 기본 들여쓰기 크기 */
  DEFAULT_INDENT_SIZE: 2,

  /** 기본 최대 줄 길이 */
  DEFAULT_MAX_LINE_LENGTH: 100,

  /** 핸들러 우선순위 범위 */
  HANDLER_PRIORITY_RANGE: {
    MIN: 1,
    MAX: 999,
  },

  /** 지원되는 출력 형식들 */
  SUPPORTED_FORMATS: ["tree", "compact", "expanded"] as const,
} as const;
