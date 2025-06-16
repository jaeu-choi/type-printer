// src/handlers/conditionalTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, ConditionalTypeInfo } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 조건부 타입 핸들러
 *
 * TypeScript의 조건부 타입들을 처리합니다:
 * - 기본 조건부: T extends U ? X : Y
 * - infer 포함: T extends (...args: any[]) => infer R ? R : never
 * - 중첩 조건부: T extends U ? (V extends W ? X : Y) : Z
 * - 분산 조건부: T extends any ? T[] : never (유니온에서 분산됨)
 */
export class ConditionalTypeHandler extends BaseTypeHandler {
  readonly name = "ConditionalTypeHandler";
  readonly priority = HandlerPriority.MEDIUM; // 중간 우선순위 (50)

  /**
   * 조건부 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.checkIsConditionalType(type, node);
  }
  /**
   * 조건부 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for conditional type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createConditionalNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create conditional type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 조건부 타입 노드 생성
   */
  private createConditionalNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ConditionalTypeHandler: Processing conditional type`);

    // 1. 조건부 타입 정보 추출
    const conditionalInfo = this.extractConditionalInfo(type, node, context);

    // 2. 조건 평가 시도
    const evaluationResult = this.evaluateCondition(conditionalInfo, context);

    // 3. 최종 타입 문자열 계산
    const finalTypeString = this.generateConditionalTypeString(
      conditionalInfo,
      evaluationResult
    );

    // 4. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString,
      debug: {
        warnings: [],
      },
      conditionalInfo: {
        condition: this.formatCondition(conditionalInfo),
        evaluated: evaluationResult.evaluated,
        result: evaluationResult.result,
        reasoning: evaluationResult.reasoning,
      },
    });

    console.log(`🔍 Conditional type evaluated: ${evaluationResult.reasoning}`);

    // 5. 조건부 TypeNode 생성
    return typeNodeFactory.createConditional(conditionalInfo, metadata);
  }

  /**
   * 조건부 타입 정보 추출
   */
  private extractConditionalInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): ConditionalTypeInfo {
    // AST 노드에서 추출 (우선순위)
    if (node && ts.isConditionalTypeNode(node)) {
      return this.extractFromNode(node, context);
    }

    // TypeChecker에서 추출 (fallback)
    return this.extractFromType(type, context);
  }

  /**
   * AST 노드에서 조건부 정보 추출
   */
  private extractFromNode(
    conditionalNode: ts.ConditionalTypeNode,
    context: TypeCreationContext
  ): ConditionalTypeInfo {
    // 각 구성 요소의 타입과 노드 생성
    const checkType = context.checker.getTypeFromTypeNode(
      conditionalNode.checkType
    );
    const extendsType = context.checker.getTypeFromTypeNode(
      conditionalNode.extendsType
    );
    const trueType = context.checker.getTypeFromTypeNode(
      conditionalNode.trueType
    );
    const falseType = context.checker.getTypeFromTypeNode(
      conditionalNode.falseType
    );

    return {
      checkType: globalHandlerRegistry.createTypeNode(
        checkType,
        conditionalNode.checkType,
        context
      ),
      extendsType: globalHandlerRegistry.createTypeNode(
        extendsType,
        conditionalNode.extendsType,
        context
      ),
      trueType: globalHandlerRegistry.createTypeNode(
        trueType,
        conditionalNode.trueType,
        context
      ),
      falseType: globalHandlerRegistry.createTypeNode(
        falseType,
        conditionalNode.falseType,
        context
      ),
    };
  }

  /**
   * TypeChecker에서 조건부 정보 추출 (복잡함)
   */
  private extractFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): ConditionalTypeInfo {
    // TypeScript 내부 구조에 접근해야 함 - 복잡하므로 간단한 fallback
    console.warn(
      "⚠️ Extracting conditional info from type (not AST node) - limited support"
    );

    // 기본적인 fallback 구조 생성
    const unknownNode = typeNodeFactory.createPrimitive("unknown");

    return {
      checkType: unknownNode,
      extendsType: unknownNode,
      trueType: unknownNode,
      falseType: unknownNode,
    };
  }

  /**
   * 조건 평가 (가능한 경우)
   */
  private evaluateCondition(
    conditionalInfo: ConditionalTypeInfo,
    context: TypeCreationContext
  ): ConditionEvaluationResult {
    try {
      // 구체적인 타입들인 경우 평가 시도
      const checkTypeName = this.getTypeName(conditionalInfo.checkType);
      const extendsTypeName = this.getTypeName(conditionalInfo.extendsType);

      // 간단한 경우들 처리
      if (this.canEvaluateSimpleCondition(checkTypeName, extendsTypeName)) {
        const result = this.evaluateSimpleCondition(
          checkTypeName,
          extendsTypeName
        );
        return {
          evaluated: true,
          result,
          reasoning: `${checkTypeName} ${
            result ? "extends" : "does not extend"
          } ${extendsTypeName}`,
        };
      }

      // 복잡한 경우 - 평가하지 않음
      return {
        evaluated: false,
        result: undefined,
        reasoning:
          "Complex conditional type - evaluation deferred to TypeScript",
      };
    } catch (error) {
      return {
        evaluated: false,
        result: undefined,
        reasoning: `Evaluation failed: ${error}`,
      };
    }
  }

  /**
   * 간단한 조건 평가 가능 여부 확인
   */
  private canEvaluateSimpleCondition(
    checkType: string,
    extendsType: string
  ): boolean {
    const simpleTypes = [
      "string",
      "number",
      "boolean",
      "bigint",
      "symbol",
      "object",
      "undefined",
      "null",
      "void",
      "any",
      "unknown",
      "never",
    ];

    return simpleTypes.includes(checkType) && simpleTypes.includes(extendsType);
  }

  /**
   * 간단한 조건 평가
   */
  private evaluateSimpleCondition(
    checkType: string,
    extendsType: string
  ): boolean {
    // 기본 상속 관계들
    const inheritanceRules: Record<string, string[]> = {
      never: [], // never는 모든 타입에 할당 가능하지만 extends는 특별
      string: ["string", "any", "unknown"],
      number: ["number", "any", "unknown"],
      boolean: ["boolean", "any", "unknown"],
      bigint: ["bigint", "any", "unknown"],
      symbol: ["symbol", "any", "unknown"],
      object: ["object", "any", "unknown"],
      undefined: ["undefined", "void", "any", "unknown"],
      null: ["null", "any", "unknown"],
      void: ["void", "any", "unknown"],
      any: ["any"], // any는 any에만 extends
      unknown: ["unknown"], // unknown은 unknown에만 extends
    };

    const extendsTypes = inheritanceRules[checkType] || [];
    return extendsTypes.includes(extendsType);
  }

  // ==============================
  // 🔧 타입 판별 및 추출 헬퍼들
  // ==============================

  /**
   * 조건부 타입인지 확인
   */
  private CheckisConditionalType(type: ts.Type, node?: ts.TypeNode): boolean {
    // AST 노드 기반 확인
    if (node && ts.isConditionalTypeNode(node)) {
      return true;
    }

    // TypeChecker 기반 확인 (복잡함)
    // TypeScript 내부에서 conditional type을 나타내는 플래그가 있지만
    // 공개 API로는 쉽게 접근하기 어려움
    return false;
  }

  /**
   * TypeNode에서 타입 이름 추출
   */
  private getTypeName(typeNode: TypeNode): string {
    return typeNode.literal || typeNode.name || "unknown";
  }

  /**
   * 조건 포맷팅
   */
  private formatCondition(conditionalInfo: ConditionalTypeInfo): string {
    const checkType = this.getTypeName(conditionalInfo.checkType);
    const extendsType = this.getTypeName(conditionalInfo.extendsType);
    return `${checkType} extends ${extendsType}`;
  }

  /**
   * 조건부 타입 문자열 생성
   */
  private generateConditionalTypeString(
    conditionalInfo: ConditionalTypeInfo,
    evaluationResult: ConditionEvaluationResult
  ): string {
    // 평가된 경우 결과 반환
    if (evaluationResult.evaluated && evaluationResult.result !== undefined) {
      const selectedType = evaluationResult.result
        ? conditionalInfo.trueType
        : conditionalInfo.falseType;
      return this.getTypeName(selectedType);
    }

    // 평가되지 않은 경우 조건부 형태 반환
    const checkType = this.getTypeName(conditionalInfo.checkType);
    const extendsType = this.getTypeName(conditionalInfo.extendsType);
    const trueType = this.getTypeName(conditionalInfo.trueType);
    const falseType = this.getTypeName(conditionalInfo.falseType);

    return `${checkType} extends ${extendsType} ? ${trueType} : ${falseType}`;
  }

  // ==============================
  // 🔧 고급 기능들
  // ==============================

  /**
   * infer 키워드 감지 및 처리
   */
  private hasInferKeyword(node?: ts.TypeNode): boolean {
    if (!node) return false;
    return node.getText().includes("infer ");
  }

  /**
   * 분산 조건부 타입 감지
   */
  private isDistributiveConditional(
    conditionalInfo: ConditionalTypeInfo
  ): boolean {
    // check type이 naked type parameter인 경우 분산됨
    // 예: T extends any ? T[] : never
    const checkType = conditionalInfo.checkType;
    return (
      checkType.kind === "reference" &&
      checkType.name?.length === 1 && // 단일 문자 (T, U, K 등)
      /^[A-Z]$/.test(checkType.name)
    );
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 조건부 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "Basic conditional", // T extends U ? X : Y
      "With infer", // T extends (...args: any[]) => infer R ? R : never
      "Nested conditional", // T extends U ? (V extends W ? X : Y) : Z
      "Distributive conditional", // T extends any ? T[] : never
      "String literal conditional", // T extends `${string}` ? true : false
      "Object conditional", // T extends { prop: any } ? T['prop'] : never
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isConditional = this.isConditionalType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `ConditionalTypeHandler Debug Info:`,
      `  Is Conditional: ${isConditional}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
    ].join("\n");
  }

  /**
   * 조건부 타입 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedBehavior: string;
  }> {
    return [
      {
        description: "Basic string check",
        value: "T extends string ? 'yes' : 'no'",
        expectedBehavior: "Evaluates to 'yes' if T is string, 'no' otherwise",
      },
      {
        description: "Function return type extraction",
        value: "T extends (...args: any[]) => infer R ? R : never",
        expectedBehavior: "Extracts return type R from function type T",
      },
      {
        description: "Array element extraction",
        value: "T extends (infer U)[] ? U : never",
        expectedBehavior: "Extracts element type U from array type T",
      },
      {
        description: "Object property extraction",
        value: "T extends { prop: infer P } ? P : never",
        expectedBehavior: "Extracts property type P from object with prop",
      },
      {
        description: "Distributive over union",
        value: "T extends any ? T[] : never",
        expectedBehavior: "Distributes over union: A | B becomes A[] | B[]",
      },
      {
        description: "Nested conditional",
        value: "T extends string ? (U extends number ? true : false) : never",
        expectedBehavior: "Nested evaluation based on multiple conditions",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface ConditionEvaluationResult {
  evaluated: boolean;
  result?: boolean;
  reasoning: string;
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 조건부 타입 핸들러 인스턴스 생성
 */
export function createConditionalTypeHandler(): ConditionalTypeHandler {
  return new ConditionalTypeHandler();
}

/**
 * 타입이 조건부 타입인지 확인하는 헬퍼 함수
 */
export function isConditionalType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new ConditionalTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 조건부 타입 목록 조회
 */
export function getSupportedConditionalTypes(): string[] {
  return ConditionalTypeHandler.getSupportedTypes();
}
