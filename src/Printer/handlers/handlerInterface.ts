// src/handlers/handler.ts

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  TypeNodeMetadata,
  createChildContext,
} from "../ir";

/**
 * 🎯 모든 핸들러의 공통 인터페이스 - 새로운 IR 시스템 통합
 *
 * TypeScript의 ts.Type을 IR의 TypeNode로 변환하는 책임을 가집니다.
 */
export interface TypeHandler {
  /**
   * 이 핸들러가 주어진 타입을 처리할 수 있는지 확인
   *
   * @param type - TypeScript 타입 객체
   * @param node - (선택적) AST 노드 정보
   * @returns 처리 가능하면 true, 불가능하면 false
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean;

  /**
   * TypeScript 타입을 IR의 TypeNode로 변환
   *
   * @param type - 변환할 TypeScript 타입
   * @param node - (선택적) AST 노드 정보
   * @param context - 타입 생성 컨텍스트
   * @returns IR TypeNode 객체
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode;

  /**
   * 핸들러 우선순위 (낮을수록 먼저 처리)
   * 기본값: 100
   */
  readonly priority?: number;

  /**
   * 핸들러 이름 (디버깅용)
   */
  readonly name: string;
}

/**
 * 🎯 핸들러 레지스트리 - 모든 핸들러를 관리하고 적절한 핸들러를 찾아줌
 */
export class TypeHandlerRegistry {
  private handlers: TypeHandler[] = [];

  /**
   * 핸들러 등록
   */
  register(handler: TypeHandler): void {
    this.handlers.push(handler);
    // 우선순위 순으로 정렬
    this.handlers.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * 여러 핸들러 한번에 등록
   */
  registerAll(handlers: TypeHandler[]): void {
    handlers.forEach((handler) => this.register(handler));
  }

  /**
   * 주어진 타입을 처리할 수 있는 핸들러 찾기
   */
  findHandler(type: ts.Type, node?: ts.TypeNode): TypeHandler | null {
    for (const handler of this.handlers) {
      if (handler.isApplicable(type, node)) {
        return handler;
      }
    }
    return null;
  }

  /**
   * 타입을 TypeNode로 변환 (전체 과정 orchestration)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    const handler = this.findHandler(type, node);

    if (!handler) {
      // Fallback: 알 수 없는 타입
      return {
        kind: "unknown",
        metadata: {
          originalText: node?.getText() || "unknown",
          finalTypeString: context?.checker?.typeToString(type) || "unknown",
          debug: {
            warnings: [`No handler found for type flags: ${type.flags}`],
          },
        },
      };
    }

    return handler.createTypeNode(type, node, context);
  }

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
   * 모든 핸들러 초기화 (테스트용)
   */
  clear(): void {
    this.handlers = [];
  }
}

/**
 * 🛠️ 핸들러 구현을 위한 베이스 클래스 (선택적 사용)
 */
export abstract class BaseTypeHandler implements TypeHandler {
  abstract readonly name: string;
  readonly priority: number = 100;

  abstract isApplicable(type: ts.Type, node?: ts.TypeNode): boolean;
  abstract createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode;

  /**
   * 공통 메타데이터 생성 헬퍼
   */
  protected createBaseMetadata(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): Partial<TypeNodeMetadata> {
    return {
      originalText: node?.getText() || "unknown",
      finalTypeString: context?.checker?.typeToString(type) || "unknown",
      isBuiltin: this.isBuiltinType(type),
    };
  }

