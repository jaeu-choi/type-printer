// src/handlers/conditionalTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, ConditionalTypeInfo } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 조건부 타입 핸들러 (수정됨 - 실제 TypeScript 평가 사용)
 *
 * TypeScript의 조건부 타입들을 처리합니다:
 * - 기본 조건부: T extends U ? X : Y
 * - infer 포함: T extends (...args: any[]) => infer R ? R : never
 * - 중첩 조건부: T extends U ? (V extends W ? X : Y) : Z
 * - 분산 조건부: T extends any ? T[] : never (유니온에서 분산됨)
 *
 * 🎯 핵심: 하드코딩된 규칙 대신 TypeScript의 실제 평가 결과를 사용합니다!
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

    // 1. 조건부 타입 구조 정보 추출 (교육적 목적)
    const conditionalInfo = this.extractConditionalInfo(type, node, context);

    // 2. 🎯 핵심: TypeScript가 이미 계산한 실제 결과 사용!
    const actualResult = context.checker.typeToString(type);
    console.log(`🎯 TypeScript already calculated: "${actualResult}"`);

    // 3. 조건부 타입의 평가 분석 (역추적)
    const evaluationAnalysis = this.analyzeActualEvaluation(
      conditionalInfo,
      actualResult,
      context
    );

    // 4. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker", // 진짜 TypeChecker 사용!
      finalTypeString: actualResult,
      debug: {
        warnings: [],
      },
      conditionalInfo: {
        condition: this.formatCondition(conditionalInfo),
        evaluated: true, // 항상 평가됨 (TypeScript가 했으니까!)
        result: evaluationAnalysis.selectedBranch,
        reasoning: evaluationAnalysis.reasoning,
        actualTypeScriptResult: actualResult,
      },
    });

    console.log(`🔍 Evaluation: ${evaluationAnalysis.reasoning}`);

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
   * 🔍 조건부 타입 평가 분석 (역추적)
   * TypeScript 결과를 보고 어떤 브랜치가 선택되었는지 추론
   */
  private analyzeActualEvaluation(
    conditionalInfo: ConditionalTypeInfo,
    actualResult: string,
    context: TypeCreationContext
  ): { selectedBranch: boolean | undefined; reasoning: string } {
    try {
      // 각 브랜치의 타입 문자열과 비교
      const trueTypeString = this.getTypeNodeString(conditionalInfo.trueType);
      const falseTypeString = this.getTypeNodeString(conditionalInfo.falseType);

      console.log(`🔍 Branch analysis:`);
      console.log(`   True branch: ${trueTypeString}`);
      console.log(`   False branch: ${falseTypeString}`);
      console.log(`   Actual result: ${actualResult}`);

      // 결과와 브랜치 비교
      if (actualResult === trueTypeString) {
        return {
          selectedBranch: true,
          reasoning: `Condition evaluated to TRUE - result matches true branch (${trueTypeString})`,
        };
      }

      if (actualResult === falseTypeString) {
        return {
          selectedBranch: false,
          reasoning: `Condition evaluated to FALSE - result matches false branch (${falseTypeString})`,
        };
      }

      // 복잡한 경우 (분산, 유니온 등)
      if (actualResult.includes("|")) {
        return {
          selectedBranch: undefined,
          reasoning: `Distributive conditional type - TypeScript result: ${actualResult}`,
        };
      }

      // 매칭되지 않는 경우
      return {
        selectedBranch: undefined,
        reasoning: `Complex conditional evaluation - TypeScript result: ${actualResult}`,
      };
    } catch (error) {
      return {
        selectedBranch: undefined,
        reasoning: `Analysis failed: ${error} - TypeScript result: ${actualResult}`,
      };
    }
  }

  /**
   * TypeNode에서 타입 문자열 추출
   */
  private getTypeNodeString(typeNode: TypeNode): string {
    return (
      typeNode.metadata?.finalTypeString ||
      typeNode.literal ||
      typeNode.name ||
      "unknown"
    );
  }

  // ==============================
  // 🔧 타입 판별 및 추출 헬퍼들
  // ==============================

  /**
   * 조건부 타입인지 확인 (private method)
   */
  private checkIsConditionalType(type: ts.Type, node?: ts.TypeNode): boolean {
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
   * 조건 포맷팅
   */
  private formatCondition(conditionalInfo: ConditionalTypeInfo): string {
    const checkType = this.getTypeNodeString(conditionalInfo.checkType);
    const extendsType = this.getTypeNodeString(conditionalInfo.extendsType);
    return `${checkType} extends ${extendsType}`;
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
      "All conditional types (real TypeScript evaluation)", // 🎯 실제 평가!
      "Basic conditional: T extends U ? X : Y",
      "With infer: T extends (...args: any[]) => infer R ? R : never",
      "Nested conditional: complex nested conditions",
      "Distributive conditional: T extends any ? T[] : never",
      "String literal conditional: T extends `${string}` ? true : false",
      "Object conditional: T extends { prop: any } ? T['prop'] : never",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isConditional = this.isApplicable(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `ConditionalTypeHandler Debug Info:`,
      `  Is Conditional: ${isConditional}`,
      `  TypeScript Result: ${typeString}`,
      `  Uses Real Evaluation: true`, // 🎯 실제 평가 사용!
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
        expectedBehavior:
          "Uses TypeScript's actual evaluation - real 'yes' or 'no' result",
      },
      {
        description: "Function return type extraction",
        value: "T extends (...args: any[]) => infer R ? R : never",
        expectedBehavior: "TypeScript extracts actual return type R",
      },
      {
        description: "Array element extraction",
        value: "T extends (infer U)[] ? U : never",
        expectedBehavior: "TypeScript extracts actual element type U",
      },
      {
        description: "Object property extraction",
        value: "T extends { prop: infer P } ? P : never",
        expectedBehavior: "TypeScript extracts actual property type P",
      },
      {
        description: "Distributive over union",
        value: "T extends any ? T[] : never",
        expectedBehavior: "TypeScript distributes: A | B becomes A[] | B[]",
      },
      {
        description: "Nested conditional",
        value: "T extends string ? (U extends number ? true : false) : never",
        expectedBehavior: "TypeScript evaluates nested conditions accurately",
      },
    ];
  }
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
 * 타입이 조건부 타입인지 확인하는 헬퍼 함수 (실제 TypeScript 평가 사용)
 */
export function isConditionalType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new ConditionalTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 조건부 타입 목록 조회 (실제 TypeScript 평가 기반)
 */
export function getSupportedConditionalTypes(): string[] {
  return ConditionalTypeHandler.getSupportedTypes();
}
