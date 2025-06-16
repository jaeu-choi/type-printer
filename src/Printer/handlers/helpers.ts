// src/handlers/helpers.ts

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  TypeNodeMetadata,
  createChildContext,
} from "../ir";
import { TypeHandler, HandlerPriority } from "./interface";

/**
 * 🛠️ 핸들러 구현을 위한 베이스 클래스
 *
 * 공통적으로 사용되는 헬퍼 메서드들을 제공합니다.
 * 모든 구체적 핸들러는 이 클래스를 상속받아 구현할 수 있습니다.
 */
export abstract class BaseTypeHandler implements TypeHandler {
  abstract readonly name: string;
  readonly priority: number = HandlerPriority.MEDIUM;

  abstract isApplicable(type: ts.Type, node?: ts.TypeNode): boolean;
  abstract createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode;

  // ==============================
  // 🔧 공통 메타데이터 생성
  // ==============================

  /**
   * 기본 메타데이터 생성
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
   * 확장된 메타데이터 생성 (추가 정보 포함)
   */
  protected createExtendedMetadata(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext,
    additionalData?: Partial<TypeNodeMetadata>
  ): Partial<TypeNodeMetadata> {
    const base = this.createBaseMetadata(type, node, context);
    return {
      ...base,
      ...additionalData,
      debug: {
        warnings: [],
        ...(additionalData?.debug || {}),
      },
    };
  }

  // ==============================
  // 🔧 타입 확인 헬퍼들
  // ==============================

  /**
   * 내장 타입 확인
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
   * 리터럴 타입 확인
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
   * 배열 타입 확인
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
   * 객체 타입 확인
   */
  protected isObjectType(type: ts.Type): boolean {
    const properties = type.getProperties();
    return properties && properties.length > 0 && properties.length <= 50;
  }

  /**
   * 함수 타입 확인
   */
  protected isFunctionType(type: ts.Type): boolean {
    const callSignatures = type.getCallSignatures();
    return callSignatures && callSignatures.length > 0;
  }

  /**
   * 유니온 타입 확인
   */
  protected isUnionType(type: ts.Type): boolean {
    return type.isUnion();
  }

  /**
   * 교집합 타입 확인
   */
  protected isIntersectionType(type: ts.Type): boolean {
    return type.isIntersection();
  }

  /**
   * 매핑 타입 확인
   */
  protected isMappedType(node?: ts.TypeNode): boolean {
    return node ? ts.isMappedTypeNode(node) : false;
  }

  /**
   * 조건부 타입 확인
   */
  protected isConditionalType(node?: ts.TypeNode): boolean {
    return node ? ts.isConditionalTypeNode(node) : false;
  }

  /**
   * 특정 내장 타입인지 확인
   */
  protected isSpecificBuiltinType(type: ts.Type, typeName: string): boolean {
    return type.symbol?.name === typeName;
  }

  // ==============================
  // 🔧 컨텍스트 관리
  // ==============================

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

  /**
   * 안전한 컨텍스트 확인
   */
  protected ensureContext(context?: TypeCreationContext): boolean {
    return !!(context && context.checker);
  }

  // ==============================
  // 🔧 에러 처리
  // ==============================

  /**
   * 에러 발생시 fallback TypeNode 생성
   */
  protected createErrorNode(
    error: string,
    type?: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    return {
      kind: "unknown",
      metadata: {
        originalText: node?.getText() || "error",
        finalTypeString: context?.checker?.typeToString(type!) || "error",
        debug: {
          warnings: [error],
          fallbackUsed: true,
        },
      },
    };
  }

  /**
   * 안전한 타입 변환 (에러 처리 포함)
   */
  protected safeCreateTypeNode(
    createFn: () => TypeNode,
    fallbackFn: () => TypeNode
  ): TypeNode {
    try {
      return createFn();
    } catch (error) {
      console.warn(`TypeNode creation failed: ${error}`);
      return fallbackFn();
    }
  }
}

/**
 * 🔧 핸들러 구현 시 사용할 정적 유틸리티들
 */
export class HandlerUtils {
  // ==============================
  // 🔧 타입 플래그 분석
  // ==============================

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
    if (flags & ts.TypeFlags.BigInt) flagNames.push("BigInt");
    if (flags & ts.TypeFlags.ESSymbol) flagNames.push("Symbol");

    return flagNames;
  }

  // ==============================
  // 🔧 타입 이름 추출
  // ==============================

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
   * 리터럴 값 추출
   */
  static getLiteralValue(type: ts.Type): string | number | boolean | undefined {
    if (type.flags & ts.TypeFlags.StringLiteral) {
      return (type as ts.StringLiteralType).value;
    }
    if (type.flags & ts.TypeFlags.NumberLiteral) {
      return (type as ts.NumberLiteralType).value;
    }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      const intrinsicName = (type as any).intrinsicName;
      return intrinsicName === "true";
    }
    return undefined;
  }

  // ==============================
  // 🔧 제네릭 타입 처리
  // ==============================

  /**
   * 제네릭 타입 인자 추출 (컨텍스트 의존적)
   */
  static extractTypeArguments(
    type: ts.Type,
    context?: TypeCreationContext
  ): ts.Type[] | undefined {
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const reference = objectType as ts.TypeReference;
        return reference.typeArguments
          ? [...reference.typeArguments]
          : undefined;
      }
    }
    return undefined;
  }

  /**
   * 타입 매개변수 추출
   */
  static extractTypeParameters(
    type: ts.Type
  ): readonly ts.TypeParameter[] | undefined {
    if ("localTypeParameters" in type) {
      return (type as any).localTypeParameters;
    }
    if ("typeParameters" in type) {
      return (type as any).typeParameters;
    }
    return undefined;
  }

  // ==============================
  // 🔧 디버깅 지원
  // ==============================

  /**
   * 디버깅용 타입 정보 출력
   */
  static debugTypeInfo(type: ts.Type, context?: TypeCreationContext): string {
    const flags = HandlerUtils.typeFlgsToString(type.flags);
    const name = HandlerUtils.getTypeName(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return `Type: ${name}, Flags: [${flags.join(", ")}], String: ${typeString}`;
  }

  /**
   * 타입 구조 간단 분석
   */
  static analyzeTypeStructure(type: ts.Type): {
    isComplex: boolean;
    hasCallSignatures: boolean;
    hasProperties: boolean;
    propertyCount: number;
  } {
    const callSignatures = type.getCallSignatures();
    const properties = type.getProperties();

    return {
      isComplex: callSignatures.length > 0 || properties.length > 5,
      hasCallSignatures: callSignatures.length > 0,
      hasProperties: properties.length > 0,
      propertyCount: properties.length,
    };
  }

  // ==============================
  // 🔧 타입 변환 지원
  // ==============================

  /**
   * 안전한 타입 문자열 변환
   */
  static safeTypeToString(type: ts.Type, checker?: ts.TypeChecker): string {
    try {
      return checker?.typeToString(type) || "unknown";
    } catch (error) {
      return "error";
    }
  }

  /**
   * AST 노드에서 텍스트 안전 추출
   */
  static safeGetText(node?: ts.TypeNode): string {
    try {
      return node?.getText() || "unknown";
    } catch (error) {
      return "error";
    }
  }
}
