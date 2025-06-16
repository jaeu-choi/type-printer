// src/handlers/literalTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";

/**
 * 🎯 리터럴 타입 핸들러
 *
 * TypeScript의 리터럴 타입들을 처리합니다:
 * - 문자열 리터럴: "hello", 'world'
 * - 숫자 리터럴: 42, 3.14, -5
 * - 불린 리터럴: true, false
 * - BigInt 리터럴: 123n
 * - 템플릿 리터럴: `hello ${string}`
 * - Enum 리터럴
 */
export class LiteralTypeHandler extends BaseTypeHandler {
  readonly name = "LiteralTypeHandler";
  readonly priority = HandlerPriority.HIGHEST; // Primitive과 동일한 최고 우선순위

  /**
   * 리터럴 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isLiteralType(type);
  }

  /**
   * 리터럴 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for literal type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createLiteralNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create literal type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 리터럴 타입 노드 생성
   */
  private createLiteralNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    const literalValue = this.extractLiteralValue(type);
    const literalTypeInfo = this.detectLiteralType(type);

    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false, // 리터럴은 일반적으로 builtin이 아님
      analysisMethod: "type-checker",
      debug: {
        warnings: [],
      },
      // 🔧 리터럴 타입 정보를 커스텀 속성으로 저장
      literalTypeInfo: literalTypeInfo,
    });

    return typeNodeFactory.createLiteral(literalValue, metadata);
  }

  /**
   * TypeScript 타입에서 리터럴 값 추출
   */
  private extractLiteralValue(type: ts.Type): string {
    const flags = type.flags;

    // 문자열 리터럴
    if (flags & ts.TypeFlags.StringLiteral) {
      const stringLiteral = type as ts.StringLiteralType;
      return `"${stringLiteral.value}"`;
    }

    // 숫자 리터럴
    if (flags & ts.TypeFlags.NumberLiteral) {
      const numberLiteral = type as ts.NumberLiteralType;
      return numberLiteral.value.toString();
    }

    // 불린 리터럴
    if (flags & ts.TypeFlags.BooleanLiteral) {
      const booleanLiteral = type as any; // TypeScript doesn't export BooleanLiteralType
      // intrinsicName을 통해 true/false 구분
      return booleanLiteral.intrinsicName === "true" ? "true" : "false";
    }

    // BigInt 리터럴
    if (flags & ts.TypeFlags.BigIntLiteral) {
      const bigintLiteral = type as ts.BigIntLiteralType;
      // PseudoBigInt를 안전하게 문자열로 변환
      try {
        return `${bigintLiteral.value.toString()}n`;
      } catch {
        return "0n"; // fallback
      }
    }

    // Enum 리터럴
    if (flags & ts.TypeFlags.EnumLiteral) {
      // Enum의 경우 symbol name 사용
      return type.symbol?.name || "unknown-enum";
    }

    // 템플릿 리터럴
    if (flags & ts.TypeFlags.TemplateLiteral) {
      // 템플릿 리터럴의 경우 일반적으로 typeToString 사용
      return type.symbol?.name || "template-literal";
    }

    // Fallback: 타입 문자열 그대로 사용
    return type.symbol?.name || "unknown-literal";
  }

  /**
   * 리터럴 타입의 종류 감지
   */
  private detectLiteralType(type: ts.Type): string {
    const flags = type.flags;

    if (flags & ts.TypeFlags.StringLiteral) return "string-literal";
    if (flags & ts.TypeFlags.NumberLiteral) return "number-literal";
    if (flags & ts.TypeFlags.BooleanLiteral) return "boolean-literal";
    if (flags & ts.TypeFlags.BigIntLiteral) return "bigint-literal";
    if (flags & ts.TypeFlags.EnumLiteral) return "enum-literal";
    if (flags & ts.TypeFlags.TemplateLiteral) return "template-literal";

    return "unknown-literal";
  }

  // ==============================
  // 🔧 검증 및 디버깅 헬퍼들
  // ==============================

  /**
   * 지원하는 리터럴 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "string-literal",
      "number-literal",
      "boolean-literal",
      "bigint-literal",
      "enum-literal",
      "template-literal",
    ];
  }

  /**
   * 타입이 지원되는 리터럴 타입인지 확인 (정적 메서드)
   */
  static isLiteralType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  /**
   * 리터럴 값 추출 (정적 메서드 - 다른 핸들러에서도 사용 가능)
   */
  static extractLiteralValue(
    type: ts.Type
  ): string | number | boolean | bigint | undefined {
    const flags = type.flags;

    if (flags & ts.TypeFlags.StringLiteral) {
      return (type as ts.StringLiteralType).value;
    }

    if (flags & ts.TypeFlags.NumberLiteral) {
      return (type as ts.NumberLiteralType).value;
    }

    if (flags & ts.TypeFlags.BooleanLiteral) {
      const booleanLiteral = type as any;
      return booleanLiteral.intrinsicName === "true";
    }

    if (flags & ts.TypeFlags.BigIntLiteral) {
      const bigintLiteral = type as ts.BigIntLiteralType;
      // PseudoBigInt를 안전하게 처리
      try {
        return BigInt(bigintLiteral.value.toString());
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const literalValue = this.extractLiteralValue(type);
    const literalType = this.detectLiteralType(type);
    const rawValue = LiteralTypeHandler.extractLiteralValue(type);
    const flags = type.flags;
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `LiteralTypeHandler Debug Info:`,
      `  Literal Type: ${literalType}`,
      `  Literal Value: ${literalValue}`,
      `  Raw Value: ${rawValue}`,
      `  Type Flags: ${flags}`,
      `  Type String: ${typeString}`,
      `  Is Supported: ${LiteralTypeHandler.isLiteralType(type)}`,
    ].join("\n");
  }

  /**
   * 특정 리터럴 타입의 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedType: string;
  }> {
    return [
      {
        description: "String literal",
        value: '"hello"',
        expectedType: "string-literal",
      },
      {
        description: "Number literal",
        value: "42",
        expectedType: "number-literal",
      },
      {
        description: "Boolean literal true",
        value: "true",
        expectedType: "boolean-literal",
      },
      {
        description: "Boolean literal false",
        value: "false",
        expectedType: "boolean-literal",
      },
      {
        description: "BigInt literal",
        value: "123n",
        expectedType: "bigint-literal",
      },
      {
        description: "Template literal",
        value: "`hello ${string}`",
        expectedType: "template-literal",
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 리터럴 타입 핸들러 인스턴스 생성
 */
export function createLiteralTypeHandler(): LiteralTypeHandler {
  return new LiteralTypeHandler();
}

/**
 * 타입이 리터럴 타입인지 확인하는 헬퍼 함수
 */
export function isLiteralType(type: ts.Type): boolean {
  return LiteralTypeHandler.isLiteralType(type);
}

/**
 * 리터럴 값 추출 헬퍼 함수
 */
export function extractLiteralValue(
  type: ts.Type
): string | number | boolean | bigint | undefined {
  return LiteralTypeHandler.extractLiteralValue(type);
}

/**
 * 지원되는 리터럴 타입 목록 조회
 */
export function getSupportedLiteralTypes(): string[] {
  return LiteralTypeHandler.getSupportedTypes();
}
