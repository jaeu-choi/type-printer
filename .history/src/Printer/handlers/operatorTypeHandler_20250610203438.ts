// src/handlers/operatorTypeHandler.ts

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
 * 🎯 연산자 타입 핸들러 - 교육적 연산 과정 기록
 *
 * TypeScript의 타입 연산자들을 처리하면서 연산 과정을 상세히 기록:
 * - keyof T: 객체 키 추출 → 유니온 생성
 * - typeof obj: 값 타입 추출 → 구조 분석
 * - infer R: 조건부 타입 추론 (향후 확장)
 * - readonly T: 읽기 전용 변환
 * - required T: 필수 속성 변환
 *
 * 🎯 교육적 목표: 각 연산자의 동작 과정을 단계별 이터레이션으로 기록
 */
export class OperatorTypeHandler extends BaseTypeHandler {
  readonly name = "OperatorTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30) - Reference 다음

  /**
   * 연산자 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isOperatorType(type, node);
  }

  /**
   * 연산자 타입을 TypeNode로 변환 (교육적 과정 포함)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for operator type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createOperatorNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create operator type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 연산자 타입 노드 생성 (교육적 과정 중심)
   */
  private createOperatorNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 OperatorTypeHandler: Processing operator type`);

    // 1. 🎯 실제 TypeScript 결과 먼저 확보
    const actualFinalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 TypeScript operator result: "${actualFinalResult}"`);

    // 2. 연산자 정보 추출
    const operatorInfo = this.extractOperatorInfo(type, node, context);
    console.log(
      `🔍 Detected operator: ${operatorInfo.operator} on ${operatorInfo.operandDescription}`
    );

    // 3. 🎯 교육적 과정: 연산자별 처리 이터레이션
    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    const operationResult = this.simulateOperatorExecution(
      operatorInfo,
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
        warnings: operationResult.warnings,
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      // 🆕 연산자 특화 정보
      operatorInfo: {
        operator: operatorInfo.operator,
        operandType: operatorInfo.operandDescription,
        operationSteps: operationResult.steps,
        resultComplexity: this.analyzeResultComplexity(actualFinalResult),
        educationalValue: this.assessEducationalValue(operatorInfo.operator),
      },
    });

    // 5. 중간 단계가 있으면 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(`🔍 Operator analysis completed: ${actualFinalResult}`);

    // 6. 연산자 TypeNode 생성
    const operatorNode = typeNodeFactory.createOperator(
      operatorInfo.operator,
      operationResult.operandNode,
      metadata
    );

    return operatorNode;
  }

  /**
   * 🎯 연산자 실행 과정 시뮬레이션 (핵심 교육적 기능)
   */
  private simulateOperatorExecution(
    operatorInfo: OperatorInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): OperationResult {
    console.log(`🔍 === OPERATOR EXECUTION SIMULATION START ===`);
    console.log(`🎯 Operator: ${operatorInfo.operator}`);
    console.log(`🎯 Operand: ${operatorInfo.operandDescription}`);

    const warnings: string[] = [];
    const steps: string[] = [];

    // Step 1: 연산자 감지
    educationalSteps.push({
      type: "generic-detection",
      description: `${operatorInfo.operator} operator detected`,
      details: {
        operator: operatorInfo.operator,
        operand: operatorInfo.operandDescription,
        operatorCategory: this.categorizeOperator(operatorInfo.operator),
      },
    });

    let operandNode: TypeNode;

    // 연산자별 특화 처리
    switch (operatorInfo.operator) {
      case "keyof":
        const keyofResult = this.processKeyofOperator(
          operatorInfo,
          context,
          educationalSteps,
          intermediateSteps
        );
        operandNode = keyofResult.operandNode;
        steps.push(...keyofResult.steps);
        warnings.push(...keyofResult.warnings);
        break;

      case "typeof":
        const typeofResult = this.processTypeofOperator(
          operatorInfo,
          context,
          educationalSteps,
          intermediateSteps
        );
        operandNode = typeofResult.operandNode;
        steps.push(...typeofResult.steps);
        warnings.push(...typeofResult.warnings);
        break;

      default:
        // 일반적인 연산자 처리
        const genericResult = this.processGenericOperator(
          operatorInfo,
          context,
          educationalSteps,
          intermediateSteps
        );
        operandNode = genericResult.operandNode;
        steps.push(...genericResult.steps);
        warnings.push(...genericResult.warnings);
    }

    // Step Final: 연산 완료
    educationalSteps.push({
      type: "instantiation-start",
      description: `${operatorInfo.operator} operation completed`,
      output: operandNode.metadata?.finalTypeString || "unknown",
      details: {
        operator: operatorInfo.operator,
        stepsCount: steps.length,
        hasWarnings: warnings.length > 0,
        operationSuccess: true,
      },
    });

    console.log(`🔍 === OPERATOR EXECUTION SIMULATION END ===`);

    return {
      operandNode,
      steps,
      warnings,
    };
  }

  /**
   * 🔑 keyof 연산자 처리 (상세한 키 추출 과정)
   */
  private processKeyofOperator(
    operatorInfo: OperatorInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): OperatorProcessResult {
    console.log(`🔑 Processing keyof operator...`);

    const steps: string[] = [];
    const warnings: string[] = [];

    // Step 1: 대상 타입 분석
    steps.push("1. Analyze target type for key extraction");

    // 피연산자 TypeNode 생성
    const operandNode = globalHandlerRegistry.createTypeNode(
      operatorInfo.operandType,
      operatorInfo.operandNode,
      context
    );

    console.log(`🔑 Target type analyzed:`, {
      kind: operandNode.kind,
      finalTypeString: operandNode.metadata?.finalTypeString,
    });

    // Step 2: 키 추출 시뮬레이션
    const extractedKeys = this.extractKeysFromType(
      operatorInfo.operandType,
      context
    );
    steps.push(`2. Extract keys: found ${extractedKeys.length} properties`);

    // 교육적 단계: 각 키별 처리
    educationalSteps.push({
      type: "definition-lookup",
      description: `Extracting keys from ${operatorInfo.operandDescription}`,
      input: operatorInfo.operandDescription,
      output: extractedKeys.length > 0 ? extractedKeys.join(" | ") : "no keys",
      details: {
        targetType: operatorInfo.operandDescription,
        extractedKeys: extractedKeys,
        keyCount: extractedKeys.length,
        extractionMethod: "property-scanning",
      },
    });

    // Step 3: 각 키를 중간 단계로 기록
    extractedKeys.forEach((key, index) => {
      const keyStep: IntermediateStep = {
        stepType: "keyof-extraction",
        description: `Extract key ${index + 1}: "${key}"`,
        input: operandNode,
        output: typeNodeFactory.createLiteral(`"${key}"`),
        transformation: `property["${key}"] → "${key}"`,
        metadata: {
          operator: "keyof",
          reasoning: `Property key "${key}" extracted as string literal`,
        },
      };
      intermediateSteps.push(keyStep);
    });

    // Step 4: 유니온 타입 생성 시뮬레이션
    if (extractedKeys.length > 1) {
      steps.push(
        `3. Combine keys into union type: ${extractedKeys.join(" | ")}`
      );
    } else if (extractedKeys.length === 1) {
      steps.push(`3. Single key result: "${extractedKeys[0]}"`);
    } else {
      steps.push("3. No keys found - result is never");
      warnings.push("keyof operation on type with no accessible properties");
    }

    return {
      operandNode,
      steps,
      warnings,
    };
  }

  /**
   * 🔍 typeof 연산자 처리
   */
  private processTypeofOperator(
    operatorInfo: OperatorInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): OperatorProcessResult {
    console.log(`🔍 Processing typeof operator...`);

    const steps: string[] = [];
    const warnings: string[] = [];

    // Step 1: 값 또는 심볼 분석
    steps.push("1. Analyze value/symbol for type extraction");

    // 피연산자 TypeNode 생성
    const operandNode = globalHandlerRegistry.createTypeNode(
      operatorInfo.operandType,
      operatorInfo.operandNode,
      context
    );

    // Step 2: 타입 추출 과정
    steps.push("2. Extract type information from value");

    // 교육적 단계: typeof 과정
    educationalSteps.push({
      type: "definition-lookup",
      description: `Extracting type from ${operatorInfo.operandDescription}`,
      input: operatorInfo.operandDescription,
      output: operandNode.metadata?.finalTypeString || "unknown",
      details: {
        sourceValue: operatorInfo.operandDescription,
        extractedType: operandNode.metadata?.finalTypeString,
        extractionMethod: "value-type-analysis",
      },
    });

    return {
      operandNode,
      steps,
      warnings,
    };
  }

  /**
   * 🔧 일반적인 연산자 처리
   */
  private processGenericOperator(
    operatorInfo: OperatorInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): OperatorProcessResult {
    console.log(`🔧 Processing generic operator: ${operatorInfo.operator}`);

    const operandNode = globalHandlerRegistry.createTypeNode(
      operatorInfo.operandType,
      operatorInfo.operandNode,
      context
    );

    return {
      operandNode,
      steps: [`Generic ${operatorInfo.operator} operation applied`],
      warnings: [],
    };
  }

  // ==============================
  // 🔧 연산자 감지 및 추출
  // ==============================

  /**
   * 연산자 정보 추출
   */
  private extractOperatorInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): OperatorInfo {
    // AST 노드에서 추출 (우선순위)
    if (node) {
      const nodeOperator = this.extractOperatorFromNode(node, context);
      if (nodeOperator) return nodeOperator;
    }

    // TypeChecker에서 추출 (fallback)
    return this.extractOperatorFromType(type, context);
  }

  /**
   * AST 노드에서 연산자 추출
   */
  private extractOperatorFromNode(
    node: ts.TypeNode,
    context: TypeCreationContext
  ): OperatorInfo | null {
    // keyof 연산자
    if (
      ts.isTypeOperatorNode(node) &&
      node.operator === ts.SyntaxKind.KeyOfKeyword
    ) {
      const operandType = context.checker.getTypeFromTypeNode(node.type);
      return {
        operator: "keyof",
        operandType,
        operandNode: node.type,
        operandDescription: node.type.getText(),
      };
    }

    // typeof 연산자
    if (ts.isTypeQueryNode(node)) {
      // typeof의 경우 expression에서 타입을 가져와야 함
      const operandType = context.checker.getTypeAtLocation(node.exprName);
      return {
        operator: "typeof",
        operandType,
        operandNode: undefined, // expression은 TypeNode가 아님
        operandDescription: node.exprName.getText(),
      };
    }

    return null;
  }

  /**
   * TypeChecker에서 연산자 추출 (복잡함)
   */
  private extractOperatorFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): OperatorInfo {
    // TypeScript 내부 구조 접근이 필요한 복잡한 작업
    // 일단 기본 fallback
    return {
      operator: "unknown",
      operandType: type,
      operandNode: undefined,
      operandDescription: context.checker.typeToString(type),
    };
  }

  /**
   * 타입에서 키 추출 (keyof 구현)
   */
  private extractKeysFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): string[] {
    const keys: string[] = [];

    try {
      // 객체 타입의 프로퍼티들 추출
      const properties = type.getProperties();
      properties.forEach((prop) => {
        // public 프로퍼티만 추출
        if (!(prop.flags & ts.SymbolFlags.Private)) {
          keys.push(prop.name);
        }
      });

      // 숫자 인덱스 시그니처 확인
      const numberIndexType = type.getNumberIndexType();
      if (numberIndexType) {
        // 배열 같은 경우 숫자 키들도 포함될 수 있음
        console.log("🔍 Number index signature detected");
      }

      // 문자열 인덱스 시그니처 확인
      const stringIndexType = type.getStringIndexType();
      if (stringIndexType) {
        console.log("🔍 String index signature detected");
      }
    } catch (error) {
      console.warn(`⚠️ Failed to extract keys: ${error}`);
    }

    return keys.sort(); // 일관된 순서를 위해 정렬
  }

  // ==============================
  // 🔧 타입 판별 헬퍼들
  // ==============================

  /**
   * 연산자 타입인지 확인
   */
  private isOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
    // AST 노드 기반 확인
    if (node) {
      // keyof 연산자
      if (
        ts.isTypeOperatorNode(node) &&
        node.operator === ts.SyntaxKind.KeyOfKeyword
      ) {
        return true;
      }

      // typeof 연산자
      if (ts.isTypeQueryNode(node)) {
        return true;
      }

      // 다른 연산자들 추가 가능
    }

    // TypeChecker 기반 확인은 복잡하므로 일단 스킵
    return false;
  }

  /**
   * 연산자 분류
   */
  private categorizeOperator(operator: string): string {
    switch (operator) {
      case "keyof":
        return "key-extraction";
      case "typeof":
        return "type-extraction";
      case "readonly":
        return "modifier";
      case "required":
        return "modifier";
      default:
        return "unknown";
    }
  }

  /**
   * 결과 복잡도 분석
   */
  private analyzeResultComplexity(
    result: string
  ): "simple" | "moderate" | "complex" {
    if (result.length < 20) return "simple";
    if (result.length < 100) return "moderate";
    return "complex";
  }

  /**
   * 교육적 가치 평가
   */
  private assessEducationalValue(operator: string): "high" | "medium" | "low" {
    switch (operator) {
      case "keyof":
      case "typeof":
        return "high"; // 자주 사용되고 중요한 개념
      default:
        return "medium";
    }
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 연산자 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "keyof T - extract object keys as union",
      "typeof obj - extract type from value",
      "readonly T - add readonly modifier",
      "required T - remove optional modifiers",
      "infer R - type inference (in conditionals)",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isOperator = this.isOperatorType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `OperatorTypeHandler Debug Info:`,
      `  Is Operator: ${isOperator}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
      `  Educational Process: enabled`,
      `  Supported: keyof, typeof, readonly, required`,
    ].join("\n");
  }

  /**
   * 연산자 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedOperator: string;
    expectedResult: string;
  }> {
    return [
      {
        description: "keyof on object type",
        value: "keyof { name: string; age: number }",
        expectedOperator: "keyof",
        expectedResult: '"name" | "age"',
      },
      {
        description: "keyof on interface",
        value: "keyof User",
        expectedOperator: "keyof",
        expectedResult: "union of property names",
      },
      {
        description: "typeof on value",
        value: "typeof myVariable",
        expectedOperator: "typeof",
        expectedResult: "inferred type from value",
      },
      {
        description: "keyof on array",
        value: "keyof string[]",
        expectedOperator: "keyof",
        expectedResult: "number | array methods",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface OperatorInfo {
  operator: string;
  operandType: ts.Type;
  operandNode?: ts.TypeNode;
  operandDescription: string;
}

interface OperationResult {
  operandNode: TypeNode;
  steps: string[];
  warnings: string[];
}

interface OperatorProcessResult {
  operandNode: TypeNode;
  steps: string[];
  warnings: string[];
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 연산자 타입 핸들러 인스턴스 생성
 */
export function createOperatorTypeHandler(): OperatorTypeHandler {
  return new OperatorTypeHandler();
}

/**
 * 타입이 연산자 타입인지 확인하는 헬퍼 함수
 */
export function isOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new OperatorTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 연산자 목록 조회
 */
export function getSupportedOperatorTypes(): string[] {
  return OperatorTypeHandler.getSupportedTypes();
}
