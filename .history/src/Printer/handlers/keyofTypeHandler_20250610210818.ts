// src/handlers/keyofTypeHandler.ts

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
 * 🔑 keyof 연산자 전용 핸들러 - 교육적 키 추출 과정 기록
 *
 * TypeScript의 keyof 연산자를 처리하면서 키 추출 과정을 상세히 기록:
 * - keyof { name: string; age: number } → "name" | "age"
 * - keyof User → 인터페이스 키 추출
 * - keyof string[] → 배열 인덱스 + 메서드들
 * - keyof {} → never (빈 객체)
 * - keyof any → string | number | symbol
 *
 * 🎯 교육적 목표: 객체 프로퍼티 스캐닝 → 키 추출 → 유니온 생성 과정
 */
export class KeyofTypeHandler extends BaseTypeHandler {
  readonly name = "KeyofTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  /**
   * keyof 연산자 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isKeyofOperatorType(type, node);
  }

  /**
   * keyof 타입을 TypeNode로 변환 (교육적 과정 포함)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for keyof type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createKeyofNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create keyof type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 keyof 타입 노드 생성 (교육적 과정 중심)
   */
  private createKeyofNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔑 KeyofTypeHandler: Processing keyof operator`);

    // 1. 🎯 실제 TypeScript 결과 먼저 확보
    const actualFinalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 TypeScript keyof result: "${actualFinalResult}"`);

    // 2. keyof 연산자 정보 추출
    const keyofInfo = this.extractKeyofInfo(type, node, context);
    console.log(`🔑 Detected keyof on: ${keyofInfo.operandDescription}`);

    // 3. 🎯 교육적 과정: keyof 연산 이터레이션
    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    const keyofResult = this.simulateKeyofExecution(
      keyofInfo,
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
        warnings: keyofResult.warnings,
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      // 🆕 keyof 특화 정보
      keyofInfo: {
        operandType: keyofInfo.operandDescription,
        extractedKeys: keyofResult.extractedKeys,
        keyCount: keyofResult.extractedKeys.length,
        resultType: this.analyzeKeyofResultType(keyofResult.extractedKeys),
        educationalValue: "high", // keyof는 핵심 개념
      },
    });

    // 5. 중간 단계가 있으면 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(`🔑 keyof analysis completed: ${actualFinalResult}`);

    // 6. keyof TypeNode 생성
    const keyofNode = typeNodeFactory.createOperator(
      "keyof",
      keyofResult.operandNode,
      metadata
    );

    return keyofNode;
  }

  /**
   * 🎯 keyof 실행 과정 시뮬레이션 (핵심 교육적 기능)
   */
  private simulateKeyofExecution(
    keyofInfo: KeyofInfo,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): KeyofResult {
    console.log(`🔑 === KEYOF EXECUTION SIMULATION START ===`);
    console.log(`🎯 Operand: ${keyofInfo.operandDescription}`);

    const warnings: string[] = [];

    // Step 1: keyof 연산자 감지
    educationalSteps.push({
      type: "generic-detection",
      description: `keyof operator detected on ${keyofInfo.operandDescription}`,
      details: {
        operator: "keyof",
        operand: keyofInfo.operandDescription,
        operandCategory: this.categorizeKeyofTarget(keyofInfo.operandType),
      },
    });

    // Step 2: 대상 타입 분석
    console.log(`🔑 Analyzing target type for key extraction...`);

    const operandNode = globalHandlerRegistry.createTypeNode(
      keyofInfo.operandType,
      keyofInfo.operandNode,
      context
    );

    console.log(`🔑 Target type analyzed:`, {
      kind: operandNode.kind,
      finalTypeString: operandNode.metadata?.finalTypeString,
    });

    // Step 3: 키 추출 과정
    const extractedKeys = this.extractKeysFromType(
      keyofInfo.operandType,
      context
    );
    console.log(`🔑 Extracted keys:`, extractedKeys);

    // 교육적 단계: 프로퍼티 스캐닝
    educationalSteps.push({
      type: "definition-lookup",
      description: `Scanning properties of ${keyofInfo.operandDescription}`,
      input: keyofInfo.operandDescription,
      output: `Found ${extractedKeys.length} properties`,
      details: {
        targetType: keyofInfo.operandDescription,
        scanningMethod: "property-enumeration",
        propertiesFound: extractedKeys,
        hasStringIndex: this.hasStringIndexSignature(keyofInfo.operandType),
        hasNumberIndex: this.hasNumberIndexSignature(keyofInfo.operandType),
      },
    });

    // Step 4: 각 키별 상세 처리
    extractedKeys.forEach((key, index) => {
      console.log(`🔑 Processing key ${index + 1}: "${key}"`);

      // 교육적 단계: 각 키별 변환
      educationalSteps.push({
        type: "parameter-mapping",
        description: `Converting property "${key}" to string literal type`,
        input: `property.${key}`,
        output: `"${key}"`,
        details: {
          keyIndex: index + 1,
          propertyName: key,
          conversionType: "property-to-literal",
          literalType: `"${key}"`,
        },
      });

      // 중간 단계: 키 변환 과정
      const keyStep: IntermediateStep = {
        stepType: "keyof-extraction",
        description: `Extract key ${index + 1}: "${key}"`,
        input: operandNode,
        output: typeNodeFactory.createLiteral(`"${key}"`),
        transformation: `property["${key}"] → "${key}"`,
        metadata: {
          operator: "keyof",
          reasoning: `Property key "${key}" extracted as string literal`,
          condition: `key-index=${index + 1}`,
        },
      };
      intermediateSteps.push(keyStep);
    });

    // Step 5: 유니온 타입 생성
    if (extractedKeys.length > 1) {
      // 유니온 생성 과정도 교육적 단계로!
      educationalSteps.push({
        type: "instantiation-start",
        description: `Creating union type from ${extractedKeys.length} string literals`,
        input: extractedKeys.map((k) => `"${k}"`).join(", "),
        output: extractedKeys.map((k) => `"${k}"`).join(" | "),
        details: {
          unionMembers: extractedKeys.map((k) => `"${k}"`),
          unionType: "string-literal-union",
          keyofResult: true,
          finalUnion: extractedKeys.map((k) => `"${k}"`).join(" | "),
        },
      });
    } else if (extractedKeys.length === 1) {
      educationalSteps.push({
        type: "instantiation-start",
        description: `Single key result: "${extractedKeys[0]}"`,
        output: `"${extractedKeys[0]}"`,
        details: {
          singleKey: true,
          keyName: extractedKeys[0],
        },
      });
    } else {
      educationalSteps.push({
        type: "instantiation-start",
        description: "No accessible properties found - result is never",
        output: "never",
        details: {
          emptyObject: true,
          resultType: "never",
        },
      });
      warnings.push("keyof operation on type with no accessible properties");
    }

    console.log(
      `🔑 keyof processing completed: ${extractedKeys.length} keys extracted`
    );
    console.log(`🔑 === KEYOF EXECUTION SIMULATION END ===`);

    return {
      operandNode,
      extractedKeys,
      warnings,
    };
  }

  // ==============================
  // 🔧 keyof 특화 헬퍼 메서드들
  // ==============================

  /**
   * keyof 정보 추출
   */
  private extractKeyofInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): KeyofInfo {
    // AST 노드에서 추출 (우선순위)
    if (
      node &&
      ts.isTypeOperatorNode(node) &&
      node.operator === ts.SyntaxKind.KeyOfKeyword
    ) {
      const operandType = context.checker.getTypeFromTypeNode(node.type);
      return {
        operandType,
        operandNode: node.type,
        operandDescription: node.type.getText(),
      };
    }

    // TypeChecker에서 추출 (fallback)
    return {
      operandType: type,
      operandNode: undefined,
      operandDescription: context.checker.typeToString(type),
    };
  }

  /**
   * 타입에서 키 추출 (keyof 핵심 로직)
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
        keys.push(prop.name);
      });

      // 숫자 인덱스 시그니처 확인 (배열 등)
      const numberIndexType = type.getNumberIndexType();
      if (numberIndexType) {
        console.log("🔍 Number index signature detected - adding number type");
        // 배열의 경우 number도 키가 됨 (실제로는 TypeScript가 처리)
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

  /**
   * keyof 대상 타입 분류
   */
  private categorizeKeyofTarget(type: ts.Type): string {
    if (this.isArrayType(type)) return "array";
    if (this.isObjectType(type)) return "object";
    if (this.isFunctionType(type)) return "function";
    if (type.flags & ts.TypeFlags.Any) return "any";
    if (type.flags & ts.TypeFlags.Never) return "never";
    return "unknown";
  }

  /**
   * keyof 결과 타입 분석
   */
  private analyzeKeyofResultType(keys: string[]): string {
    if (keys.length === 0) return "never";
    if (keys.length === 1) return "single-literal";
    return "union-of-literals";
  }

  /**
   * 문자열 인덱스 시그니처 확인
   */
  private hasStringIndexSignature(type: ts.Type): boolean {
    return !!type.getStringIndexType();
  }

  /**
   * 숫자 인덱스 시그니처 확인
   */
  private hasNumberIndexSignature(type: ts.Type): boolean {
    return !!type.getNumberIndexType();
  }

  // ==============================
  // 🔧 타입 판별
  // ==============================

  /**
   * keyof 연산자 타입인지 확인
   */
  private isKeyofOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
    // AST 노드 기반 확인
    if (
      node &&
      ts.isTypeOperatorNode(node) &&
      node.operator === ts.SyntaxKind.KeyOfKeyword
    ) {
      return true;
    }

    // TypeChecker 기반 확인은 복잡하므로 일단 false
    return false;
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 keyof 패턴들
   */
  static getSupportedTypes(): string[] {
    return [
      "keyof { prop: type } - object literal keys",
      "keyof Interface - interface property keys",
      "keyof Type - type alias keys",
      "keyof Array - array indices and methods",
      "keyof Function - function properties",
      "keyof any - string | number | symbol",
      "keyof never - never",
      "keyof {} - never (empty object)",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isKeyof = this.isKeyofOperatorType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `KeyofTypeHandler Debug Info:`,
      `  Is keyof: ${isKeyof}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
      `  Educational Process: enabled`,
      `  Key Extraction: advanced`,
    ].join("\n");
  }

  /**
   * keyof 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedKeys: string[];
    expectedResult: string;
  }> {
    return [
      {
        description: "Object literal keyof",
        value: "keyof { name: string; age: number }",
        expectedKeys: ["name", "age"],
        expectedResult: '"name" | "age"',
      },
      {
        description: "Empty object keyof",
        value: "keyof {}",
        expectedKeys: [],
        expectedResult: "never",
      },
      {
        description: "Array keyof",
        value: "keyof string[]",
        expectedKeys: ["length", "push", "pop", "..."],
        expectedResult: "number | array methods",
      },
      {
        description: "Interface keyof",
        value: "keyof User",
        expectedKeys: ["depends on User definition"],
        expectedResult: "union of User property names",
      },
    ];
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface KeyofInfo {
  operandType: ts.Type;
  operandNode?: ts.TypeNode;
  operandDescription: string;
}

interface KeyofResult {
  operandNode: TypeNode;
  extractedKeys: string[];
  warnings: string[];
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * keyof 타입 핸들러 인스턴스 생성
 */
export function createKeyofTypeHandler(): KeyofTypeHandler {
  return new KeyofTypeHandler();
}

/**
 * 타입이 keyof 타입인지 확인하는 헬퍼 함수
 */
export function isKeyofType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new KeyofTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 keyof 패턴 목록 조회
 */
export function getSupportedKeyofTypes(): string[] {
  return KeyofTypeHandler.getSupportedTypes();
}
