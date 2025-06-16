// src/handlers/registry.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { TypeHandler, HandlerPriority } from "./interface";

/**
 * 🎯 Terminal 타입 유틸리티 (registry.ts 내부에 포함)
 */
class TypeNodeUtils {
  /**
   * Terminal 타입 체크
   */
  static isTerminalType(type: ts.Type): boolean {
    return (
      TypeNodeUtils.isPrimitiveType(type) ||
      TypeNodeUtils.isBuiltinSpecialType(type)
    );
  }

  /**
   * 원시 타입 체크
   */
  static isPrimitiveType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol)
    );
  }

  /**
   * 내장 특수 타입 체크 (any, unknown, never, void, null, undefined)
   */
  static isBuiltinSpecialType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.Any |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined)
    );
  }

  /**
   * 리터럴 타입 체크
   */
  static isLiteralType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  /**
   * Terminal 종류 결정
   */
  static getTerminalKind(
    type: ts.Type
  ): "primitive" | "builtin-special" | "literal" | undefined {
    if (TypeNodeUtils.isPrimitiveType(type)) return "primitive";
    if (TypeNodeUtils.isBuiltinSpecialType(type)) return "builtin-special";
    if (TypeNodeUtils.isLiteralType(type)) return "literal";
    return undefined;
  }

  /**
   * 타입을 문자열로 변환
   */
  static typeToString(type: ts.Type, checker?: ts.TypeChecker): string {
    try {
      return checker?.typeToString(type) || "unknown";
    } catch (error) {
      return "unknown";
    }
  }
}

/**
 * 🎯 핸들러 레지스트리 - Terminal 타입 최적화 포함
 */
export class TypeHandlerRegistry {
  private handlers: TypeHandler[] = [];
  private debugMode: boolean = false;

  // 🆕 Terminal 최적화 통계
  private terminalOptimizationStats = {
    terminalTypeHits: 0,
    handlerChainCalls: 0,
    terminalTypesSkipped: new Map<string, number>(),
    performanceSavings: 0, // ms
  };

  // ==============================
  // 🔧 핸들러 등록 관리
  // ==============================

  /**
   * 단일 핸들러 등록
   */
  register(handler: TypeHandler): void {
    // 중복 등록 방지
    if (this.handlers.some((h) => h.name === handler.name)) {
      console.warn(
        `Handler with name "${handler.name}" already exists. Skipping registration.`
      );
      return;
    }

    this.handlers.push(handler);
    this.sortHandlersByPriority();

    if (this.debugMode) {
      console.log(
        `✅ Registered handler: ${handler.name} (priority: ${
          handler.priority || 100
        })`
      );
    }
  }

  /**
   * 여러 핸들러 한번에 등록
   */
  registerAll(handlers: TypeHandler[]): void {
    handlers.forEach((handler) => this.register(handler));
  }

  /**
   * 핸들러 등록 해제
   */
  unregister(handlerName: string): boolean {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter((h) => h.name !== handlerName);

    const wasRemoved = this.handlers.length < initialLength;
    if (wasRemoved && this.debugMode) {
      console.log(`🗑️ Unregistered handler: ${handlerName}`);
    }

    return wasRemoved;
  }

