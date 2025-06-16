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
 *
 * 모든 TypeScript 연산자 타입의 엔드포인트 역할:
 * - keyof T → KeyofTypeHandler로 위임
 * - typeof obj → TypeofTypeHandler로 위임
 * - infer R → InferTypeHandler로 위임 (향후)
 * - readonly T → ReadonlyTypeHandler로 위임 (향후)
 * - required T → RequiredTypeHandler로 위임 (향후)
 *
 * 🎯 라우터 패턴: 연산자 감지 → 적절한 핸들러 선택 → 위임 → 결과 반환
 */
export class OperatorTypeHandler extends BaseTypeHandler {
  readonly name = "OperatorTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  // 🎯 실제 연산자 핸들러들 (내부 관리)
  private keyofHandler = new KeyofTypeHandler();
  private typeofHandler = new TypeofTypeHandler();
  private inferHandler = new InferTypeHandler();
  // 향후 추가될 핸들러들:
  // private inferHandler = new InferTypeHandler();
  // private readonlyHandler = new ReadonlyTypeHandler();

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
   * 🎯 연산자 종류 감지 (라우터 핵심 로직)
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

      // 향후 추가될 연산자들:
      // if (ts.isInferTypeNode(node)) return "infer";
      // if (ts.isReadonlyTypeNode(node)) return "readonly";
    }

    // TypeChecker 기반 감지 (fallback)
    // 복잡한 내부 구조 분석이 필요하므로 현재는 제한적

    return null; // 감지되지 않음
  }

  /**
   * 🎯 특화된 핸들러로 라우팅 (핵심 분기 로직)
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

        // 향후 추가될 라우팅들:
        case "infer":
          return this.inferHandler.createTypeNode(type, node, context);
        // case "readonly":
        //   return this.readonlyHandler.createTypeNode(type, node, context);

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
  // 🔧 라우터 관리 기능들
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
      // 향후 추가:
      // { operator: "infer", handlerName: "InferTypeHandler", status: "planned" },
      // { operator: "readonly", handlerName: "ReadonlyTypeHandler", status: "planned" },
    ];
  }

  /**
   * 특정 연산자 핸들러 상태 확인
   */
  isOperatorSupported(operatorType: string): boolean {
    const supportedOperators = ["keyof", "typeof"];
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
      // 향후 추가:
      // "infer R - type inference (InferTypeHandler)",
      // "readonly T - readonly modifier (ReadonlyTypeHandler)",
      // "required T - required modifier (RequiredTypeHandler)",
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
      // 향후 추가:
      // {
      //   description: "Type inference routing",
      //   operator: "infer",
      //   example: "T extends (...args: any[]) => infer R ? R : never",
      //   handlerUsed: "InferTypeHandler",
      // },
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
