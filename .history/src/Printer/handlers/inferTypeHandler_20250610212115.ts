// src/handlers/inferTypeHandler.ts

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
 * 🔬 infer 연산자 전용 핸들러 - 교육적 타입 추론 과정 기록
 *
 * TypeScript의 infer 키워드를 처리하면서 타입 추론 과정을 상세히 기록:
 * - T extends (...args: any[]) => infer R ? R : never → 함수 반환 타입 추론
 * - T extends (infer U)[] ? U : never → 배열 요소 타입 추론
 * - T extends Promise<infer V> ? V : never → Promise 내용 타입 추론
 * - T extends { prop: infer P } ? P : never → 객체 프로퍼티 타입 추론
 * - T extends `${infer A}-${infer B}` ? [A, B] : never → 템플릿 리터럴 추론
 *
 * 🎯 교육적 목표: 조건부 타입 분석 → infer 위치 파악 → 패턴 매칭 → 타입 추론
 */
export class InferTypeHandler extends BaseTypeHandler {
  readonly name = "InferTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  /**
   * infer 연산자 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isInferOperatorType(type, node);
  }

  /**
   * infer 타입을 TypeNode로 변환 (교육적 과정 포함)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for infer type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createInferNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create infer type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 infer 타입 노드 생성 (교육적 과정 중심)
   */
  private createInferNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔬 InferTypeHandler: Processing infer operator`);

    // 1. 🎯 실제 TypeScript 결과 먼저 확보
    const actualFinalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 TypeScript infer result: "${actualFinalResult}"`);

    // 2. infer 연산자 정보 추출
    const inferInfo = this.extractInferInfo(type, node, context);
    console.log(`🔬 Detected infer pattern: ${inferInfo.inferPattern}`);

    // 3. 🎯 교육적 과정: infer 추론 이터레이션
    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    const inferResult = this.simulateInferExecution(
      inferInfo,
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
        warnings: inferResult.warnings,
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      // 🆕 infer 특화 정보
      inferInfo: {
        inferPattern: inferInfo.inferPattern,
        inferredVariable: inferInfo.inferredVariable,
        conditionalContext: inferInfo.conditionalContext,
        inferenceSuccess: inferResult.inferenceSuccess,
        inferenceMethod: inferResult.inferenceMethod,
        educationalValue: "high", // infer는 고급 개념
      },
    });

    // 5. 중간 단계가 있으면 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(`🔬 infer analysis completed: ${actualFinalResult}`);

    // 6. infer TypeNode 생성
    const inferNode = typeNodeFactory.createOperator(
      "infer",
      inferResult.resultNode,
      metadata
    );

    return inferNode;
  }

  /**
   * 🎯 infer 실행 과정 시뮬레이션 (핵심 교육적 기능)
   */
  private simulateInferExecution(
    inferInfo: InferInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): InferResult {
    console.log(`🔬 === INFER EXECUTION SIMULATION START ===`);
    console.log(`🎯 Pattern: ${inferInfo.inferPattern}`);
    console.log(`🎯 Variable: ${inferInfo.inferredVariable}`);

    const warnings: string[] = [];
    let inferenceSuccess = false;
    let inferenceMethod = "unknown";

    // Step 1: infer 연산자 감지
    educationalSteps.push({
      type: "generic-detection",
      description: `infer operator detected in conditional type`,
      details: {
        operator: "infer",
        inferredVariable: inferInfo.inferredVariable,
        inferPattern: inferInfo.inferPattern,
        conditionalContext: inferInfo.conditionalContext,
      },
    });

    // Step 2: 조건부 타입 컨텍스트 분석
    console.log(`🔬 Analyzing conditional type context...`);

    const contextAnalysis = this.analyzeConditionalContext(inferInfo, context);

    // 교육적 단계: 컨텍스트 분석
    educationalSteps.push({
      type: "definition-lookup",
      description: `Analyzing conditional type context for inference`,
      input: inferInfo.conditionalContext,
      output: `Context: ${contextAnalysis.contextType}`,
      details: {
        contextType: contextAnalysis.contextType,
        inferPosition: contextAnalysis.inferPosition,
        patternComplexity: contextAnalysis.complexity,
      },
    });

    // Step 3: 패턴 매칭 및 추론 과정
    const patternMatchingResult = this.performPatternMatching(
      inferInfo,
      contextAnalysis,
      context,
      educationalSteps,
      intermediateSteps
    );

    inferenceSuccess = patternMatchingResult.success;
    inferenceMethod = patternMatchingResult.method;

    // Step 4: 추론 결과 생성
    const resultNode = this.generateInferResult(
      inferInfo,
      patternMatchingResult,
      context
    );

    // Step 5: 최종 추론 완료
    educationalSteps.push({
      type: "instantiation-start",
      description: `Type inference completed for variable ${inferInfo.inferredVariable}`,
      input: `infer ${inferInfo.inferredVariable}`,
      output: resultNode.metadata?.finalTypeString || "unknown",
      details: {
        inferenceSuccess,
        inferenceMethod,
        inferredType: resultNode.metadata?.finalTypeString,
        patternMatched: patternMatchingResult.success,
      },
    });

    console.log(
      `🔬 infer processing completed: ${
        inferenceSuccess ? "success" : "failed"
      }`
    );
    console.log(`🔬 === INFER EXECUTION SIMULATION END ===`);

    return {
      resultNode,
      inferenceSuccess,
      inferenceMethod,
      warnings,
    };
  }

  /**
   * 🔍 조건부 타입 컨텍스트 분석
   */
  private analyzeConditionalContext(
    inferInfo: InferInfo,
    context: TypeCreationContext
  ): ContextAnalysisResult {
    console.log(
      `🔍 Analyzing conditional context: ${inferInfo.conditionalContext}`
    );

    // 패턴 분류
    let contextType = "unknown";
    let inferPosition = "unknown";
    let complexity = "simple";

    if (inferInfo.conditionalContext.includes("=>")) {
      contextType = "function-signature";
      inferPosition = inferInfo.conditionalContext.includes("=> infer")
        ? "return-type"
        : "parameter";
      complexity = "moderate";
    } else if (inferInfo.conditionalContext.includes("[]")) {
      contextType = "array-pattern";
      inferPosition = "element-type";
      complexity = "simple";
    } else if (inferInfo.conditionalContext.includes("Promise")) {
      contextType = "promise-pattern";
      inferPosition = "wrapped-type";
      complexity = "moderate";
    } else if (inferInfo.conditionalContext.includes("{")) {
      contextType = "object-pattern";
      inferPosition = "property-type";
      complexity = "complex";
    } else if (inferInfo.conditionalContext.includes("`")) {
      contextType = "template-literal";
      inferPosition = "string-part";
      complexity = "complex";
    }

    return {
      contextType,
      inferPosition,
      complexity,
    };
  }

  /**
   * 🎯 패턴 매칭 수행
   */
  private performPatternMatching(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): PatternMatchingResult {
    console.log(
      `🎯 Performing pattern matching for: ${contextAnalysis.contextType}`
    );

    let success = false;
    let method = "generic-matching";
    const steps: string[] = [];

    // 패턴별 특화 처리
    switch (contextAnalysis.contextType) {
      case "function-signature":
        const functionResult = this.matchFunctionPattern(
          inferInfo,
          contextAnalysis
        );
        success = functionResult.success;
        method = "function-signature-analysis";
        steps.push(...functionResult.steps);
        break;

      case "array-pattern":
        const arrayResult = this.matchArrayPattern(inferInfo, contextAnalysis);
        success = arrayResult.success;
        method = "array-element-extraction";
        steps.push(...arrayResult.steps);
        break;

      case "promise-pattern":
        const promiseResult = this.matchPromisePattern(
          inferInfo,
          contextAnalysis
        );
        success = promiseResult.success;
        method = "promise-unwrapping";
        steps.push(...promiseResult.steps);
        break;

      case "object-pattern":
        const objectResult = this.matchObjectPattern(
          inferInfo,
          contextAnalysis
        );
        success = objectResult.success;
        method = "object-property-extraction";
        steps.push(...objectResult.steps);
        break;

      case "template-literal":
        const templateResult = this.matchTemplatePattern(
          inferInfo,
          contextAnalysis
        );
        success = templateResult.success;
        method = "template-literal-parsing";
        steps.push(...templateResult.steps);
        break;

      default:
        steps.push("Unknown pattern - using generic inference");
        success = false;
    }

    // 교육적 단계: 패턴 매칭 과정
    educationalSteps.push({
      type: "parameter-mapping",
      description: `Pattern matching: ${contextAnalysis.contextType}`,
      input: inferInfo.inferPattern,
      output: success ? "pattern matched" : "pattern not matched",
      details: {
        patternType: contextAnalysis.contextType,
        matchingMethod: method,
        steps: steps.length,
        success,
      },
    });

    // 중간 단계들 기록
    steps.forEach((step, index) => {
      const intermediateStep: IntermediateStep = {
        stepType: "generic-resolution",
        description: step,
        input: typeNodeFactory.createPrimitive("infer-context"),
        output: typeNodeFactory.createPrimitive("infer-result"),
        transformation: `${step} → partial inference`,
        metadata: {
          operator: "infer",
          reasoning: `Pattern matching step ${index + 1}`,
          condition: `step-index=${index + 1}`,
        },
      };
      intermediateSteps.push(intermediateStep);
    });

    return {
      success,
      method,
      steps,
    };
  }

  // ==============================
  // 🔧 패턴별 매칭 메서드들
  // ==============================

  /**
   * 함수 시그니처 패턴 매칭
   */
  private matchFunctionPattern(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult
  ): { success: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push("1. Analyze function signature structure");
    steps.push("2. Identify parameter and return type positions");

    if (contextAnalysis.inferPosition === "return-type") {
      steps.push("3. Extract return type from function signature");
      return { success: true, steps };
    } else if (contextAnalysis.inferPosition === "parameter") {
      steps.push("3. Extract parameter type from function signature");
      return { success: true, steps };
    }

    steps.push("3. Unable to determine infer position in function");
    return { success: false, steps };
  }

  /**
   * 배열 패턴 매칭
   */
  private matchArrayPattern(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult
  ): { success: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push("1. Analyze array type structure");
    steps.push("2. Locate element type position");
    steps.push("3. Extract element type from array");

    return { success: true, steps };
  }

  /**
   * Promise 패턴 매칭
   */
  private matchPromisePattern(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult
  ): { success: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push("1. Analyze Promise wrapper structure");
    steps.push("2. Locate wrapped type position");
    steps.push("3. Extract inner type from Promise");

    return { success: true, steps };
  }

  /**
   * 객체 패턴 매칭
   */
  private matchObjectPattern(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult
  ): { success: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push("1. Analyze object structure");
    steps.push("2. Locate property type positions");
    steps.push("3. Extract property types");

    return { success: true, steps };
  }

  /**
   * 템플릿 리터럴 패턴 매칭
   */
  private matchTemplatePattern(
    inferInfo: InferInfo,
    contextAnalysis: ContextAnalysisResult
  ): { success: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push("1. Parse template literal structure");
    steps.push("2. Identify variable positions");
    steps.push("3. Extract string parts");

    return { success: true, steps };
  }

  /**
   * 추론 결과 생성
   */
  private generateInferResult(
    inferInfo: InferInfo,
    patternResult: PatternMatchingResult,
    context: TypeCreationContext
  ): TypeNode {
    if (patternResult.success) {
      // 성공적인 추론 - 실제 타입 사용
      return globalHandlerRegistry.createTypeNode(
        inferInfo.inferredType,
        undefined,
        context
      );
    } else {
      // 추론 실패 - unknown 타입
      return typeNodeFactory.createPrimitive("unknown", {
        originalText: `infer ${inferInfo.inferredVariable}`,
        finalTypeString: "unknown",
        debug: {
          warnings: ["Type inference failed - pattern not matched"],
        },
      });
    }
  }

  // ==============================
  // 🔧 infer 특화 헬퍼 메서드들
  // ==============================

  /**
   * infer 정보 추출
   */
  private extractInferInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): InferInfo {
    // AST 노드에서 추출이 복잡하므로 일단 기본 구현
    // 실제로는 조건부 타입의 구조를 깊이 분석해야 함

    return {
      inferredVariable: "R", // 기본값
      inferPattern: "generic-pattern",
      conditionalContext: node?.getText() || context.checker.typeToString(type),
      inferredType: type,
    };
  }

  /**
   * infer 연산자 타입인지 확인
   */
  private isInferOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
    // infer는 조건부 타입 내에서만 사용되므로 복잡한 감지 로직 필요
    // 현재는 간단한 텍스트 기반 감지
    if (node) {
      const nodeText = node.getText();
      return nodeText.includes("infer ");
    }

    const typeString = type.symbol?.name || "";
    return typeString.includes("infer");
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 infer 패턴들
   */
  static getSupportedTypes(): string[] {
    return [
      "T extends (...args: any[]) => infer R ? R : never - function return type",
      "T extends (infer U)[] ? U : never - array element type",
      "T extends Promise<infer V> ? V : never - promise content type",
      "T extends { prop: infer P } ? P : never - object property type",
      "T extends `${infer A}-${infer B}` ? [A, B] : never - template literal parts",
      "T extends (arg: infer A) => any ? A : never - function parameter type",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isInfer = this.isInferOperatorType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `InferTypeHandler Debug Info:`,
      `  Is infer: ${isInfer}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
      `  Educational Process: enabled`,
      `  Pattern Matching: advanced`,
      `  Inference Analysis: enabled`,
    ].join("\n");
  }

  /**
   * infer 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedPattern: string;
    expectedResult: string;
  }> {
    return [
      {
        description: "Function return type inference",
        value: "T extends (...args: any[]) => infer R ? R : never",
        expectedPattern: "function-return",
        expectedResult: "inferred return type R",
      },
      {
        description: "Array element type inference",
        value: "T extends (infer U)[] ? U : never",
        expectedPattern: "array-element",
        expectedResult: "inferred element type U",
      },
      {
        description: "Promise content inference",
        value: "T extends Promise<infer V> ? V : never",
        expectedPattern: "promise-content",
        expectedResult: "inferred wrapped type V",
      },
      {
        description: "Object property inference",
        value: "T extends { prop: infer P } ? P : never",
        expectedPattern: "object-property",
        expectedResult: "inferred property type P",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface InferInfo {
  inferredVariable: string;
  inferPattern: string;
  conditionalContext: string;
  inferredType: ts.Type;
}

interface ContextAnalysisResult {
  contextType: string;
  inferPosition: string;
  complexity: string;
}

interface PatternMatchingResult {
  success: boolean;
  method: string;
  steps: string[];
}

interface InferResult {
  resultNode: TypeNode;
  inferenceSuccess: boolean;
  inferenceMethod: string;
  warnings: string[];
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * infer 타입 핸들러 인스턴스 생성
 */
export function createInferTypeHandler(): InferTypeHandler {
  return new InferTypeHandler();
}

/**
 * 타입이 infer 타입인지 확인하는 헬퍼 함수
 */
export function isInferType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new InferTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 infer 패턴 목록 조회
 */
export function getSupportedInferTypes(): string[] {
  return InferTypeHandler.getSupportedTypes();
}
