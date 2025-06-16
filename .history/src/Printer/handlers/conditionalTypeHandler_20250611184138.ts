// src/handlers/conditionalTypeHandler.ts (Enhanced Version)

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  ConditionalTypeInfo,
  EducationalStep,
  IntermediateStep,
} from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 교육적 조건부 타입 핸들러 (Enhanced)
 *
 * 진짜 이터레이션을 만들 수 있도록 조건부 타입의 평가 과정을 상세히 기록합니다:
 * 1. 조건부 타입 구조 분석 (T extends U ? X : Y)
 * 2. 실제 extends 관계 평가 과정
 * 3. 브랜치 선택 논리
 * 4. infer 타입 변수 추출 (있는 경우)
 * 5. 분산 조건부 타입 처리 (distributive)
 * 6. 최종 타입 계산 과정
 */
export class EnhancedConditionalTypeHandler extends BaseTypeHandler {
  readonly name = "ConditionalTypeHandler";
  readonly priority = HandlerPriority.MEDIUM;

  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isConditionalType(type, node);
  }

  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    if (!this.ensureContext(context)) {
      return this.createErrorNode("No context provided", type, node, context);
    }

    return this.safeCreateTypeNode(
      () => this.createEnhancedConditionalNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create conditional type",
          type,
          node,
          context
        )
    );
  }

  /**
   * 🎯 교육적 조건부 타입 노드 생성 (핵심 메서드)
   */
  private createEnhancedConditionalNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ConditionalTypeHandler: Starting educational analysis`);

    // 1. TypeScript 컴파일러의 최종 결과 확보
    const finalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );
    console.log(`🎯 TypeScript final result: "${finalResult}"`);

    // 2. 조건부 타입 구조 상세 분석
    const conditionalStructure = this.analyzeConditionalStructure(
      type,
      node,
      context
    );

    if (!conditionalStructure.isValid) {
      console.warn(`⚠️ Could not analyze conditional structure`);
      return this.createFallbackConditionalNode(
        type,
        node,
        context,
        finalResult
      );
    }

    console.log(`🔍 Conditional structure: ${conditionalStructure.condition}`);

    // 3. 🎯 핵심: 교육적 평가 과정 시뮬레이션
    const evaluationProcess = this.simulateConditionalEvaluation(
      conditionalStructure,
      finalResult,
      context
    );

    // 4. 교육적 단계 및 중간 단계 생성
    const { educationalSteps, intermediateSteps } =
      this.generateEducationalContent(
        conditionalStructure,
        evaluationProcess,
        context
      );

    // 5. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "educational-simulation", // 🆕 교육적 시뮬레이션
      finalTypeString: finalResult,
      educationalSteps, // 🎯 핵심: 풍부한 교육적 내용
      conditionalEvaluationInfo: {
        condition: conditionalStructure.condition,
        evaluationMethod: evaluationProcess.method,
        branchSelected: evaluationProcess.selectedBranch,
        reasoning: evaluationProcess.reasoning,
        hasInfer: conditionalStructure.hasInfer,
        isDistributive: conditionalStructure.isDistributive,
        complexityLevel: evaluationProcess.complexityLevel,
      },
      debug: {
        warnings: evaluationProcess.warnings,
      },
    });

    // 6. 중간 단계 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(
      `✅ Educational analysis completed: ${educationalSteps.length} steps generated`
    );

    // 7. 조건부 TypeNode 생성
    return typeNodeFactory.createConditional(
      conditionalStructure.conditionalInfo,
      metadata
    );
  }

  /**
   * 🔍 조건부 타입 구조 상세 분석
   */
  private analyzeConditionalStructure(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): ConditionalStructureAnalysis {
    if (!node || !ts.isConditionalTypeNode(node)) {
      return { isValid: false, reason: "No conditional type node available" };
    }

    const conditionalNode = node;

    try {
      // 각 구성 요소 분석
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

      // 구성 요소들을 TypeNode로 변환
      const checkTypeNode = globalHandlerRegistry.createTypeNode(
        checkType,
        conditionalNode.checkType,
        context
      );
      const extendsTypeNode = globalHandlerRegistry.createTypeNode(
        extendsType,
        conditionalNode.extendsType,
        context
      );
      const trueTypeNode = globalHandlerRegistry.createTypeNode(
        trueType,
        conditionalNode.trueType,
        context
      );
      const falseTypeNode = globalHandlerRegistry.createTypeNode(
        falseType,
        conditionalNode.falseType,
        context
      );

      // 특수 패턴 감지
      const hasInfer = this.detectInferPattern(conditionalNode.extendsType);
      const isDistributive = this.detectDistributivePattern(
        conditionalNode.checkType
      );
      const inferVariables = hasInfer
        ? this.extractInferVariables(conditionalNode.extendsType)
        : [];

      // 조건 문자열 생성
      const checkTypeStr = this.getTypeNodeString(checkTypeNode);
      const extendsTypeStr = this.getTypeNodeString(extendsTypeNode);
      const condition = `${checkTypeStr} extends ${extendsTypeStr}`;

      return {
        isValid: true,
        conditionalInfo: {
          checkType: checkTypeNode,
          extendsType: extendsTypeNode,
          trueType: trueTypeNode,
          falseType: falseTypeNode,
        },
        condition,
        hasInfer,
        isDistributive,
        inferVariables,
        checkTypeStr,
        extendsTypeStr,
        trueTypeStr: this.getTypeNodeString(trueTypeNode),
        falseTypeStr: this.getTypeNodeString(falseTypeNode),
      };
    } catch (error) {
      return {
        isValid: false,
        reason: `Analysis failed: ${error}`,
      };
    }
  }

  /**
   * 🎯 조건부 타입 평가 과정 시뮬레이션 (핵심)
   */
  private simulateConditionalEvaluation(
    structure: ConditionalStructureAnalysis,
    finalResult: string,
    context: TypeCreationContext
  ): ConditionalEvaluationProcess {
    if (!structure.isValid) {
      return {
        method: "fallback",
        selectedBranch: undefined,
        reasoning: "Could not analyze structure",
        complexityLevel: "unknown",
        warnings: ["Structure analysis failed"],
        evaluationSteps: [],
      };
    }

    console.log(`🎯 Simulating evaluation: ${structure.condition}`);

    const evaluationSteps: EvaluationStep[] = [];
    const warnings: string[] = [];

    // Step 1: 조건 설정
    evaluationSteps.push({
      stepNumber: 1,
      stepType: "condition-setup",
      description: `Setting up conditional evaluation: ${structure.condition}`,
      input: structure.checkTypeStr,
      operation: "extends",
      operand: structure.extendsTypeStr,
      result: "pending",
    });

    // Step 2: extends 관계 평가
    const extendsResult = this.evaluateExtendsRelationship(
      structure.checkTypeStr,
      structure.extendsTypeStr,
      context
    );

    evaluationSteps.push({
      stepNumber: 2,
      stepType: "extends-evaluation",
      description: `Evaluating: ${structure.checkTypeStr} extends ${structure.extendsTypeStr}`,
      input: `${structure.checkTypeStr} extends ${structure.extendsTypeStr}`,
      operation: "assignability-check",
      operand: "TypeScript type system",
      result: extendsResult.result ? "true" : "false",
      reasoning: extendsResult.reasoning,
    });

    // Step 3: 브랜치 선택
    const selectedBranch = extendsResult.result;
    const selectedTypeStr = selectedBranch
      ? structure.trueTypeStr
      : structure.falseTypeStr;
    const branchName = selectedBranch ? "true branch" : "false branch";

    evaluationSteps.push({
      stepNumber: 3,
      stepType: "branch-selection",
      description: `Condition evaluated to ${
        selectedBranch ? "TRUE" : "FALSE"
      }, selecting ${branchName}`,
      input: `${selectedBranch ? "true" : "false"}`,
      operation: "branch-select",
      operand: branchName,
      result: selectedTypeStr,
    });

    // Step 4: infer 처리 (있는 경우)
    if (structure.hasInfer && selectedBranch) {
      const inferResult = this.processInferVariables(
        structure.inferVariables,
        structure.checkTypeStr,
        context
      );

      evaluationSteps.push({
        stepNumber: 4,
        stepType: "infer-extraction",
        description: `Extracting infer variables: ${structure.inferVariables.join(
          ", "
        )}`,
        input: structure.checkTypeStr,
        operation: "infer",
        operand: structure.inferVariables.join(", "),
        result: inferResult.extractedTypes.join(", "),
        reasoning: inferResult.reasoning,
      });
    }

    // Step 5: 분산 처리 (distributive)
    if (structure.isDistributive) {
      evaluationSteps.push({
        stepNumber: evaluationSteps.length + 1,
        stepType: "distributive-evaluation",
        description: `Applying distributive conditional type behavior`,
        input: structure.checkTypeStr,
        operation: "distribute",
        operand: "union members",
        result: "distributed result",
        reasoning:
          "Naked type parameter in check position triggers distribution",
      });
    }

    // Step 6: 최종 결과 확인
    evaluationSteps.push({
      stepNumber: evaluationSteps.length + 1,
      stepType: "final-result",
      description: `Final conditional type result`,
      input: selectedTypeStr,
      operation: "finalize",
      operand: "conditional evaluation",
      result: finalResult,
      reasoning: `TypeScript computed: ${finalResult}`,
    });

    // 복잡도 결정
    let complexityLevel: "simple" | "moderate" | "complex";
    if (structure.hasInfer && structure.isDistributive) {
      complexityLevel = "complex";
    } else if (structure.hasInfer || structure.isDistributive) {
      complexityLevel = "moderate";
    } else {
      complexityLevel = "simple";
    }

    return {
      method: "step-by-step-simulation",
      selectedBranch,
      reasoning: `Conditional type evaluation completed with ${evaluationSteps.length} steps`,
      complexityLevel,
      warnings,
      evaluationSteps,
    };
  }

  /**
   * 🎯 교육적 컨텐츠 생성 (EducationalStep[] + IntermediateStep[])
   */
  private generateEducationalContent(
    structure: ConditionalStructureAnalysis,
    evaluation: ConditionalEvaluationProcess,
    context: TypeCreationContext
  ): {
    educationalSteps: EducationalStep[];
    intermediateSteps: IntermediateStep[];
  } {
    if (!structure.isValid) {
      return { educationalSteps: [], intermediateSteps: [] };
    }

    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    // Educational Step 1: 조건부 타입 패턴 인식
    educationalSteps.push({
      type: "generic-detection",
      description: `Conditional type pattern detected: T extends U ? X : Y`,
      input: structure.condition,
      details: {
        pattern: "conditional",
        checkType: structure.checkTypeStr,
        extendsType: structure.extendsTypeStr,
        trueType: structure.trueTypeStr,
        falseType: structure.falseTypeStr,
        hasInfer: structure.hasInfer,
        isDistributive: structure.isDistributive,
        complexity: evaluation.complexityLevel,
      },
    });

    // Educational Step 2: 조건부 타입의 작동 원리
    educationalSteps.push({
      type: "definition-lookup",
      description: `Understanding conditional type evaluation`,
      input: "Conditional type mechanism",
      output: "Step-by-step evaluation process",
      details: {
        principle: "TypeScript checks if one type can be assigned to another",
        evaluationMethod: evaluation.method,
        stepsCount: evaluation.evaluationSteps.length,
        evaluationSteps: evaluation.evaluationSteps.map((step) => ({
          step: step.stepNumber,
          description: step.description,
          operation: step.operation,
          result: step.result,
        })),
      },
    });

    // Educational Step 3: extends 관계 분석
    const extendsStep = evaluation.evaluationSteps.find(
      (s) => s.stepType === "extends-evaluation"
    );
    if (extendsStep) {
      educationalSteps.push({
        type: "parameter-mapping",
        description: `Evaluating extends relationship: ${structure.checkTypeStr} extends ${structure.extendsTypeStr}`,
        input: `${structure.checkTypeStr} extends ${structure.extendsTypeStr}`,
        output: extendsStep.result || "unknown",
        details: {
          checkType: structure.checkTypeStr,
          extendsType: structure.extendsTypeStr,
          assignable: extendsStep.result === "true",
          reasoning: extendsStep.reasoning || "TypeScript assignability check",
          evaluationMethod: "assignability-analysis",
        },
      });
    }

    // Educational Step 4: 브랜치 선택 과정
    const branchStep = evaluation.evaluationSteps.find(
      (s) => s.stepType === "branch-selection"
    );
    if (branchStep) {
      educationalSteps.push({
        type: "instantiation-start",
        description: `Selecting conditional branch based on evaluation result`,
        input: branchStep.input || "boolean",
        output: branchStep.result || "selected type",
        details: {
          conditionResult: evaluation.selectedBranch,
          selectedBranch: evaluation.selectedBranch
            ? "true branch"
            : "false branch",
          selectedType: branchStep.result,
          reasoning: `Condition evaluated to ${
            evaluation.selectedBranch ? "TRUE" : "FALSE"
          }`,
        },
      });
    }

    // Educational Step 5: infer 처리 (있는 경우)
    if (structure.hasInfer) {
      const inferStep = evaluation.evaluationSteps.find(
        (s) => s.stepType === "infer-extraction"
      );
      educationalSteps.push({
        type: "custom",
        description: `Extracting inferred type variables`,
        input: structure.checkTypeStr,
        output: inferStep?.result || "inferred types",
        details: {
          inferVariables: structure.inferVariables,
          extractionProcess: "pattern matching",
          inferredTypes: inferStep?.result?.split(", ") || [],
          reasoning:
            inferStep?.reasoning || "Type pattern matching with infer keywords",
        },
      });
    }

    // Intermediate Steps: 각 평가 단계를 중간 단계로 기록
    evaluation.evaluationSteps.forEach((step, index) => {
      const intermediateStep: IntermediateStep = {
        stepType: this.mapStepTypeToIntermediateType(step.stepType),
        description: step.description,
        input: typeNodeFactory.createLiteral(step.input || "unknown"),
        output: typeNodeFactory.createLiteral(step.result || "unknown"),
        transformation: `${step.operation} → ${step.result}`,
        metadata: {
          reasoning:
            step.reasoning ||
            `Step ${step.stepNumber} of conditional evaluation`,
          operator: "conditional",
          condition: step.operation,
        },
      };
      intermediateSteps.push(intermediateStep);
    });

    return { educationalSteps, intermediateSteps };
  }

  // ==============================
  // 🔧 헬퍼 메서드들
  // ==============================

  /**
   * extends 관계 평가 (assignability check 시뮬레이션)
   */
  private evaluateExtendsRelationship(
    checkType: string,
    extendsType: string,
    context: TypeCreationContext
  ): { result: boolean; reasoning: string } {
    // 간단한 규칙 기반 평가 (실제로는 TypeScript의 복잡한 로직)
    if (checkType === extendsType) {
      return { result: true, reasoning: "Identical types are assignable" };
    }

    if (extendsType === "any") {
      return { result: true, reasoning: "All types extend any" };
    }

    if (extendsType === "unknown") {
      return { result: true, reasoning: "All types extend unknown" };
    }

    if (checkType === "never") {
      return { result: true, reasoning: "never extends all types" };
    }

    if (checkType === "any") {
      return { result: false, reasoning: "any has special extends behavior" };
    }

    // 리터럴 타입 체크
    if (checkType.includes('"') && extendsType === "string") {
      return { result: true, reasoning: "String literals extend string" };
    }

    if (!isNaN(Number(checkType)) && extendsType === "number") {
      return { result: true, reasoning: "Number literals extend number" };
    }

    // 함수 타입 체크
    if (checkType.includes("=>") && extendsType.includes("=>")) {
      return {
        result: true,
        reasoning: "Function types (simplified assignability)",
      };
    }

    // 배열 타입 체크
    if (checkType.includes("[]") && extendsType.includes("[]")) {
      return {
        result: true,
        reasoning: "Array types (simplified assignability)",
      };
    }

    // 기본적으로는 false (실제로는 더 복잡한 로직 필요)
    return {
      result: false,
      reasoning: `${checkType} does not extend ${extendsType} (simplified evaluation)`,
    };
  }

  /**
   * infer 패턴 감지
   */
  private detectInferPattern(extendsTypeNode: ts.TypeNode): boolean {
    return extendsTypeNode.getText().includes("infer ");
  }

  /**
   * 분산 조건부 타입 감지
   */
  private detectDistributivePattern(checkTypeNode: ts.TypeNode): boolean {
    // naked type parameter 인지 확인
    return (
      ts.isTypeReferenceNode(checkTypeNode) &&
      ts.isIdentifier(checkTypeNode.typeName) &&
      checkTypeNode.typeName.text.length === 1
    ); // T, U, K 등
  }

  /**
   * infer 변수 추출
   */
  private extractInferVariables(extendsTypeNode: ts.TypeNode): string[] {
    const text = extendsTypeNode.getText();
    const inferMatches = text.match(/infer\s+(\w+)/g);
    return inferMatches
      ? inferMatches.map((match) => match.replace("infer ", ""))
      : [];
  }

  /**
   * infer 변수 처리
   */
  private processInferVariables(
    variables: string[],
    checkType: string,
    context: TypeCreationContext
  ): { extractedTypes: string[]; reasoning: string } {
    // 간단한 패턴 매칭 (실제로는 더 복잡함)
    const extractedTypes: string[] = [];

    variables.forEach((variable) => {
      // 함수 반환 타입 추출
      if (checkType.includes("=>")) {
        const returnMatch = checkType.match(/=>\s*(.+)$/);
        if (returnMatch) {
          extractedTypes.push(returnMatch[1].trim());
        }
      }
      // 배열 요소 타입 추출
      else if (checkType.includes("[]")) {
        const elementType = checkType.replace("[]", "");
        extractedTypes.push(elementType);
      }
      // 기본값
      else {
        extractedTypes.push("unknown");
      }
    });

    return {
      extractedTypes,
      reasoning: `Pattern matching extracted ${extractedTypes.length} type variables`,
    };
  }

  private mapStepTypeToIntermediateType(stepType: string): any {
    const mapping: Record<string, any> = {
      "condition-setup": "conditional-evaluation",
      "extends-evaluation": "conditional-evaluation",
      "branch-selection": "conditional-evaluation",
      "infer-extraction": "generic-resolution",
      "distributive-evaluation": "union-distribution",
      "final-result": "conditional-evaluation",
    };
    return mapping[stepType] || "conditional-evaluation";
  }

  private getTypeNodeString(node: TypeNode): string {
    return (
      node.metadata?.finalTypeString || node.literal || node.name || "unknown"
    );
  }

  private isConditionalType(type: ts.Type, node?: ts.TypeNode): boolean {
    return node ? ts.isConditionalTypeNode(node) : false;
  }

  private createFallbackConditionalNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext,
    finalResult: string
  ): TypeNode {
    return typeNodeFactory.createPrimitive(finalResult, {
      originalText: node?.getText() || "conditional",
      finalTypeString: finalResult,
      debug: { warnings: ["Fallback conditional type node"] },
    });
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface ConditionalStructureAnalysis {
  isValid: boolean;
  reason?: string;
  conditionalInfo?: ConditionalTypeInfo;
  condition?: string;
  hasInfer?: boolean;
  isDistributive?: boolean;
  inferVariables?: string[];
  checkTypeStr?: string;
  extendsTypeStr?: string;
  trueTypeStr?: string;
  falseTypeStr?: string;
}

interface ConditionalEvaluationProcess {
  method: string;
  selectedBranch?: boolean;
  reasoning: string;
  complexityLevel: "simple" | "moderate" | "complex" | "unknown";
  warnings: string[];
  evaluationSteps: EvaluationStep[];
}

interface EvaluationStep {
  stepNumber: number;
  stepType:
    | "condition-setup"
    | "extends-evaluation"
    | "branch-selection"
    | "infer-extraction"
    | "distributive-evaluation"
    | "final-result";
  description: string;
  input?: string;
  operation: string;
  operand?: string;
  result?: string;
  reasoning?: string;
}

export { EnhancedConditionalTypeHandler as ConditionalTypeHandler };