  /**
   * 우선순위에 따른 핸들러 정렬
   */
  private sortHandlersByPriority(): void {
    this.handlers.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  // ==============================
  // 🔧 핸들러 검색 및 선택
  // ==============================

  /**
   * 주어진 타입을 처리할 수 있는 첫 번째 핸들러 찾기
   */
  findHandler(type: ts.Type, node?: ts.TypeNode): TypeHandler | null {
    for (const handler of this.handlers) {
      try {
        if (handler.isApplicable(type, node)) {
          if (this.debugMode) {
            console.log(
              `🎯 Selected handler: ${handler.name} for type flags: ${type.flags}`
            );
          }
          return handler;
        }
      } catch (error) {
        console.warn(
          `⚠️ Handler ${handler.name} threw error during isApplicable check:`,
          error
        );
        continue;
      }
    }

    if (this.debugMode) {
      console.log(`❌ No handler found for type flags: ${type.flags}`);
    }
    return null;
  }

  /**
   * 주어진 타입을 처리할 수 있는 모든 핸들러 찾기 (디버깅용)
   */
  findAllApplicableHandlers(type: ts.Type, node?: ts.TypeNode): TypeHandler[] {
    const applicableHandlers: TypeHandler[] = [];

    for (const handler of this.handlers) {
      try {
        if (handler.isApplicable(type, node)) {
          applicableHandlers.push(handler);
        }
      } catch (error) {
        console.warn(`⚠️ Handler ${handler.name} threw error:`, error);
      }
    }

    return applicableHandlers;
  }

  // ==============================
  // 🎯 핵심 타입 변환 기능
  // ==============================

  /**
   * 타입을 TypeNode로 변환 (전체 과정 orchestration)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    const startTime = performance.now();

    // 🎯 Terminal 타입 체크 - 핸들러 체인을 시작하기 전에!
    if (TypeNodeUtils.isTerminalType(type)) {
      const typeString = TypeNodeUtils.typeToString(type, context?.checker);

      // 통계 업데이트
      this.terminalOptimizationStats.terminalTypeHits++;
      const currentCount =
        this.terminalOptimizationStats.terminalTypesSkipped.get(typeString) ||
        0;
      this.terminalOptimizationStats.terminalTypesSkipped.set(
        typeString,
        currentCount + 1
      );

      if (this.debugMode) {
        console.log(
          `🛑 Terminal type optimization: ${typeString} (hit #${this.terminalOptimizationStats.terminalTypeHits})`
        );
      }

      const result = this.createTerminalTypeNode(type, node, context);

      // 성능 측정
      const endTime = performance.now();
      const timeSaved = Math.max(0, 5 - (endTime - startTime)); // 평균 5ms 절약 추정
      this.terminalOptimizationStats.performanceSavings += timeSaved;

      return result;
    }

    // 일반 핸들러 체인
    this.terminalOptimizationStats.handlerChainCalls++;

    const handler = this.findHandler(type, node);

    if (!handler) {
      return this.createFallbackNode(type, node, context);
    }

    try {
      const result = handler.createTypeNode(type, node, context);

      if (this.debugMode) {
        console.log(`✅ Successfully created TypeNode with ${handler.name}`);
      }

      return result;
    } catch (error) {
      console.warn(
        `⚠️ Handler ${handler.name} failed to create TypeNode:`,
        error
      );
      return this.createFallbackNode(
        type,
        node,
        context,
        `Handler ${handler.name} failed: ${error}`
      );
    }
  }

  /**
   * 🆕 Terminal 타입 전용 TypeNode 생성
   */
  private createTerminalTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    const typeString = TypeNodeUtils.typeToString(type, context?.checker);
    const terminalKind = TypeNodeUtils.getTerminalKind(type);

    // Terminal 타입에 따른 kind 결정
    let kind: "primitive" | "literal";
    if (terminalKind === "primitive" || terminalKind === "builtin-special") {
      kind = "primitive";
    } else {
      // literal 또는 undefined인 경우
      kind = "literal";
    }

    return {
      kind,
      literal: typeString,
      metadata: {
        originalText: node?.getText() || typeString,
        finalTypeString: typeString,
        isBuiltin: true,
        isTerminal: true, // 🎯 Terminal 표시
        terminalKind: terminalKind, // 이제 undefined도 허용됨
        analysisMethod: "terminal-optimization",
        debug: {
          warnings: [],
          terminalTypeSkippedChain: true,
        },
      },
    };
  }

