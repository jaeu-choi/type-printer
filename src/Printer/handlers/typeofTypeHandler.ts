// src/handlers/typeofTypeHandler.ts

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  EducationalStep,
  IntermediateStep,
} from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🔍 typeof 연산자 전용 핸들러 - 교육적 타입 추출 과정 기록
 *
 * TypeScript의 typeof 연산자를 처리하면서 타입 추출 과정을 상세히 기록:
 * - typeof obj → 객체 구조 분석 후 타입 생성
 * - typeof myFunction → 함수 시그니처 추출
 * - typeof myVar → 변수 타입 추출
 * - typeof myClass → 클래스 생성자 타입
 * - typeof MyNamespace → 네임스페이스 타입
 *
 * 🎯 교육적 목표: 값 분석 → 구조 파악 → 타입 정의 생성 과정
 */
export class TypeofTypeHandler extends BaseTypeHandler {
  readonly name = "TypeofTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  /**
   * typeof 연산자 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isTypeofOperatorType(type, node);
  }

  /**
   * typeof 타입을 TypeNode로 변환 (교육적 과정 포함)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for typeof type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createTypeofNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create typeof type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 typeof 타입 노드 생성 (교육적 과정 중심)
   */
  private createTypeofNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 TypeofTypeHandler: Processing typeof operator`);

    // 1. 🎯 실제 TypeScript 결과 먼저 확보
    const actualFinalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 TypeScript typeof result: "${actualFinalResult}"`);

    // 2. typeof 연산자 정보 추출
    const typeofInfo = this.extractTypeofInfo(type, node, context);
    console.log(`🔍 Detected typeof on: ${typeofInfo.targetDescription}`);

    // 3. 🎯 교육적 과정: typeof 연산 이터레이션
    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    const typeofResult = this.simulateTypeofExecution(
      typeofInfo,
      context,
      educationalSteps,
      intermediateSteps
    );

    // 4. 메타데이터 생성 (교육적 정보 풍부하게)
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString: actualFinalResult, // 🎯 실제 컴파일러 결과
      debug: {
        warnings: typeofResult.warnings,
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      // 🆕 typeof 특화 정보
      typeofInfo: {
        targetDescription: typeofInfo.targetDescription,
        targetCategory: typeofInfo.targetCategory,
        extractedStructure: typeofResult.extractedStructure,
        analysisComplexity: this.analyzeTypeofComplexity(actualFinalResult),
        educationalValue: "high", // typeof는 핵심 개념
      },
    });

    // 5. 중간 단계가 있으면 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(`🔍 typeof analysis completed: ${actualFinalResult}`);

    // 6. typeof TypeNode 생성
    const typeofNode = typeNodeFactory.createOperator(
      "typeof",
      typeofResult.resultNode,
      metadata
    );

    return typeofNode;
  }

  /**
   * 🎯 typeof 실행 과정 시뮬레이션 (핵심 교육적 기능)
   */
  private simulateTypeofExecution(
    typeofInfo: TypeofInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): TypeofResult {
    console.log(`🔍 === TYPEOF EXECUTION SIMULATION START ===`);
    console.log(`🎯 Target: ${typeofInfo.targetDescription}`);

    const warnings: string[] = [];

    // Step 1: typeof 연산자 감지
    educationalSteps.push({
      type: "generic-detection",
      description: `typeof operator detected on ${typeofInfo.targetDescription}`,
      details: {
        operator: "typeof",
        target: typeofInfo.targetDescription,
        targetCategory: typeofInfo.targetCategory,
        extractionMethod: this.determineExtractionMethod(
          typeofInfo.targetCategory
        ),
      },
    });

    // Step 2: 대상 분석 과정
    console.log(`🔍 Analyzing typeof target...`);

    const analysisResult = this.analyzeTypeofTarget(typeofInfo, context);

    // 교육적 단계: 대상 분석
    educationalSteps.push({
      type: "definition-lookup",
      description: `Analyzing ${typeofInfo.targetCategory}: ${typeofInfo.targetDescription}`,
      input: typeofInfo.targetDescription,
      output: `Identified as ${typeofInfo.targetCategory}`,
      details: {
        targetType: typeofInfo.targetCategory,
        analysisMethod: analysisResult.method,
        structureFound: analysisResult.structureDescription,
      },
    });

    // Step 3: 타입 구조 추출 과정
    const structureExtraction = this.extractTypeStructure(
      typeofInfo,
      analysisResult,
      context,
      educationalSteps,
      intermediateSteps
    );

    // Step 4: 최종 타입 생성
    const resultNode = globalHandlerRegistry.createTypeNode(
      structureExtraction.extractedType,
      undefined,
      context
    );

    // 교육적 단계: 타입 정의 완성
    educationalSteps.push({
      type: "instantiation-start",
      description: `Type extraction completed for ${typeofInfo.targetDescription}`,
      input: typeofInfo.targetDescription,
      output: resultNode.metadata?.finalTypeString || "unknown",
      details: {
        extractionSuccess: true,
        finalTypeStructure: resultNode.metadata?.finalTypeString,
        extractionSteps: structureExtraction.steps.length,
      },
    });

    console.log(
      `🔍 typeof processing completed for: ${typeofInfo.targetDescription}`
    );
    console.log(`🔍 === TYPEOF EXECUTION SIMULATION END ===`);

    return {
      resultNode,
      extractedStructure: structureExtraction.description,
      warnings,
    };
  }

  /**
   * 🔍 typeof 대상 분석
   */
  private analyzeTypeofTarget(
    typeofInfo: TypeofInfo,
    context: TypeCreationContext
  ): TargetAnalysisResult {
    console.log(
      `🔍 Analyzing typeof target category: ${typeofInfo.targetCategory}`
    );

    switch (typeofInfo.targetCategory) {
      case "variable":
        return {
          method: "variable-type-lookup",
          structureDescription: "variable type structure",
          complexity: "simple",
        };

      case "function":
        return {
          method: "function-signature-analysis",
          structureDescription: "function signature and overloads",
          complexity: "moderate",
        };

      case "object":
        return {
          method: "object-structure-analysis",
          structureDescription: "object property types and structure",
          complexity: "complex",
        };

      case "class":
        return {
          method: "class-constructor-analysis",
          structureDescription: "class constructor and static members",
          complexity: "complex",
        };

      case "namespace":
        return {
          method: "namespace-member-analysis",
          structureDescription: "namespace exported members",
          complexity: "complex",
        };

      default:
        return {
          method: "generic-type-analysis",
          structureDescription: "unknown structure",
          complexity: "unknown",
        };
    }
  }

  /**
   * 🏗️ 타입 구조 추출 과정
   */
  private extractTypeStructure(
    typeofInfo: TypeofInfo,
    analysisResult: TargetAnalysisResult,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): StructureExtractionResult {
    const steps: string[] = [];

    console.log(`🏗️ Extracting type structure using: ${analysisResult.method}`);

    // 구조 추출 과정 시뮬레이션
    steps.push(`1. Apply ${analysisResult.method}`);
    steps.push(`2. Scan ${analysisResult.structureDescription}`);
    steps.push("3. Generate type definition");

    // 교육적 단계: 구조 추출
    educationalSteps.push({
      type: "parameter-mapping",
      description: `Extracting type structure using ${analysisResult.method}`,
      input: `${typeofInfo.targetCategory} analysis`,
      output: "type structure definition",
      details: {
        extractionMethod: analysisResult.method,
        complexity: analysisResult.complexity,
        steps: steps.length,
      },
    });

    // 중간 단계: 각 구조 분석 단계
    steps.forEach((step, index) => {
      const intermediateStep: IntermediateStep = {
        stepType: "typeof-evaluation",
        description: step,
        input: typeNodeFactory.createPrimitive(typeofInfo.targetCategory),
        output: typeNodeFactory.createPrimitive("type-definition"),
        transformation: `${step} → partial type info`,
        metadata: {
          operator: "typeof",
          reasoning: `Structure extraction step ${index + 1}`,
          condition: `step-index=${index + 1}`,
        },
      };
      intermediateSteps.push(intermediateStep);
    });

    // 실제 타입 추출 (TypeScript API 사용)
    const extractedType = typeofInfo.extractedType;

    return {
      extractedType,
      description: analysisResult.structureDescription,
      steps,
    };
  }

  // ==============================
  // 🔧 typeof 특화 헬퍼 메서드들
  // ==============================

  /**
   * typeof 정보 추출
   */
  private extractTypeofInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeofInfo {
    // AST 노드에서 추출 (우선순위)
    if (node && ts.isTypeQueryNode(node)) {
      // typeof의 경우 expression에서 타입을 가져와야 함
      const extractedType = context.checker.getTypeAtLocation(node.exprName);
      const targetDescription = node.exprName.getText();

      return {
        extractedType,
        targetDescription,
        targetCategory: this.categorizeTypeofTarget(node.exprName, context),
        expression: node.exprName,
      };
    }

    // TypeChecker에서 추출 (fallback)
    return {
      extractedType: type,
      targetDescription: context.checker.typeToString(type),
      targetCategory: "unknown",
      expression: undefined,
    };
  }

  /**
   * typeof 대상 분류
   */
  private categorizeTypeofTarget(
    expression: ts.EntityName,
    context: TypeCreationContext
  ): string {
    try {
      const symbol = context.checker.getSymbolAtLocation(expression);
      if (!symbol) return "unknown";

      const flags = symbol.flags;

      if (flags & ts.SymbolFlags.Variable) return "variable";
      if (flags & ts.SymbolFlags.Function) return "function";
      if (flags & ts.SymbolFlags.Class) return "class";
      if (flags & ts.SymbolFlags.Interface) return "interface";
      if (flags & ts.SymbolFlags.Namespace) return "namespace";
      if (flags & ts.SymbolFlags.ValueModule) return "module";

      // 타입 분석으로 추가 분류
      const type = context.checker.getTypeAtLocation(expression);
      if (this.isObjectType(type)) return "object";
      if (this.isFunctionType(type)) return "function";

      return "value";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * 추출 방법 결정
   */
  private determineExtractionMethod(targetCategory: string): string {
    const methodMap: Record<string, string> = {
      variable: "type-inspection",
      function: "signature-analysis",
      object: "structure-mapping",
      class: "constructor-analysis",
      namespace: "member-enumeration",
    };

    return methodMap[targetCategory] || "generic-extraction";
  }

  /**
   * typeof 복잡도 분석
   */
  private analyzeTypeofComplexity(
    result: string
  ): "simple" | "moderate" | "complex" {
    if (result.length < 20) return "simple";
    if (result.includes("=>") || result.includes("{")) return "complex";
    return "moderate";
  }

  // ==============================
  // 🔧 타입 판별
  // ==============================

  /**
   * typeof 연산자 타입인지 확인
   */
  private isTypeofOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
    // AST 노드 기반 확인
    if (node && ts.isTypeQueryNode(node)) {
      return true;
    }

    // TypeChecker 기반 확인은 복잡하므로 일단 false
    return false;
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 typeof 패턴들
   */
  static getSupportedTypes(): string[] {
    return [
      "typeof variable - extract variable type",
      "typeof function - extract function signature",
      "typeof object - extract object structure",
      "typeof class - extract constructor type",
      "typeof namespace - extract namespace type",
      "typeof module - extract module type",
      "typeof expression - extract expression type",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isTypeof = this.isTypeofOperatorType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `TypeofTypeHandler Debug Info:`,
      `  Is typeof: ${isTypeof}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
      `  Educational Process: enabled`,
      `  Structure Extraction: advanced`,
    ].join("\n");
  }

  /**
   * typeof 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedTarget: string;
    expectedResult: string;
  }> {
    return [
      {
        description: "Variable typeof",
        value: "typeof myVariable",
        expectedTarget: "variable",
        expectedResult: "inferred variable type",
      },
      {
        description: "Function typeof",
        value: "typeof myFunction",
        expectedTarget: "function",
        expectedResult: "function signature type",
      },
      {
        description: "Object typeof",
        value: "typeof myObject",
        expectedTarget: "object",
        expectedResult: "object structure type",
      },
      {
        description: "Class typeof",
        value: "typeof MyClass",
        expectedTarget: "class",
        expectedResult: "class constructor type",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface TypeofInfo {
  extractedType: ts.Type;
  targetDescription: string;
  targetCategory: string;
  expression?: ts.EntityName;
}

interface TargetAnalysisResult {
  method: string;
  structureDescription: string;
  complexity: string;
}

interface StructureExtractionResult {
  extractedType: ts.Type;
  description: string;
  steps: string[];
}

interface TypeofResult {
  resultNode: TypeNode;
  extractedStructure: string;
  warnings: string[];
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * typeof 타입 핸들러 인스턴스 생성
 */
export function createTypeofTypeHandler(): TypeofTypeHandler {
  return new TypeofTypeHandler();
}

/**
 * 타입이 typeof 타입인지 확인하는 헬퍼 함수
 */
export function isTypeofType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new TypeofTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 typeof 패턴 목록 조회
 */
export function getSupportedTypeofTypes(): string[] {
  return TypeofTypeHandler.getSupportedTypes();
}
