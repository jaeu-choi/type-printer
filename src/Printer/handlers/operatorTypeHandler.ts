// src/handlers/operatorTypeHandler.ts (Updated - infer removed)

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";

// 🎯 실제 연산자 핸들러들 import (infer 제거)
import { KeyofTypeHandler } from "./keyofTypeHandler";
import { TypeofTypeHandler } from "./typeofTypeHandler";

/**
 * 🎯 연산자 타입 라우터 핸들러 - keyof, typeof 전용 (infer는 ConditionalTypeHandler로 이동)
 */
export class OperatorTypeHandler extends BaseTypeHandler {
  readonly name = "OperatorTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  // 🎯 실제 연산자 핸들러들 (infer 제거됨)
  private keyofHandler = new KeyofTypeHandler();
  private typeofHandler = new TypeofTypeHandler();

  /**
   * keyof, typeof 연산자 타입인지 확인 (infer 제외)
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
   * 🎯 연산자 종류 감지 (infer 제거됨)
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

      // 🚫 infer 연산자 제거됨 (ConditionalTypeHandler로 이동)
    }

    return null; // 감지되지 않음
  }

  /**
   * 🎯 특화된 핸들러로 라우팅 (infer 케이스 제거됨)
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
  // 🔧 라우터 관리 기능들 (infer 제거로 업데이트)
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
      // 🚫 infer 제거됨
    ];
  }

  /**
   * 특정 연산자 핸들러 상태 확인
   */
  isOperatorSupported(operatorType: string): boolean {
    const supportedOperators = ["keyof", "typeof"]; // 🚫 infer 제거됨
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
   * 지원하는 모든 연산자 목록 (infer 제거됨)
   */
  static getSupportedTypes(): string[] {
    return [
      "keyof T - object key extraction (KeyofTypeHandler)",
      "typeof obj - type extraction (TypeofTypeHandler)",
      // 🚫 "infer R - type inference" 제거됨 (ConditionalTypeHandler로 이동)
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
      `  Note: infer moved to ConditionalTypeHandler`,
    ].join("\n");
  }

  /**
   * 라우터 예시 (infer 제거됨)
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
      // 🚫 infer 예시 제거됨 (ConditionalTypeHandler로 이동)
    ];
  }
}

// ==============================
// 🎯 편의 함수들 (infer 제거로 업데이트)
// ==============================

export function createOperatorTypeHandler(): OperatorTypeHandler {
  return new OperatorTypeHandler();
}

export function isOperatorType(type: ts.Type, node?: ts.TypeNode): boolean {
  const router = new OperatorTypeHandler();
  return router.isApplicable(type, node);
}

export function getSupportedOperatorTypes(): string[] {
  return OperatorTypeHandler.getSupportedTypes();
}