  /**
   * Fallback TypeNode 생성
   */
  private createFallbackNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext,
    reason?: string
  ): TypeNode {
    const warnings = [
      `No suitable handler found for type flags: ${type.flags}`,
    ];
    if (reason) {
      warnings.push(reason);
    }

    return {
      kind: "unknown",
      metadata: {
        originalText: node?.getText() || "unknown",
        finalTypeString: TypeNodeUtils.typeToString(type, context?.checker),
        debug: {
          warnings,
          fallbackUsed: true,
        },
      },
    };
  }

  // ==============================
  // 🆕 Terminal 최적화 통계 관리
  // ==============================

  /**
   * Terminal 최적화 통계 조회
   */
  getTerminalOptimizationStats(): {
    terminalTypeHits: number;
    handlerChainCalls: number;
    optimizationRatio: number;
    terminalTypesBreakdown: Array<{ type: string; count: number }>;
    estimatedPerformanceSavings: number;
  } {
    const totalCalls =
      this.terminalOptimizationStats.terminalTypeHits +
      this.terminalOptimizationStats.handlerChainCalls;

    const optimizationRatio =
      totalCalls > 0
        ? (this.terminalOptimizationStats.terminalTypeHits / totalCalls) * 100
        : 0;

    const terminalTypesBreakdown = Array.from(
      this.terminalOptimizationStats.terminalTypesSkipped.entries()
    )
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      terminalTypeHits: this.terminalOptimizationStats.terminalTypeHits,
      handlerChainCalls: this.terminalOptimizationStats.handlerChainCalls,
      optimizationRatio: Math.round(optimizationRatio * 100) / 100,
      terminalTypesBreakdown,
      estimatedPerformanceSavings:
        Math.round(this.terminalOptimizationStats.performanceSavings * 100) /
        100,
    };
  }

  /**
   * 통계 리셋
   */
  resetTerminalOptimizationStats(): void {
    this.terminalOptimizationStats = {
      terminalTypeHits: 0,
      handlerChainCalls: 0,
      terminalTypesSkipped: new Map(),
      performanceSavings: 0,
    };

    if (this.debugMode) {
      console.log("🔄 Terminal optimization stats reset");
    }
  }

  /**
   * 통계 출력
   */
  printTerminalOptimizationStats(): void {
    const stats = this.getTerminalOptimizationStats();

    console.log("\n📊 Terminal Type Optimization Stats:");
    console.log(`   Terminal hits: ${stats.terminalTypeHits}`);
    console.log(`   Handler chain calls: ${stats.handlerChainCalls}`);
    console.log(`   Optimization ratio: ${stats.optimizationRatio}%`);
    console.log(
      `   Performance savings: ~${stats.estimatedPerformanceSavings}ms`
    );

    if (stats.terminalTypesBreakdown.length > 0) {
      console.log("   Most optimized types:");
      stats.terminalTypesBreakdown.slice(0, 5).forEach(({ type, count }) => {
        console.log(`     - ${type}: ${count} times`);
      });
    }
  }

  // ==============================
  // 🔧 레지스트리 상태 관리
  // ==============================

  /**
   * 등록된 모든 핸들러 목록 (디버깅용)
   */
  getRegisteredHandlers(): Array<{ name: string; priority: number }> {
    return this.handlers.map((h) => ({
      name: h.name,
      priority: h.priority || 100,
    }));
  }

  /**
   * 핸들러 개수
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * 특정 이름의 핸들러 찾기
   */
  getHandlerByName(name: string): TypeHandler | null {
    return this.handlers.find((h) => h.name === name) || null;
  }

  /**
   * 우선순위별 핸들러 그룹핑
   */
  getHandlersByPriority(): Map<number, TypeHandler[]> {
    const grouped = new Map<number, TypeHandler[]>();

    for (const handler of this.handlers) {
      const priority = handler.priority || 100;
      if (!grouped.has(priority)) {
        grouped.set(priority, []);
      }
      grouped.get(priority)!.push(handler);
    }

    return grouped;
  }

  /**
   * 모든 핸들러 초기화 (테스트용)
   */
  clear(): void {
    const count = this.handlers.length;
    this.handlers = [];

    if (this.debugMode) {
      console.log(`🧹 Cleared ${count} handlers from registry`);
    }
  }

  // ==============================
  // 🔧 디버깅 및 모니터링
  // ==============================

  /**
   * 디버그 모드 설정
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(
      `🐛 Debug mode ${
        enabled ? "enabled" : "disabled"
      } for TypeHandlerRegistry`
    );
  }

  /**
   * 디버그 모드 상태 확인
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 레지스트리 상태 진단
   */
  diagnose(): {
    totalHandlers: number;
    handlersByPriority: Record<number, string[]>;
    duplicateNames: string[];
    hasDebugMode: boolean;
  } {
    const handlersByPriority: Record<number, string[]> = {};
    const nameCount = new Map<string, number>();

    for (const handler of this.handlers) {
      const priority = handler.priority || 100;
      if (!handlersByPriority[priority]) {
        handlersByPriority[priority] = [];
      }
      handlersByPriority[priority].push(handler.name);

      // 중복 이름 체크
      nameCount.set(handler.name, (nameCount.get(handler.name) || 0) + 1);
    }

    const duplicateNames = Array.from(nameCount.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    return {
      totalHandlers: this.handlers.length,
      handlersByPriority,
      duplicateNames,
      hasDebugMode: this.debugMode,
    };
  }

  /**
   * 타입별 핸들러 매칭 통계 (성능 분석용)
   */
  getMatchingStats(testTypes: Array<{ type: ts.Type; node?: ts.TypeNode }>): {
    totalTests: number;
    successful: number;
    failed: number;
    handlerUsage: Record<string, number>;
  } {
    const stats = {
      totalTests: testTypes.length,
      successful: 0,
      failed: 0,
      handlerUsage: {} as Record<string, number>,
    };

    for (const test of testTypes) {
      const handler = this.findHandler(test.type, test.node);
      if (handler) {
        stats.successful++;
        stats.handlerUsage[handler.name] =
          (stats.handlerUsage[handler.name] || 0) + 1;
      } else {
        stats.failed++;
      }
    }

    return stats;
  }
}

