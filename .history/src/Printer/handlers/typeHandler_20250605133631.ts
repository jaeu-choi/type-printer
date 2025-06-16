// src/handlers/interface.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";

/**
 * 🎯 모든 핸들러의 기본 계약
 *
 * TypeScript의 ts.Type을 IR의 TypeNode로 변환하는 핵심 인터페이스입니다.
 * 모든 구체적 핸들러는 이 인터페이스를 구현해야 합니다.
 */
export interface TypeHandler {
  /**
   * 이 핸들러가 주어진 타입을 처리할 수 있는지 확인
   *
   * @param type - TypeScript 타입 객체
   * @param node - (선택적) AST 노드 정보
   * @returns 처리 가능하면 true, 불가능하면 false
   *
   * @example
   * ```typescript
   * isApplicable(type: ts.Type): boolean {
   *   return !!(type.flags & ts.TypeFlags.String);
   * }
   * ```
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean;

  /**
   * TypeScript 타입을 IR의 TypeNode로 변환
   *
   * @param type - 변환할 TypeScript 타입
   * @param node - (선택적) AST 노드 정보
   * @param context - 타입 생성 컨텍스트
   * @returns IR TypeNode 객체
   *
   * @example
   * ```typescript
   * createTypeNode(type: ts.Type, node?: ts.TypeNode, context?: TypeCreationContext): TypeNode {
   *   return {
   *     kind: "primitive",
   *     literal: context?.checker.typeToString(type) || "unknown",
   *     metadata: { ... }
   *   };
   * }
   * ```
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode;

  /**
   * 핸들러 우선순위 (낮을수록 먼저 처리)
   *
   * 기본값: 100
   * 권장 범위:
   * - 10-30: 높은 우선순위 (primitive, literal)
   * - 50-70: 중간 우선순위 (reference, array)
   * - 80-100: 낮은 우선순위 (complex types)
   * - 999: Fallback 핸들러
   */
  readonly priority?: number;

  /**
   * 핸들러 이름 (디버깅 및 로깅용)
   *
   * 명명 규칙: "TypeNameHandler" (예: "PrimitiveTypeHandler")
   */
  readonly name: string;
}

/**
 * 🎯 핸들러 구현시 사용할 수 있는 타입 별칭들
 */

/** 핸들러 우선순위 상수 */
export const HandlerPriority = {
  /** 가장 높은 우선순위 - primitive, literal 타입 */
  HIGHEST: 10,

  /** 높은 우선순위 - 기본 타입들 */
  HIGH: 30,

  /** 중간 우선순위 - reference, array 등 */
  MEDIUM: 50,

  /** 낮은 우선순위 - union, intersection 등 */
  LOW: 70,

  /** 가장 낮은 우선순위 - complex 타입들 */
  LOWEST: 90,

  /** Fallback 핸들러 */
  FALLBACK: 999,
} as const;

/**
 * 🎯 핸들러 구현 예시 (참고용)
 */
export interface ExampleHandler extends TypeHandler {
  // 실제 구현은 구체적 핸들러에서 수행
}

/**
 * 🔧 타입 가드 함수들 (핸들러 구현시 유용)
 */

/**
 * TypeHandler 타입 가드
 */
export function isTypeHandler(obj: any): obj is TypeHandler {
  return (
    obj &&
    typeof obj.isApplicable === "function" &&
    typeof obj.createTypeNode === "function" &&
    typeof obj.name === "string"
  );
}

/**
 * TypeNode 유효성 검사
 */
export function isValidTypeNode(obj: any): obj is TypeNode {
  return (
    obj &&
    typeof obj.kind === "string" &&
    (obj.kind === "primitive" ||
      obj.kind === "literal" ||
      obj.kind === "reference" ||
      obj.kind === "union" ||
      obj.kind === "intersection" ||
      obj.kind === "array" ||
      obj.kind === "object" ||
      obj.kind === "function" ||
      obj.kind === "conditional" ||
      obj.kind === "mapped" ||
      obj.kind === "template" ||
      obj.kind === "indexAccess" ||
      obj.kind === "operator" ||
      obj.kind === "utility" ||
      obj.kind === "unknown")
  );
}
