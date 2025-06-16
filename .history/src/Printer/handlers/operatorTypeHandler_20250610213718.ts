// src/handlers/operatorTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";

// 🎯 실제 연산자 핸들러들 import
import { KeyofTypeHandler } from "./keyofTypeHandler";
import { TypeofTypeHandler } from "./typeofTypeHandler";
import { InferTypeHandler } from "./inferTypeHandler";

/**
 * 🎯 연산자 타입 라우터 핸들러 - 연산자별 세부 핸들러로 분기
 */
export class OperatorTypeHandler extends BaseTypeHandler {
  readonly name = "OperatorTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  // 🎯 실제 연산자 핸들러들 (내부 관리)
  private keyofHandler = new KeyofTypeHandler();
  private typeofHandler = new TypeofTypeHandler();
  private inferHandler = new InferTypeHandler(); // ✅ 이미 준비됨

  /**
   * 모든 연산자 타입인지 확인 (라우터 엔드포인트)
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.detectOperatorType(type, node) !== null;
  }

  /**
   * 연산자 타입을 TypeNode로 변환 (라우터 역할)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    console.log(`🎯 OperatorTypeHandler: Routing operator type...`);

    // 1. 연산자 종류 감지
    const operatorType = this.detectOperatorType(type, node);

    if (!operatorType) {
      return this.createErrorNode(
        "Unknown operator type detected",
        type,
        node,
        context
      );
    }

    console.log(
      `🎯 Detected operator: ${operatorType} - routing to specialized handler`
    );

    // 2. 적절한 핸들러로 라우팅
    return this.routeToSpecializedHandler(operatorType, type, node, context);
  }

  /**
   * 🎯 연산자 종류 감지 (라우터 핵심 로직) - infer 지원 추가
   */
  private detectOperatorType(type: ts.Type, node?: ts.TypeNode): string | null {
    // AST 노드 기반 감지 (우선순위)
    if (node) {
      // keyof 연산자
      if (
        ts.isTypeOperatorNode(node) &&
        node.operator === ts.SyntaxKind.KeyOfKeyword
      ) {
        return "keyof";
      }

      // typeof 연산자
      if (ts.isTypeQueryNode(node)) {
        return "typeof";
      }

      // 🔥 infer 연산자 감지 활성화
      if (this.isInferTypeNode(node)) {
        return "infer";
      }
    }

    // TypeChecker 기반 감지 (fallback)
    // infer는 조건부 타입 내에서만 사용되므로 텍스트 기반으로도 체크
    if (node) {
      const nodeText = node.getText();
      if (nodeText.includes("infer ")) {
        return "infer";
      }
    }

    return null; // 감지되지 않음
  }

  /**
   * 🔥 infer 타입 노드 감지 (새로 추가)
   */
  private isInferTypeNode(node: ts.TypeNode): boolean {
    // 조건부 타입 내에서 infer 키워드 감지
    const nodeText = node.getText();

    // "infer R", "infer U", "infer A" 등의 패턴 감지
    if (nodeText.includes("infer ")) {
      return true;
    }

    // 조건부 타입 노드 내부 검사
    if (ts.isConditionalTypeNode(node)) {
      // extends 부분이나 true/false 브랜치에서 infer 키워드 찾기
      const extendsText = node.extendsType.getText();
      const trueText = node.trueType.getText();
      const falseText = node.falseType.getText();

      return (
        extendsText.includes("infer ") ||
        trueText.includes("infer ") ||
        falseText.includes("infer ")
      );
    }

    return false;
  }