  /**
   * 내장 타입 확인 헬퍼
   */
  protected isBuiltinType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined)
    );
  }

  /**
   * 리터럴 타입 확인 헬퍼
   */
  protected isLiteralType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  /**
   * 배열 타입 확인 헬퍼
   */
  protected isArrayType(type: ts.Type): boolean {
    return (
      (type.symbol && type.symbol.name === "Array") ||
      !!(
        type.flags & ts.TypeFlags.Object &&
        (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference &&
        type.symbol?.name === "Array"
      )
    );
  }

  /**
   * 객체 타입 확인 헬퍼
   */
  protected isObjectType(type: ts.Type): boolean {
    const properties = type.getProperties();
    return properties && properties.length > 0 && properties.length <= 50;
  }

  /**
   * 함수 타입 확인 헬퍼
   */
  protected isFunctionType(type: ts.Type): boolean {
    const callSignatures = type.getCallSignatures();
    return callSignatures && callSignatures.length > 0;
  }

  /**
   * 유니온 타입 확인 헬퍼
   */
  protected isUnionType(type: ts.Type): boolean {
    return type.isUnion();
  }

  /**
   * 교집합 타입 확인 헬퍼
   */
  protected isIntersectionType(type: ts.Type): boolean {
    return type.isIntersection();
  }

  /**
   * 안전한 자식 컨텍스트 생성
   */
  protected createChildContext(
    parent: TypeCreationContext,
    typeName?: string
  ): TypeCreationContext {
    return createChildContext(parent, typeName);
  }

  /**
   * 순환 참조 체크
   */
  protected checkCircularReference(
    typeName: string,
    context?: TypeCreationContext
  ): boolean {
    if (!context || !context.referencePath) return false;
    return context.referencePath.includes(typeName);
  }

  /**
   * 깊이 제한 체크
   */
  protected checkDepthLimit(context?: TypeCreationContext): boolean {
    if (!context) return false;
    return context.depth >= context.maxDepth;
  }
}

/**
 * 🔧 핸들러 구현 시 사용할 유틸리티들
 */
export class HandlerUtils {
  /**
   * TypeScript 타입 플래그를 읽기 쉬운 문자열로 변환
   */
  static typeFlgsToString(flags: ts.TypeFlags): string[] {
    const flagNames: string[] = [];

    if (flags & ts.TypeFlags.String) flagNames.push("String");
    if (flags & ts.TypeFlags.Number) flagNames.push("Number");
    if (flags & ts.TypeFlags.Boolean) flagNames.push("Boolean");
    if (flags & ts.TypeFlags.Union) flagNames.push("Union");
    if (flags & ts.TypeFlags.Intersection) flagNames.push("Intersection");
    if (flags & ts.TypeFlags.Object) flagNames.push("Object");
    if (flags & ts.TypeFlags.StringLiteral) flagNames.push("StringLiteral");
    if (flags & ts.TypeFlags.NumberLiteral) flagNames.push("NumberLiteral");
    if (flags & ts.TypeFlags.BooleanLiteral) flagNames.push("BooleanLiteral");
    if (flags & ts.TypeFlags.Any) flagNames.push("Any");
    if (flags & ts.TypeFlags.Unknown) flagNames.push("Unknown");
    if (flags & ts.TypeFlags.Never) flagNames.push("Never");
    if (flags & ts.TypeFlags.Void) flagNames.push("Void");
    if (flags & ts.TypeFlags.Null) flagNames.push("Null");
    if (flags & ts.TypeFlags.Undefined) flagNames.push("Undefined");

    return flagNames;
  }

  /**
   * 타입의 심볼 이름 추출
   */
  static getTypeName(type: ts.Type): string {
    if (type.symbol) {
      return type.symbol.name;
    }
    if (type.flags & ts.TypeFlags.StringLiteral) {
      return `"${(type as ts.StringLiteralType).value}"`;
    }
    if (type.flags & ts.TypeFlags.NumberLiteral) {
      return `${(type as ts.NumberLiteralType).value}`;
    }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      return `${(type as any).intrinsicName}`;
    }
    return "unknown";
  }

  /**
   * 제네릭 타입 인자 추출 (재귀적 처리를 위해 registry 필요)
   */
  static extractTypeArguments(
    type: ts.Type,
    registry: TypeHandlerRegistry,
    context?: TypeCreationContext
  ): TypeNode[] | undefined {
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const reference = objectType as ts.TypeReference;
        if (reference.typeArguments) {
          return reference.typeArguments.map((argType) =>
            registry.createTypeNode(argType, undefined, context)
          );
        }
      }
    }
    return undefined;
  }

  /**
   * 타입이 특정 내장 타입인지 확인
   */
  static isSpecificBuiltinType(type: ts.Type, typeName: string): boolean {
    return type.symbol?.name === typeName;
  }

  /**
   * 디버깅용 타입 정보 출력
   */
  static debugTypeInfo(type: ts.Type, context?: TypeCreationContext): string {
    const flags = HandlerUtils.typeFlgsToString(type.flags);
    const name = HandlerUtils.getTypeName(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return `Type: ${name}, Flags: [${flags.join(", ")}], String: ${typeString}`;
  }
}

/**
 * 🎯 전역 핸들러 레지스트리 인스턴스
 */
export const globalHandlerRegistry = new TypeHandlerRegistry();

/**
 * 🔧 편의 함수들
 */

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
