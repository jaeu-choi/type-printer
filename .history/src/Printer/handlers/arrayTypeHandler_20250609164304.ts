// src/handlers/arrayTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 배열 타입 핸들러
 *
 * TypeScript의 배열 타입들을 처리합니다:
 * - 배열 구문: T[], string[], number[]
 * - Array 제네릭: Array<T>, Array<string>
 * - ReadonlyArray: ReadonlyArray<T>
 * - 중첩 배열: T[][], Array<Array<string>>
 */
export class ArrayTypeHandler extends BaseTypeHandler {
  readonly name = "ArrayTypeHandler";
  readonly priority = HandlerPriority.MEDIUM; // 중간 우선순위 (50)

  /**
   * 배열 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isArrayType(type) || this.isArrayTypeNode(node);
  }

  /**
   * 배열 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for array type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createArrayNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create array type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 배열 타입 노드 생성
   */
  private createArrayNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ArrayTypeHandler: Processing array type`);

    // 1. 요소 타입 추출
    const elementType = this.extractElementType(type, node, context);

    // 2. 요소 타입을 재귀적으로 처리 (제네릭 컨텍스트 활용)
    const elementTypeNode = globalHandlerRegistry.createTypeNode(
      elementType.tsType,
      elementType.node,
      context
    );

    console.log(
      `🔍 Array element type resolved: ${context.checker.typeToString(
        elementType.tsType
      )}`
    );

    // 3. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      debug: {
        warnings: [],
        arrayInfo: {
          elementType: context.checker.typeToString(elementType.tsType),
          isNestedArray: this.isNestedArray(elementType.tsType),
          arrayNotation: this.detectArrayNotation(node),
        },
      },
    });

    // 4. 배열 TypeNode 생성
    return typeNodeFactory.createArray(elementTypeNode, metadata);
  }

  /**
   * 배열 요소 타입 추출
   */
  private extractElementType(
    arrayType: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): { tsType: ts.Type; node?: ts.TypeNode } {
    // 방법 1: AST 노드에서 추출 (더 정확함)
    if (node) {
      const elementFromNode = this.extractElementTypeFromNode(node, context);
      if (elementFromNode) {
        return elementFromNode;
      }
    }

    // 방법 2: TypeChecker에서 추출
    return this.extractElementTypeFromType(arrayType, context);
  }

  /**
   * AST 노드에서 요소 타입 추출
   */
  private extractElementTypeFromNode(
    node: ts.TypeNode,
    context: TypeCreationContext
  ): { tsType: ts.Type; node: ts.TypeNode } | null {
    // T[] 형태
    if (ts.isArrayTypeNode(node)) {
      const elementType = context.checker.getTypeFromTypeNode(node.elementType);
      return {
        tsType: elementType,
        node: node.elementType,
      };
    }

    // Array<T> 형태
    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText();

      if (
        (typeName === "Array" || typeName === "ReadonlyArray") &&
        node.typeArguments &&
        node.typeArguments.length > 0
      ) {
        const elementTypeNode = node.typeArguments[0];
        const elementType =
          context.checker.getTypeFromTypeNode(elementTypeNode);

        return {
          tsType: elementType,
          node: elementTypeNode,
        };
      }
    }

    return null;
  }

  /**
   * TypeChecker에서 요소 타입 추출
   */
  private extractElementTypeFromType(
    arrayType: ts.Type,
    context: TypeCreationContext
  ): { tsType: ts.Type; node?: ts.TypeNode } {
    try {
      // TypeReference (Array<T>)인 경우
      if (arrayType.flags & ts.TypeFlags.Object) {
        const objectType = arrayType as ts.ObjectType;

        if (objectType.objectFlags & ts.ObjectFlags.Reference) {
          const typeRef = objectType as ts.TypeReference;

          // Array나 ReadonlyArray의 타입 인수 확인
          if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
            return { tsType: typeRef.typeArguments[0] };
          }
        }
      }

      // NumberIndex 접근으로 배열 요소 타입 추출
      const numberIndexType = arrayType.getNumberIndexType();
      if (numberIndexType) {
        return { tsType: numberIndexType };
      }

      // Fallback: any 타입
      console.warn(`⚠️ Cannot extract element type from array, using 'any'`);
      return { tsType: context.checker.getAnyType() };
    } catch (error) {
      console.warn(`⚠️ Error extracting element type: ${error}`);
      return { tsType: context.checker.getAnyType() };
    }
  }

  // ==============================
  // 🔧 타입 판별 헬퍼들
  // ==============================

  /**
   * TypeScript 타입이 배열 타입인지 확인 (개선된 버전)
   */
  protected isArrayType(type: ts.Type): boolean {
    // 이미 BaseTypeHandler에 있지만 더 정확하게 개선

    // 1. 심볼 이름으로 확인
    if (type.symbol) {
      const symbolName = type.symbol.name;
      if (symbolName === "Array" || symbolName === "ReadonlyArray") {
        return true;
      }
    }

    // 2. TypeReference + Array 확인
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;

      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const typeRef = objectType as ts.TypeReference;

        // target이 Array인지 확인
        if (typeRef.target && typeRef.target.symbol) {
          const targetName = typeRef.target.symbol.name;
          return targetName === "Array" || targetName === "ReadonlyArray";
        }
      }
    }

    // 3. NumberIndex가 있는지 확인 (배열의 특징)
    const numberIndexType = type.getNumberIndexType();
    if (numberIndexType) {
      // 하지만 모든 객체가 number index를 가질 수 있으므로 추가 검사
      const stringIndexType = type.getStringIndexType();

      // 배열은 보통 number index는 있지만 string index는 더 제한적
      return true;
    }

    return false;
  }

  /**
   * AST 노드가 배열 타입인지 확인
   */
  private isArrayTypeNode(node?: ts.TypeNode): boolean {
    if (!node) return false;

    // T[] 형태
    if (ts.isArrayTypeNode(node)) {
      return true;
    }

    // Array<T> 형태
    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText();
      return typeName === "Array" || typeName === "ReadonlyArray";
    }

    return false;
  }

  /**
   * 중첩 배열인지 확인
   */
  private isNestedArray(elementType: ts.Type): boolean {
    return this.isArrayType(elementType);
  }

  /**
   * 배열 표기법 감지
   */
  private detectArrayNotation(
    node?: ts.TypeNode
  ): "bracket" | "generic" | "unknown" {
    if (!node) return "unknown";

    if (ts.isArrayTypeNode(node)) {
      return "bracket"; // T[]
    }

    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText();
      if (typeName === "Array" || typeName === "ReadonlyArray") {
        return "generic"; // Array<T>
      }
    }

    return "unknown";
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 배열 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "T[]", // 배열 구문
      "Array<T>", // Array 제네릭
      "ReadonlyArray<T>", // ReadonlyArray
      "T[][]", // 중첩 배열
      "Array<Array<T>>", // 중첩 Array 제네릭
    ];
  }

  /**
   * 타입이 지원되는 배열 타입인지 확인 (정적 메서드)
   */
  static isArrayType(type: ts.Type): boolean {
    // 간단한 심볼 이름 체크
    if (type.symbol) {
      const symbolName = type.symbol.name;
      if (symbolName === "Array" || symbolName === "ReadonlyArray") {
        return true;
      }
    }

    // NumberIndex 체크
    return !!type.getNumberIndexType();
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isArray = this.isArrayType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";
    const numberIndexType = type.getNumberIndexType();
    const elementTypeString = numberIndexType
      ? context?.checker?.typeToString(numberIndexType) || "unknown"
      : "none";

    return [
      `ArrayTypeHandler Debug Info:`,
      `  Is Array: ${isArray}`,
      `  Type String: ${typeString}`,
      `  Element Type: ${elementTypeString}`,
      `  Type Flags: ${type.flags}`,
      `  Symbol Name: ${type.symbol?.name || "none"}`,
      `  Has Number Index: ${!!numberIndexType}`,
    ].join("\n");
  }

  /**
   * 배열 타입 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedElementType: string;
  }> {
    return [
      {
        description: "String array (bracket syntax)",
        value: "string[]",
        expectedElementType: "string",
      },
      {
        description: "Number array (generic syntax)",
        value: "Array<number>",
        expectedElementType: "number",
      },
      {
        description: "Readonly string array",
        value: "ReadonlyArray<string>",
        expectedElementType: "string",
      },
      {
        description: "Nested array",
        value: "number[][]",
        expectedElementType: "number[]",
      },
      {
        description: "Generic array",
        value: "T[]",
        expectedElementType: "T",
      },
      {
        description: "Union element array",
        value: "(string | number)[]",
        expectedElementType: "string | number",
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 배열 타입 핸들러 인스턴스 생성
 */
export function createArrayTypeHandler(): ArrayTypeHandler {
  return new ArrayTypeHandler();
}

/**
 * 타입이 배열 타입인지 확인하는 헬퍼 함수
 */
export function isArrayType(type: ts.Type): boolean {
  return ArrayTypeHandler.isArrayType(type);
}

/**
 * 지원되는 배열 타입 목록 조회
 */
export function getSupportedArrayTypes(): string[] {
  return ArrayTypeHandler.getSupportedTypes();
}
