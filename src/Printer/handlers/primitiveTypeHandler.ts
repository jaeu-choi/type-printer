// src/handlers/primitiveTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";

/**
 * 🎯 원시 타입 핸들러
 *
 * TypeScript의 기본 원시 타입들을 처리합니다:
 * - string, number, boolean
 * - bigint, symbol
 * - any, unknown, never, void
 * - null, undefined
 */
export class PrimitiveTypeHandler extends BaseTypeHandler {
  readonly name = "PrimitiveTypeHandler";
  readonly priority = HandlerPriority.HIGHEST; // 최고 우선순위

  /**
   * 원시 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isBuiltinType(type);
  }

  /**
   * 원시 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for primitive type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createPrimitiveNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create primitive type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 원시 타입 노드 생성
   */
  private createPrimitiveNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    const primitiveType = this.detectPrimitiveType(type);
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: true,
      analysisMethod: "type-checker",
    });

    return typeNodeFactory.createPrimitive(primitiveType, metadata);
  }

  /**
   * TypeScript 타입에서 원시 타입 이름 추출
   */
  private detectPrimitiveType(type: ts.Type): string {
    const flags = type.flags;

    // 기본 원시 타입들
    if (flags & ts.TypeFlags.String) return "string";
    if (flags & ts.TypeFlags.Number) return "number";
    if (flags & ts.TypeFlags.Boolean) return "boolean";
    if (flags & ts.TypeFlags.BigInt) return "bigint";
    if (flags & ts.TypeFlags.ESSymbol) return "symbol";

    // 특수 타입들
    if (flags & ts.TypeFlags.Any) return "any";
    if (flags & ts.TypeFlags.Unknown) return "unknown";
    if (flags & ts.TypeFlags.Never) return "never";
    if (flags & ts.TypeFlags.Void) return "void";
    if (flags & ts.TypeFlags.Null) return "null";
    if (flags & ts.TypeFlags.Undefined) return "undefined";

    // Fallback: 타입 문자열 그대로 사용
    return type.symbol?.name || "unknown";
  }

  // ==============================
  // 🔧 검증 및 디버깅 헬퍼들
  // ==============================

  /**
   * 지원하는 원시 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "string",
      "number",
      "boolean",
      "bigint",
      "symbol",
      "any",
      "unknown",
      "never",
      "void",
      "null",
      "undefined",
    ];
  }

  /**
   * 타입이 지원되는 원시 타입인지 확인 (정적 메서드)
   */
  static isPrimitiveType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined)
    );
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const primitiveType = this.detectPrimitiveType(type);
    const flags = type.flags;
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `PrimitiveTypeHandler Debug Info:`,
      `  Detected Type: ${primitiveType}`,
      `  Type Flags: ${flags}`,
      `  Type String: ${typeString}`,
      `  Is Supported: ${PrimitiveTypeHandler.isPrimitiveType(type)}`,
    ].join("\n");
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 원시 타입 핸들러 인스턴스 생성
 */
export function createPrimitiveTypeHandler(): PrimitiveTypeHandler {
  return new PrimitiveTypeHandler();
}

/**
 * 타입이 원시 타입인지 확인하는 헬퍼 함수
 */
export function isPrimitiveType(type: ts.Type): boolean {
  return PrimitiveTypeHandler.isPrimitiveType(type);
}

/**
 * 지원되는 원시 타입 목록 조회
 */
export function getSupportedPrimitiveTypes(): string[] {
  return PrimitiveTypeHandler.getSupportedTypes();
}
