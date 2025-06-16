// src/handlers/conditionalTypeHandler.ts (Enhanced with Infer Support - 타입 안전성 수정)

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
 * 🎯 통합된 조건부 타입 핸들러 (infer 지원 포함)
 *
 * TypeScript의 조건부 타입과 infer 키워드를 통합 처리:
 * 1. 기본 조건부 타입: T extends U ? X : Y
 * 2. infer를 포함한 조건부 타입: T extends (...args: any[]) => infer R ? R : never
 * 3. 복합 infer 패턴: T extends `${infer A}-${infer B}` ? [A, B] : never
 * 4. 분산 조건부 타입 (distributive)
 * 5. 중첩 조건부 타입
 */
export class ConditionalTypeHandler extends BaseTypeHandler {
  readonly name = "ConditionalTypeHandler";
  readonly priority = HandlerPriority.MEDIUM; // 중간 우선순위 (50)

  /**
   * 조건부 타입 또는 infer 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return (
      this.isConditionalTypeWithType(type, node) || this.isInferType(type, node)
    );
  }

  /**
   * 조건부/infer 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for conditional type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createConditionalOrInferNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create conditional/infer type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 🎯 조건부 타입 또는 infer 타입 노드 생성 (통합 진입점)
   */
  private createConditionalOrInferNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ConditionalTypeHandler: Processing conditional/infer type`);

    // 1. TypeScript 컴파일러의 최종 결과 확보
    const finalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );
    console.log(`🎯 TypeScript final result: "${finalResult}"`);

    // 2. infer 단독 타입인지 확인
    if (
      this.isInferType(type, node) &&
      !this.isConditionalTypeWithType(type, node)
    ) {
      console.log(`🔬 Detected standalone infer type`);
      return this.createInferNode(type, node, context, finalResult);
    }

    // 3. 조건부 타입 분석 (infer 포함 가능)
    console.log(`🔍 Processing conditional type`);
    return this.createEnhancedConditionalNode(type, node, context, finalResult);
  }

  /**
   * 🔬 infer 전용 노드 생성
   */
  private createInferNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext,
    finalResult: string
  ): TypeNode {
    console.log(`🔬 Creating infer node`);

    // infer 정보 추출
    const inferInfo = this.extractInferInfo(type, node, context);

    // 교육적 단계 생성
    const educationalSteps: EducationalStep[] = [
      {
        type: "generic-detection",
        description: `Infer type variable detected: ${inferInfo.inferredVariable}`,
        details: {
          operator: "infer",
          variable: inferInfo.inferredVariable,
          pattern: inferInfo.inferPattern,
          context: inferInfo.conditionalContext,
        },
      },
      {
        type: "instantiation-start",
        description: `Type inference completed for variable ${inferInfo.inferredVariable}`,
        output: finalResult,
        details: {
          inferredType: finalResult,
          inferenceSuccess: true,
        },
      },
    ];

    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString: finalResult,
      educationalSteps,
      inferInfo: {
        inferredVariable: inferInfo.inferredVariable,
        inferPattern: inferInfo.inferPattern,
        conditionalContext: inferInfo.conditionalContext,
        educationalValue: "high",
      },
    });

    return typeNodeFactory.createOperator(
      "infer",
      typeNodeFactory.createPrimitive(finalResult),
      metadata
    );
  }

  /**
   * 🎯 향상된 조건부 타입 노드 생성
   */
  private createEnhancedConditionalNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext,
    finalResult: string
  ): TypeNode {
    console.log(`🔍 Creating enhanced conditional node`);

    // 조건부 타입 구조 분석
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

    console.log(
      `🔍 Conditional structure: ${conditionalStructure.condition || "unknown"}`
    );

    // 교육적 평가 과정 시뮬레이션
    const evaluationProcess = this.simulateConditionalEvaluation(
      conditionalStructure,
      finalResult,
      context
    );

    // 교육적 단계 및 중간 단계 생성
    const { educationalSteps, intermediateSteps } =
      this.generateEducationalContent(
        conditionalStructure,
        evaluationProcess,
        context
      );

    // 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString: finalResult,
      educationalSteps,
      conditionalEvaluationInfo: {
        condition: conditionalStructure.condition || "unknown",
        evaluationMethod: evaluationProcess.method,
        branchSelected: evaluationProcess.selectedBranch,
        reasoning: evaluationProcess.reasoning,
        hasInfer: conditionalStructure.hasInfer || false,
        isDistributive: conditionalStructure.isDistributive || false,
        complexityLevel: evaluationProcess.complexityLevel,
      },
      debug: {
        warnings: evaluationProcess.warnings,
      },
    });

    // 중간 단계 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(
      `✅ Enhanced conditional analysis completed: ${educationalSteps.length} steps generated`
    );

    return typeNodeFactory.createConditional(
      conditionalStructure.conditionalInfo!,
      metadata
    );
  }

  /**
   * 🔍 조건부 타입 구조 상세 분석 (infer 지원 강화)
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
      // 각 구성 요소 분석 및 TypeNode 생성
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

      // 🎯 핵심: 다른 핸들러들과의 상호작용 확인
      console.log(`🔗 Creating TypeNodes for conditional components...`);

      const checkTypeNode = globalHandlerRegistry.createTypeNode(
        checkType,
        conditionalNode.checkType,
        context
      );
      console.log(
        `🔗 checkType handled by: ${
          checkTypeNode.metadata?.handlerUsed || "unknown"
        }`
      );

      const extendsTypeNode = globalHandlerRegistry.createTypeNode(
        extendsType,
        conditionalNode.extendsType,
        context
      );
      console.log(
        `🔗 extendsType handled by: ${
          extendsTypeNode.metadata?.handlerUsed || "unknown"
        }`
      );

      const trueTypeNode = globalHandlerRegistry.createTypeNode(
        trueType,
        conditionalNode.trueType,
        context
      );
      console.log(
        `🔗 trueType handled by: ${
          trueTypeNode.metadata?.handlerUsed || "unknown"
        }`
      );

      const falseTypeNode = globalHandlerRegistry.createTypeNode(
        falseType,
        conditionalNode.falseType,
        context
      );
      console.log(
        `🔗 falseType handled by: ${
          falseTypeNode.metadata?.handlerUsed || "unknown"
        }`
      );

      // infer 패턴 감지 및 분석
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

      console.log(
        `🔍 Detected infer: ${hasInfer}, variables: [${inferVariables.join(
          ", "
        )}]`
      );
      console.log(`🔍 Distributive: ${isDistributive}`);

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
      console.error(`❌ Error analyzing conditional structure: ${error}`);
      return {
        isValid: false,
        reason: `Analysis failed: ${error}`,
      };
    }
  }

  /**
   * 🎯 조건부 타입 평가 과정 시뮬레이션 (infer 지원 강화)
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

    // 🔧 타입 안전성 수정: 기본값 제공
    const checkTypeStr = structure.checkTypeStr || "unknown";
    const extendsTypeStr = structure.extendsTypeStr || "unknown";
    const inferVariables = structure.inferVariables || [];

    // Step 1: 조건 설정
    evaluationSteps.push({
      stepNumber: 1,
      stepType: "condition-setup",
      description: `Setting up conditional evaluation: ${structure.condition}`,
      input: checkTypeStr,
      operation: "extends",
      operand: extendsTypeStr,
      result: "pending",
    });

    // Step 2: extends 관계 평가
    const extendsResult = this.evaluateExtendsRelationship(
      checkTypeStr,
      extendsTypeStr,
      context
    );

    evaluationSteps.push({
      stepNumber: 2,
      stepType: "extends-evaluation",
      description: `Evaluating: ${checkTypeStr} extends ${extendsTypeStr}`,
      input: `${checkTypeStr} extends ${extendsTypeStr}`,
      operation: "assignability-check",
      operand: "TypeScript type system",
      result: extendsResult.result ? "true" : "false",
      reasoning: extendsResult.reasoning,
    });

    // Step 3: infer 처리 (있는 경우)
    if (structure.hasInfer && inferVariables.length > 0) {
      const inferResult = this.processInferVariables(
        inferVariables,
        checkTypeStr,
        extendsTypeStr,
        context
      );

      evaluationSteps.push({
        stepNumber: 3,
        stepType: "infer-extraction",
        description: `Extracting infer variables: ${inferVariables.join(", ")}`,
        input: checkTypeStr,
        operation: "infer",
        operand: inferVariables.join(", "),
        result: inferResult.extractedTypes.join(", "),
        reasoning: inferResult.reasoning,
      });
    }

    // Step 4: 브랜치 선택
    const selectedBranch = extendsResult.result;
    const selectedTypeStr = selectedBranch
      ? structure.trueTypeStr || "true"
      : structure.falseTypeStr || "false";
    const branchName = selectedBranch ? "true branch" : "false branch";

    evaluationSteps.push({
      stepNumber: evaluationSteps.length + 1,
      stepType: "branch-selection",
      description: `Condition evaluated to ${
        selectedBranch ? "TRUE" : "FALSE"
      }, selecting ${branchName}`,
      input: `${selectedBranch ? "true" : "false"}`,
      operation: "branch-select",
      operand: branchName,
      result: selectedTypeStr,
    });

    // Step 5: 분산 처리 (distributive)
    if (structure.isDistributive) {
      evaluationSteps.push({
        stepNumber: evaluationSteps.length + 1,
        stepType: "distributive-evaluation",
        description: `Applying distributive conditional type behavior`,
        input: checkTypeStr,
        operation: "distribute",
        operand: "union members",
        result: "distributed result",
        reasoning:
          "Naked type parameter in check position triggers distribution",
      });
    }

    // Step 6: 최종 결과
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
    if ((structure.hasInfer || false) && (structure.isDistributive || false)) {
      complexityLevel = "complex";
    } else if (
      structure.hasInfer ||
      false ||
      structure.isDistributive ||
      false
    ) {
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
   * 🎯 교육적 컨텐츠 생성
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

    // 🔧 타입 안전성 수정: 기본값 제공
    const checkTypeStr = structure.checkTypeStr || "unknown";
    const extendsTypeStr = structure.extendsTypeStr || "unknown";
    const trueTypeStr = structure.trueTypeStr || "true";
    const falseTypeStr = structure.falseTypeStr || "false";
    const inferVariables = structure.inferVariables || [];

    // Step 1: 패턴 인식
    educationalSteps.push({
      type: "generic-detection",
      description: `Conditional type pattern detected: ${structure.condition}`,
      input: structure.condition,
      details: {
        pattern: "conditional",
        checkType: checkTypeStr,
        extendsType: extendsTypeStr,
        trueType: trueTypeStr,
        falseType: falseTypeStr,
        hasInfer: structure.hasInfer || false,
        isDistributive: structure.isDistributive || false,
        complexity: evaluation.complexityLevel,
        handlerInteractions: {
          checkTypeHandler: "detected",
          extendsTypeHandler: "detected",
          trueTypeHandler: "detected",
          falseTypeHandler: "detected",
        },
      },
    });

    // Step 2: 조건부 타입 원리
    educationalSteps.push({
      type: "definition-lookup",
      description: `Understanding conditional type evaluation`,
      input: "Conditional type mechanism",
      output: "Step-by-step evaluation process",
      details: {
        principle: "TypeScript checks if one type can be assigned to another",
        evaluationMethod: evaluation.method,
        stepsCount: evaluation.evaluationSteps.length,
        inferVariables: inferVariables,
      },
    });

    // Step 3: extends 관계 분석
    const extendsStep = evaluation.evaluationSteps.find(
      (s) => s.stepType === "extends-evaluation"
    );
    if (extendsStep) {
      educationalSteps.push({
        type: "parameter-mapping",
        description: `Evaluating extends relationship: ${checkTypeStr} extends ${extendsTypeStr}`,
        input: `${checkTypeStr} extends ${extendsTypeStr}`,
        output: extendsStep.result || "unknown",
        details: {
          checkType: checkTypeStr,
          extendsType: extendsTypeStr,
          assignable: extendsStep.result === "true",
          reasoning: extendsStep.reasoning || "TypeScript assignability check",
        },
      });
    }

    // Step 4: infer 처리 (있는 경우)
    if (structure.hasInfer && inferVariables.length > 0) {
      const inferStep = evaluation.evaluationSteps.find(
        (s) => s.stepType === "infer-extraction"
      );
      educationalSteps.push({
        type: "custom",
        description: `Extracting inferred type variables`,
        input: checkTypeStr,
        output: inferStep?.result || "inferred types",
        details: {
          inferVariables: inferVariables,
          extractionProcess: "pattern matching",
          inferredTypes: inferStep?.result?.split(", ") || [],
          reasoning: inferStep?.reasoning || "Type pattern matching",
        },
      });
    }

    // Step 5: 브랜치 선택
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

    // 중간 단계들
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
  // 🔧 infer 관련 헬퍼 메서드들
  // ==============================

  /**
   * infer 정보 추출
   */
  private extractInferInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): InferInfo {
    if (node) {
      const nodeText = node.getText();
      const inferMatch = nodeText.match(/infer\s+(\w+)/);
      if (inferMatch) {
        return {
          inferredVariable: inferMatch[1],
          inferPattern: "text-based-pattern",
          conditionalContext: nodeText,
          inferredType: type,
        };
      }
    }

    return {
      inferredVariable: "R",
      inferPattern: "generic-pattern",
      conditionalContext: node?.getText() || context.checker.typeToString(type),
      inferredType: type,
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
    return (
      ts.isTypeReferenceNode(checkTypeNode) &&
      ts.isIdentifier(checkTypeNode.typeName) &&
      checkTypeNode.typeName.text.length === 1
    );
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
   * infer 변수 처리 (향상된 버전)
   */
  private processInferVariables(
    variables: string[],
    checkType: string,
    extendsType: string,
    context: TypeCreationContext
  ): { extractedTypes: string[]; reasoning: string } {
    const extractedTypes: string[] = [];

    variables.forEach((variable) => {
      // 함수 반환 타입 추출
      if (extendsType.includes("=> infer") && checkType.includes("=>")) {
        const returnMatch = checkType.match(/=>\s*(.+)$/);
        if (returnMatch) {
          extractedTypes.push(returnMatch[1].trim());
        }
      }
      // 배열 요소 타입 추출
      else if (extendsType.includes("(infer") && checkType.includes("[]")) {
        const elementType = checkType.replace("[]", "");
        extractedTypes.push(elementType);
      }
      // Promise 내용 타입 추출
      else if (
        extendsType.includes("Promise<infer") &&
        checkType.includes("Promise<")
      ) {
        const promiseMatch = checkType.match(/Promise<(.+)>/);
        if (promiseMatch) {
          extractedTypes.push(promiseMatch[1]);
        }
      }
      // 객체 프로퍼티 타입 추출
      else if (extendsType.includes("{ ") && extendsType.includes(": infer")) {
        const propMatch = extendsType.match(/:\s*infer\s+\w+/);
        if (propMatch && checkType.includes("{")) {
          extractedTypes.push("extracted-property-type");
        }
      }
      // 템플릿 리터럴 추출
      else if (extendsType.includes("`") && extendsType.includes("${infer")) {
        extractedTypes.push("extracted-string-part");
      }
      // 기본값
      else {
        extractedTypes.push("unknown");
      }
    });

    return {
      extractedTypes,
      reasoning: `Pattern matching extracted ${extractedTypes.length} type variables from conditional type`,
    };
  }

  // ==============================
  // 🔧 기존 헬퍼 메서드들
  // ==============================

  private evaluateExtendsRelationship(
    checkType: string,
    extendsType: string,
    context: TypeCreationContext
  ): { result: boolean; reasoning: string } {
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

    return {
      result: false,
      reasoning: `${checkType} does not extend ${extendsType} (simplified evaluation)`,
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

  /**
   * 🔧 수정: BaseTypeHandler와 시그니처 일치
   * 조건부 타입인지 확인
   */
  protected isConditionalType(node?: ts.TypeNode): boolean {
    return node ? ts.isConditionalTypeNode(node) : false;
  }

  /**
   * 조건부 타입인지 확인 (type 매개변수 포함 버전)
   */
  private isConditionalTypeWithType(
    type: ts.Type,
    node?: ts.TypeNode
  ): boolean {
    return node ? ts.isConditionalTypeNode(node) : false;
  }

  /**
   * infer 타입인지 확인
   */
  private isInferType(type: ts.Type, node?: ts.TypeNode): boolean {
    if (node) {
      const nodeText = node.getText();
      return nodeText.includes("infer ");
    }

    const typeString = type.symbol?.name || "";
    return typeString.includes("infer");
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

  // ==============================
  // 🔧 지원 정보
  // ==============================

  static getSupportedTypes(): string[] {
    return [
      "T extends U ? X : Y - basic conditional types",
      "T extends (...args: any[]) => infer R ? R : never - function return type inference",
      "T extends (infer U)[] ? U : never - array element type inference",
      "T extends Promise<infer V> ? V : never - promise content type inference",
      "T extends { prop: infer P } ? P : never - object property type inference",
      "T extends `${infer A}-${infer B}` ? [A, B] : never - template literal inference",
      "Distributive conditional types with unions",
      "Nested conditional types",
    ];
  }

  static createExamples(): Array<{
    description: string;
    value: string;
    expectedBehavior: string;
  }> {
    return [
      {
        description: "Basic conditional type",
        value: "T extends string ? 'yes' : 'no'",
        expectedBehavior: "Returns 'yes' if T is string, 'no' otherwise",
      },
      {
        description: "Function return type inference",
        value: "T extends (...args: any[]) => infer R ? R : never",
        expectedBehavior: "Extracts return type R from function type T",
      },
      {
        description: "Array element inference",
        value: "T extends (infer U)[] ? U : never",
        expectedBehavior: "Extracts element type U from array type T",
      },
      {
        description: "Promise unwrapping",
        value: "T extends Promise<infer V> ? V : never",
        expectedBehavior: "Extracts wrapped type V from Promise<V>",
      },
      {
        description: "Template literal parsing",
        value: "T extends `${infer A}-${infer B}` ? [A, B] : never",
        expectedBehavior: "Extracts parts A and B from string literal",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들 (타입 안전성 수정)
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

interface InferInfo {
  inferredVariable: string;
  inferPattern: string;
  conditionalContext: string;
  inferredType: ts.Type;
}

// ==============================
// 🎯 편의 함수들
// ==============================

export function createConditionalTypeHandler(): ConditionalTypeHandler {
  return new ConditionalTypeHandler();
}

export function isConditionalOrInferType(
  type: ts.Type,
  node?: ts.TypeNode
): boolean {
  const handler = new ConditionalTypeHandler();
  return handler.isApplicable(type, node);
}

export function getSupportedConditionalTypes(): string[] {
  return ConditionalTypeHandler.getSupportedTypes();
}
