// src/handlers/typeNodeHelper.ts

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  ObjectMember,
  createChildContext,
} from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";

/**
 * 🤝 TypeNode 생성 헬퍼 클래스 - 핸들러 간 공통 패턴 추상화
 *
 * 모든 핸들러에서 반복되는 패턴들을 통합 관리:
 * - 자식 타입 노드 생성
 * - 타입 인수 처리
 * - 객체 멤버 처리
 * - 순환 참조 방지
 * - 에러 처리
 * - 성능 추적
 */
export class TypeNodeHelper {
  /**
   * 🎯 단일 자식 TypeNode 생성 (가장 기본적인 패턴)
   */
  static createChildTypeNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext,
    options?: {
      typeName?: string;
      fallbackLiteral?: string;
      enableLogging?: boolean;
    }
  ): TypeNode {
    const {
      typeName,
      fallbackLiteral = "unknown",
      enableLogging = false,
    } = options || {};

    if (enableLogging) {
      console.log(
        `🔗 Creating child TypeNode for: ${typeName || "unknown type"}`
      );
    }

    try {
      // 자식 컨텍스트 생성 (깊이 +1, 참조 경로 추가)
      const childContext = typeName
        ? createChildContext(context, typeName)
        : { ...context, depth: context.depth + 1 };

      // 전역 레지스트리를 통한 핸들러 호출
      const result = this.getHandlerRegistry().createTypeNode(
        type,
        node,
        childContext
      );

      if (enableLogging) {
        console.log(`✅ Child TypeNode created: ${result.kind}`);
      }

      return result;
    } catch (error) {
      console.warn(`⚠️ Failed to create child TypeNode: ${error}`);

      // Fallback TypeNode 생성
      return typeNodeFactory.createPrimitive(fallbackLiteral, {
        originalText: node?.getText() || typeName || "error",
        finalTypeString: fallbackLiteral,
        debug: {
          warnings: [`Child TypeNode creation failed: ${error}`],
          fallbackUsed: true,
        },
      });
    }
  }

  /**
   * 🎯 여러 자식 TypeNode들 생성 (Union, Intersection 등에서 사용)
   */
  static createChildTypeNodes(
    members: Array<{ type: ts.Type; node?: ts.TypeNode; name?: string }>,
    context: TypeCreationContext,
    options?: {
      enableLogging?: boolean;
      preserveOrder?: boolean;
      filterInvalid?: boolean;
    }
  ): TypeNode[] {
    const {
      enableLogging = false,
      preserveOrder = true,
      filterInvalid = false,
    } = options || {};

    if (enableLogging) {
      console.log(`🔗 Creating ${members.length} child TypeNodes...`);
    }

    const results: TypeNode[] = [];
    const errors: string[] = [];

    members.forEach((member, index) => {
      try {
        const childNode = this.createChildTypeNode(
          member.type,
          member.node,
          context,
          {
            typeName: member.name || `member_${index}`,
            enableLogging,
          }
        );

        // 유효성 검사
        if (filterInvalid && childNode.kind === "unknown") {
          errors.push(`Member ${index} resulted in unknown type`);
          return;
        }

        results.push(childNode);

        if (enableLogging) {
          console.log(`  ✅ Member ${index}: ${childNode.kind}`);
        }
      } catch (error) {
        errors.push(`Member ${index} failed: ${error}`);

        if (!filterInvalid) {
          // 실패해도 fallback 노드 추가
          results.push(
            typeNodeFactory.createPrimitive("unknown", {
              debug: { warnings: [`Member creation failed: ${error}`] },
            })
          );
        }
      }
    });

    if (enableLogging) {
      console.log(
        `✅ Created ${results.length}/${members.length} child TypeNodes`
      );
      if (errors.length > 0) {
        console.log(`⚠️ Errors: ${errors.length}`);
      }
    }

    return results;
  }

  /**
   * 🎯 제네릭 타입 인수 처리 (Reference 타입에서 사용)
   */
  static createTypeArguments(
    typeArgs: readonly ts.Type[],
    typeArgNodes: readonly ts.TypeNode[] | undefined,
    context: TypeCreationContext,
    options?: {
      enableLogging?: boolean;
      fallbackOnError?: boolean;
    }
  ): TypeNode[] {
    const { enableLogging = false, fallbackOnError = true } = options || {};

    if (enableLogging) {
      console.log(`🔗 Processing ${typeArgs.length} type arguments...`);
    }

    return this.createChildTypeNodes(
      typeArgs.map((argType, index) => ({
        type: argType,
        node: typeArgNodes?.[index],
        name: `TypeArg_${index}`,
      })),
      context,
      { enableLogging, filterInvalid: !fallbackOnError }
    );
  }

  /**
   * 🎯 객체 멤버 처리 (Object 타입에서 사용)
   */
  static createObjectMembers(
    properties: ts.Symbol[],
    parentType: ts.Type,
    context: TypeCreationContext,
    options?: {
      enableLogging?: boolean;
      includeOptional?: boolean;
      includeReadonly?: boolean;
      maxMembers?: number;
    }
  ): ObjectMember[] {
    const {
      enableLogging = false,
      includeOptional = true,
      includeReadonly = true,
      maxMembers = 50,
    } = options || {};

    if (enableLogging) {
      console.log(`🔗 Processing ${properties.length} object properties...`);
    }

    const members: ObjectMember[] = [];
    const errors: string[] = [];

    // 프로퍼티 수 제한
    const limitedProperties = properties.slice(0, maxMembers);
    if (properties.length > maxMembers) {
      console.warn(
        `⚠️ Too many properties (${properties.length}), limiting to ${maxMembers}`
      );
    }

    limitedProperties.forEach((prop, index) => {
      try {
        const key = prop.name;

        // 심볼에서 타입 추출
        const memberType = context.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration || prop.declarations?.[0]!
        );

        // 자식 TypeNode 생성
        const memberTypeNode = this.createChildTypeNode(
          memberType,
          undefined,
          context,
          {
            typeName: `${parentType.symbol?.name || "Object"}.${key}`,
            enableLogging,
          }
        );

        // 프로퍼티 수정자 확인
        const optional = !!(prop.flags & ts.SymbolFlags.Optional);
        const readonly = this.isReadonlyProperty(prop);

        // 필터링 옵션 적용
        if (!includeOptional && optional) return;
        if (!includeReadonly && readonly) return;

        members.push({
          key,
          node: memberTypeNode,
          optional,
          readonly,
        });

        if (enableLogging) {
          const modifiers = [
            readonly ? "readonly" : "",
            optional ? "optional" : "",
          ]
            .filter(Boolean)
            .join(", ");
          console.log(
            `  ✅ ${key}${modifiers ? ` (${modifiers})` : ""}: ${
              memberTypeNode.kind
            }`
          );
        }
      } catch (error) {
        errors.push(`Property ${prop.name} failed: ${error}`);
        console.warn(`⚠️ Failed to process property ${prop.name}: ${error}`);
      }
    });

    if (enableLogging) {
      console.log(`✅ Created ${members.length} object members`);
      if (errors.length > 0) {
        console.log(`⚠️ Errors: ${errors.length}`);
      }
    }

    return members;
  }

  /**
   * 🎯 순환 참조 안전 처리
   */
  static withCircularReferenceCheck<T>(
    typeName: string,
    context: TypeCreationContext,
    operation: (safeContext: TypeCreationContext) => T,
    fallback: () => T
  ): T {
    // 순환 참조 체크
    if (context.referencePath.includes(typeName)) {
      console.warn(`🔄 Circular reference detected: ${typeName}`);
      console.warn(
        `🔄 Reference path: ${context.referencePath.join(" → ")} → ${typeName}`
      );
      return fallback();
    }

    // 깊이 제한 체크
    if (context.depth >= context.maxDepth) {
      console.warn(
        `⬇️ Max depth reached (${context.maxDepth}) for: ${typeName}`
      );
      return fallback();
    }

    // 안전한 자식 컨텍스트로 실행
    const safeContext = createChildContext(context, typeName);
    return operation(safeContext);
  }

  /**
   * 🎯 에러 안전 핸들러 호출
   */
  static withErrorHandling<T>(
    operation: () => T,
    fallback: (error: Error) => T,
    options?: {
      enableLogging?: boolean;
      operationName?: string;
    }
  ): T {
    const { enableLogging = false, operationName = "operation" } =
      options || {};

    try {
      if (enableLogging) {
        console.log(`🔧 Starting ${operationName}...`);
      }

      const result = operation();

      if (enableLogging) {
        console.log(`✅ ${operationName} completed successfully`);
      }

      return result;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      if (enableLogging) {
        console.warn(`❌ ${operationName} failed: ${errorObj.message}`);
      }

      return fallback(errorObj);
    }
  }

  /**
   * 🎯 배치 처리 - 여러 타입을 한번에 안전하게 처리
   */
  static createTypeNodeBatch(
    items: Array<{
      type: ts.Type;
      node?: ts.TypeNode;
      name?: string;
      required?: boolean;
    }>,
    context: TypeCreationContext,
    options?: {
      enableLogging?: boolean;
      stopOnFirstError?: boolean;
      collectErrors?: boolean;
    }
  ): {
    results: TypeNode[];
    errors: Array<{ index: number; name?: string; error: string }>;
    stats: { total: number; successful: number; failed: number };
  } {
    const {
      enableLogging = false,
      stopOnFirstError = false,
      collectErrors = true,
    } = options || {};

    const results: TypeNode[] = [];
    const errors: Array<{ index: number; name?: string; error: string }> = [];

    if (enableLogging) {
      console.log(`🔗 Batch processing ${items.length} items...`);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const result = this.createChildTypeNode(item.type, item.node, context, {
          typeName: item.name || `batch_item_${i}`,
          enableLogging: false, // 배치에서는 개별 로깅 비활성화
        });

        results.push(result);

        if (enableLogging) {
          console.log(`  ✅ Item ${i}: ${result.kind}`);
        }
      } catch (error) {
        const errorInfo = {
          index: i,
          name: item.name,
          error: String(error),
        };

        if (collectErrors) {
          errors.push(errorInfo);
        }

        if (item.required || stopOnFirstError) {
          throw new Error(
            `Required item ${i} (${item.name || "unnamed"}) failed: ${error}`
          );
        }

        // 비필수 항목은 fallback으로 처리
        results.push(
          typeNodeFactory.createPrimitive("unknown", {
            debug: { warnings: [`Batch item ${i} failed: ${error}`] },
          })
        );

        if (enableLogging) {
          console.warn(`  ⚠️ Item ${i}: fallback used`);
        }
      }
    }

    const stats = {
      total: items.length,
      successful: results.length - errors.length,
      failed: errors.length,
    };

    if (enableLogging) {
      console.log(
        `✅ Batch completed: ${stats.successful}/${stats.total} successful`
      );
    }

    return { results, errors, stats };
  }

  // ==============================
  // 🔧 Private 헬퍼 메서드들
  // ==============================

  /**
   * 전역 핸들러 레지스트리 가져오기
   */
  private static getHandlerRegistry() {
    // 순환 참조를 피하기 위해 지연 로딩
    const { globalHandlerRegistry } = require("./registry");
    return globalHandlerRegistry;
  }

  /**
   * readonly 프로퍼티 확인
   */
  private static isReadonlyProperty(symbol: ts.Symbol): boolean {
    if (!symbol.valueDeclaration) return false;

    // PropertySignature의 modifiers 확인
    if (ts.isPropertySignature(symbol.valueDeclaration)) {
      return !!symbol.valueDeclaration.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
      );
    }

    return false;
  }

  /**
   * 타입 설명 생성
   */
  private static getTypeDescription(type: ts.Type): string {
    if (type.symbol?.name) return type.symbol.name;

    const flags = type.flags;
    if (flags & ts.TypeFlags.String) return "string";
    if (flags & ts.TypeFlags.Number) return "number";
    if (flags & ts.TypeFlags.Boolean) return "boolean";
    if (flags & ts.TypeFlags.StringLiteral) {
      return `"${(type as ts.StringLiteralType).value}"`;
    }
    if (flags & ts.TypeFlags.NumberLiteral) {
      return `${(type as ts.NumberLiteralType).value}`;
    }

    return "unknown";
  }

  // ==============================
  // 🔧 고급 패턴들
  // ==============================

  /**
   * 🎯 조건부 타입 노드 생성 (성능 최적화)
   */
  static createTypeNodeConditional(
    condition: () => boolean,
    ifTrue: () => { type: ts.Type; node?: ts.TypeNode },
    ifFalse: () => { type: ts.Type; node?: ts.TypeNode },
    context: TypeCreationContext,
    options?: { enableLogging?: boolean }
  ): TypeNode {
    const { enableLogging = false } = options || {};

    try {
      const shouldUseTrue = condition();
      const selected = shouldUseTrue ? ifTrue() : ifFalse();

      if (enableLogging) {
        console.log(
          `🔀 Conditional selection: ${shouldUseTrue ? "true" : "false"} branch`
        );
      }

      return this.createChildTypeNode(selected.type, selected.node, context, {
        enableLogging,
      });
    } catch (error) {
      console.warn(`⚠️ Conditional type creation failed: ${error}`);
      return typeNodeFactory.createPrimitive("unknown", {
        debug: { warnings: [`Conditional type creation failed: ${error}`] },
      });
    }
  }

  /**
   * 🎯 캐시된 타입 노드 생성 (성능 최적화)
   */
  private static typeNodeCache = new Map<string, TypeNode>();

  static createTypeNodeCached(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext,
    cacheKey?: string
  ): TypeNode {
    // 캐시 키 생성
    const key = cacheKey || this.generateCacheKey(type, node, context);

    // 캐시 확인
    if (this.typeNodeCache.has(key)) {
      const cached = this.typeNodeCache.get(key)!;
      console.log(`💾 Cache hit for: ${key}`);
      return cached;
    }

    // 새로 생성
    const result = this.createChildTypeNode(type, node, context);

    // 캐시 저장 (메모리 제한)
    if (this.typeNodeCache.size < 1000) {
      this.typeNodeCache.set(key, result);
    }

    return result;
  }

  /**
   * 캐시 키 생성
   */
  private static generateCacheKey(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): string {
    const typeStr = context.checker.typeToString(type);
    const nodeStr = node?.getText() || "";
    const depth = context.depth;
    return `${typeStr}|${nodeStr}|${depth}`;
  }

  /**
   * 캐시 클리어
   */
  static clearCache(): void {
    this.typeNodeCache.clear();
    console.log("🧹 TypeNode cache cleared");
  }

  /**
   * 캐시 통계
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.typeNodeCache.size,
      maxSize: 1000,
    };
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 간단한 자식 노드 생성
 */
export function createChild(
  type: ts.Type,
  node: ts.TypeNode | undefined,
  context: TypeCreationContext,
  typeName?: string
): TypeNode {
  return TypeNodeHelper.createChildTypeNode(type, node, context, { typeName });
}

/**
 * 안전한 배치 처리
 */
export function createChildrenSafe(
  items: Array<{ type: ts.Type; node?: ts.TypeNode }>,
  context: TypeCreationContext
): TypeNode[] {
  // 🔧 수정: createChildTypeNodes는 TypeNode[]를 직접 반환하므로 .results 제거
  return TypeNodeHelper.createChildTypeNodes(
    items.map((item, index) => ({ ...item, name: `child_${index}` })),
    context,
    { filterInvalid: true }
  );
}

/**
 * 순환 참조 안전 생성
 */
export function createWithCircularCheck<T>(
  typeName: string,
  context: TypeCreationContext,
  operation: (ctx: TypeCreationContext) => T,
  fallback: T
): T {
  return TypeNodeHelper.withCircularReferenceCheck(
    typeName,
    context,
    operation,
    () => fallback
  );
}