  /**
   * 🎯 특화된 핸들러로 라우팅 (핵심 분기 로직) - infer 케이스 활성화
   */
  private routeToSpecializedHandler(
    operatorType: string,
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    console.log(`🎯 Routing to ${operatorType} handler...`);

    try {
      switch (operatorType) {
        case "keyof":
          console.log(`🔑 Delegating to KeyofTypeHandler`);
          return this.keyofHandler.createTypeNode(type, node, context);

        case "typeof":
          console.log(`🔍 Delegating to TypeofTypeHandler`);
          return this.typeofHandler.createTypeNode(type, node, context);

        case "infer":
          console.log(`🔬 Delegating to InferTypeHandler`); // ✅ 활성화
          return this.inferHandler.createTypeNode(type, node, context);

        default:
          console.warn(`⚠️ Unknown operator type: ${operatorType}`);
          return this.createErrorNode(
            `Unsupported operator: ${operatorType}`,
            type,
            node,
            context
          );
      }
    } catch (error) {
      console.error(`❌ Error in ${operatorType} handler:`, error);
      return this.createErrorNode(
        `Failed to process ${operatorType} operator: ${error}`,
        type,
        node,
        context
      );
    }
  }

  // ==============================
  // 🔧 라우터 관리 기능들 - infer 포함으로 업데이트
  // ==============================

  /**
   * 등록된 연산자 핸들러 목록 조회
   */
  getRegisteredOperators(): Array<{
    operator: string;
    handlerName: string;
    status: string;
  }> {
    return [
      {
        operator: "keyof",
        handlerName: this.keyofHandler.name,
        status: "active",
      },
      {
        operator: "typeof",
        handlerName: this.typeofHandler.name,
        status: "active",
      },
      {
        operator: "infer", // ✅ 추가
        handlerName: this.inferHandler.name,
        status: "active",
      },
    ];
  }

  /**
   * 특정 연산자 핸들러 상태 확인
   */
  isOperatorSupported(operatorType: string): boolean {
    const supportedOperators = ["keyof", "typeof", "infer"]; // ✅ infer 추가
    return supportedOperators.includes(operatorType);
  }

  /**
   * 연산자 핸들러 통계
   */
  getOperatorStats(): {
    totalOperators: number;
    activeOperators: number;
    supportedOperators: string[];
  } {
    const registered = this.getRegisteredOperators();
    const active = registered.filter((op) => op.status === "active");

    return {
      totalOperators: registered.length,
      activeOperators: active.length,
      supportedOperators: active.map((op) => op.operator),
    };
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 모든 연산자 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "keyof T - object key extraction (KeyofTypeHandler)",
      "typeof obj - type extraction (TypeofTypeHandler)",
      "infer R - type inference (InferTypeHandler)", // ✅ 추가
    ];
  }

  /**
   * 라우터 디버깅 정보
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const detectedOperator = this.detectOperatorType(type);
    const isSupported = detectedOperator
      ? this.isOperatorSupported(detectedOperator)
      : false;
    const stats = this.getOperatorStats();

    return [
      `OperatorTypeHandler (Router) Debug Info:`,
      `  Detected Operator: ${detectedOperator || "none"}`,
      `  Is Supported: ${isSupported}`,
      `  Active Handlers: ${stats.activeOperators}/${stats.totalOperators}`,
      `  Supported Operators: [${stats.supportedOperators.join(", ")}]`,
      `  Router Status: operational`,
    ].join("\n");
  }

  /**
   * 라우터 예시 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    operator: string;
    example: string;
    handlerUsed: string;
  }> {
    return [
      {
        description: "Key extraction routing",
        operator: "keyof",
        example: "keyof { name: string; age: number }",
        handlerUsed: "KeyofTypeHandler",
      },
      {
        description: "Type extraction routing",
        operator: "typeof",
        example: "typeof myVariable",
        handlerUsed: "TypeofTypeHandler",
      },
      {
        description: "Type inference routing", // ✅ 추가
        operator: "infer",
        example: "T extends (...args: any[]) => infer R ? R : never",
        handlerUsed: "InferTypeHandler",
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 연산자 라우터 핸들러 인스턴스 생성
 */
export function createOperatorTypeHandler(): OperatorTypeHandler {
  return new OperatorTypeHandler();
}

/**
 * 타입이 연산자 타입인지 확인하는 헬퍼 함수
 */
export function isOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
  const router = new OperatorTypeHandler();
  return router.isApplicable(type, node);
}

/**
 * 지원되는 모든 연산자 목록 조회
 */
export function getSupportedOperatorTypes(): string[] {
  return OperatorTypeHandler.getSupportedTypes();
}