// ==============================
// 🎯 전역 레지스트리 및 편의 함수들
// ==============================

/**
 * 전역 핸들러 레지스트리 인스턴스
 */
export const globalHandlerRegistry = new TypeHandlerRegistry();

/**
 * 핸들러를 전역 레지스트리에 등록
 */
export function registerHandler(handler: TypeHandler): void {
  globalHandlerRegistry.register(handler);
}

/**
 * 여러 핸들러를 전역 레지스트리에 등록
 */
export function registerHandlers(handlers: TypeHandler[]): void {
  globalHandlerRegistry.registerAll(handlers);
}

/**
 * 핸들러 등록 해제
 */
export function unregisterHandler(handlerName: string): boolean {
  return globalHandlerRegistry.unregister(handlerName);
}

/**
 * 타입을 TypeNode로 변환 (전역 레지스트리 사용)
 */
export function convertToTypeNode(
  type: ts.Type,
  node?: ts.TypeNode,
  context?: TypeCreationContext
): TypeNode {
  return globalHandlerRegistry.createTypeNode(type, node, context);
}

/**
 * 전역 레지스트리 상태 확인 (디버깅용)
 */
export function getRegistryInfo(): {
  handlerCount: number;
  handlers: Array<{ name: string; priority: number }>;
} {
  return {
    handlerCount: globalHandlerRegistry.getHandlerCount(),
    handlers: globalHandlerRegistry.getRegisteredHandlers(),
  };
}

/**
 * 전역 레지스트리 디버그 모드 설정
 */
export function setGlobalDebugMode(enabled: boolean): void {
  globalHandlerRegistry.setDebugMode(enabled);
}

/**
 * 전역 레지스트리 진단
 */
export function diagnoseGlobalRegistry() {
  return globalHandlerRegistry.diagnose();
}

/**
 * 🆕 Terminal 최적화 통계 조회
 */
export function getTerminalOptimizationStats() {
  return globalHandlerRegistry.getTerminalOptimizationStats();
}

/**
 * 🆕 Terminal 최적화 통계 출력
 */
export function printTerminalOptimizationStats(): void {
  globalHandlerRegistry.printTerminalOptimizationStats();
}
