// src/handlers/referenceTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 참조 타입 핸들러
 *
 * TypeScript의 참조 타입들을 처리합니다:
 * - 사용자 정의 타입: User, Person, MyInterface
 * - 내장 제네릭: Array<T>, Promise<T>, Record<K,V>
 * - 제네릭 인스턴스: MyGeneric<string>, Container<number>
 * - 네임스페이스 참조: A.B.C
 * - 타입 별칭 체인: type A = B; type B = C;
 */
export class ReferenceTypeHandler extends BaseTypeHandler {
  readonly name = "ReferenceTypeHandler";
  readonly priority = HandlerPriority.HIGH; // 높은 우선순위 (30)

  /**
   * 참조 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isReferenceType(type, node);
  }

  /**
   * 참조 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for reference type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createReferenceNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create reference type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 참조 타입 노드 생성
   */
  private createReferenceNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ReferenceTypeHandler: Processing reference type`);

    // 1. 참조 정보 추출
    const refInfo = this.extractReferenceInfo(type, node, context);

    // 2. 내장 타입인지 확인
    if (this.isBuiltinReference(refInfo.typeName)) {
      return this.handleBuiltinReference(refInfo, type, node, context);
    }

    // 3. 사용자 정의 타입 처리
    return this.handleUserDefinedReference(refInfo, type, node, context);
  }

  /**
   * 참조 정보 추출
   */
  private extractReferenceInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): ReferenceInfo {
    let typeName = "unknown";
    let typeArguments: TypeNode[] = [];
    let namespace: string[] = [];

    // AST 노드에서 정보 추출 (우선순위 높음)
    if (node && ts.isTypeReferenceNode(node)) {
      const refNode = node;

      // 타입 이름 추출 (네임스페이스 포함)
      typeName = this.extractTypeName(refNode.typeName);
      namespace = this.extractNamespace(refNode.typeName);

      // 타입 인수 처리
      if (refNode.typeArguments && refNode.typeArguments.length > 0) {
        typeArguments = refNode.typeArguments.map((argNode) => {
          const argType = context.checker.getTypeFromTypeNode(argNode);
          return globalHandlerRegistry.createTypeNode(
            argType,
            argNode,
            context
          );
        });
      }
    }
    // TypeChecker에서 정보 추출 (fallback)
    else {
      typeName = this.extractTypeNameFromType(type);
      typeArguments = this.extractTypeArgumentsFromType(type, context);
    }

    return {
      typeName,
      typeArguments,
      namespace,
      hasTypeArguments: typeArguments.length > 0,
    };
  }

  /**
   * 내장 참조 타입 처리
   */
  private handleBuiltinReference(
    refInfo: ReferenceInfo,
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 Processing builtin reference: ${refInfo.typeName}`);

    const finalTypeString = context.checker.typeToString(type);

    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: true,
      analysisMethod: "type-checker",
      finalTypeString,
      debug: {
        warnings: [],
      },
      referenceInfo: {
        typeName: refInfo.typeName,
        isBuiltin: true,
        hasTypeArguments: refInfo.hasTypeArguments,
        namespace: refInfo.namespace,
      },
    });

    return typeNodeFactory.createReference(
      refInfo.typeName,
      refInfo.typeArguments,
      metadata
    );
  }

  /**
   * 사용자 정의 참조 타입 처리
   */
  private handleUserDefinedReference(
    refInfo: ReferenceInfo,
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 Processing user-defined reference: ${refInfo.typeName}`);

    // 순환 참조 체크
    if (this.checkCircularReference(refInfo.typeName, context)) {
      console.warn(`⚠️ Circular reference detected: ${refInfo.typeName}`);
      return this.createCircularReferenceNode(refInfo, context);
    }

    // 깊이 제한 체크
    if (this.checkDepthLimit(context)) {
      console.warn(`⚠️ Depth limit reached for: ${refInfo.typeName}`);
      return this.createDepthLimitNode(refInfo, context);
    }

    // 참조 해결 시도
    const resolvedType = this.resolveReference(refInfo, type, context);

    const finalTypeString = context.checker.typeToString(type);

    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker", // 🔧 허용된 값으로 수정
      finalTypeString,
      debug: {
        warnings: [],
      },
      referenceInfo: {
        typeName: refInfo.typeName,
        isBuiltin: false,
        hasTypeArguments: refInfo.hasTypeArguments,
        namespace: refInfo.namespace,
        resolved: !!resolvedType,
      },
    });

    // 참조 TypeNode 생성
    const referenceNode = typeNodeFactory.createReference(
      refInfo.typeName,
      refInfo.typeArguments,
      metadata
    );

    // 해결된 정의가 있으면 children에 추가
    if (resolvedType && context.options?.expanded) {
      referenceNode.children = [resolvedType];
    }

    return referenceNode;
  }

  /**
   * 참조 해결 (실제 정의로 이동)
   */
  private resolveReference(
    refInfo: ReferenceInfo,
    type: ts.Type,
    context: TypeCreationContext
  ): TypeNode | null {
    try {
      // 자식 컨텍스트 생성 (순환 참조 추적)
      const childContext = this.createChildContext(context, refInfo.typeName);

      // 심볼에서 선언 찾기
      const symbol = type.symbol || type.aliasSymbol;
      if (!symbol || !symbol.declarations || symbol.declarations.length === 0) {
        return null;
      }

      const declaration = symbol.declarations[0];

      // 선언 타입에 따른 처리
      if (ts.isTypeAliasDeclaration(declaration)) {
        return this.resolveTypeAlias(declaration, childContext);
      }

      if (ts.isInterfaceDeclaration(declaration)) {
        return this.resolveInterface(declaration, childContext);
      }

      if (ts.isClassDeclaration(declaration)) {
        return this.resolveClass(declaration, childContext);
      }

      return null;
    } catch (error) {
      console.warn(
        `⚠️ Failed to resolve reference ${refInfo.typeName}: ${error}`
      );
      return null;
    }
  }

  /**
   * 타입 별칭 해결
   */
  private resolveTypeAlias(
    declaration: ts.TypeAliasDeclaration,
    context: TypeCreationContext
  ): TypeNode | null {
    const aliasType = context.checker.getTypeFromTypeNode(declaration.type);
    return globalHandlerRegistry.createTypeNode(
      aliasType,
      declaration.type,
      context
    );
  }

  /**
   * 인터페이스 해결
   */
  private resolveInterface(
    declaration: ts.InterfaceDeclaration,
    context: TypeCreationContext
  ): TypeNode | null {
    // 인터페이스는 ObjectTypeHandler가 처리하도록 위임
    const interfaceType = context.checker.getTypeAtLocation(declaration);
    return globalHandlerRegistry.createTypeNode(
      interfaceType,
      undefined,
      context
    );
  }

  /**
   * 클래스 해결
   */
  private resolveClass(
    declaration: ts.ClassDeclaration,
    context: TypeCreationContext
  ): TypeNode | null {
    // 클래스도 ObjectTypeHandler가 처리하도록 위임
    const classType = context.checker.getTypeAtLocation(declaration);
    return globalHandlerRegistry.createTypeNode(classType, undefined, context);
  }

  // ==============================
  // 🔧 타입 판별 및 추출 헬퍼들
  // ==============================

  /**
   * 참조 타입인지 확인
   */
  private isReferenceType(type: ts.Type, node?: ts.TypeNode): boolean {
    // AST 노드 기반 체크
    if (node && ts.isTypeReferenceNode(node)) {
      return true;
    }

    // TypeChecker 기반 체크
    if (type.symbol) {
      const symbolFlags = type.symbol.flags;
      return !!(
        symbolFlags &
        (ts.SymbolFlags.Type |
          ts.SymbolFlags.TypeAlias |
          ts.SymbolFlags.Interface |
          ts.SymbolFlags.Class |
          ts.SymbolFlags.Enum)
      );
    }

    // TypeReference 체크
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      return !!(objectType.objectFlags & ts.ObjectFlags.Reference);
    }

    return false;
  }

  /**
   * 내장 참조 타입인지 확인
   */
  private isBuiltinReference(typeName: string): boolean {
    const builtinTypes = [
      "Array",
      "ReadonlyArray",
      "Promise",
      "PromiseLike",
      "Record",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "Extract",
      "Exclude",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "ConstructorParameters",
      "InstanceType",
      "ThisParameterType",
      "OmitThisParameter",
      "Uppercase",
      "Lowercase",
      "Capitalize",
      "Uncapitalize",
      "Date",
      "RegExp",
      "Error",
      "JSON",
    ];

    return builtinTypes.includes(typeName);
  }

  /**
   * 타입 이름 추출
   */
  private extractTypeName(typeName: ts.EntityName): string {
    if (ts.isIdentifier(typeName)) {
      return typeName.text;
    }

    if (ts.isQualifiedName(typeName)) {
      // A.B.C 형태에서 마지막 부분만
      return typeName.right.text;
    }

    return "unknown";
  }

  /**
   * 네임스페이스 추출
   */
  private extractNamespace(typeName: ts.EntityName): string[] {
    const namespace: string[] = [];

    if (ts.isQualifiedName(typeName)) {
      // A.B.C에서 A.B 부분 추출
      let current = typeName.left;
      while (current) {
        if (ts.isIdentifier(current)) {
          namespace.unshift(current.text);
          break;
        } else if (ts.isQualifiedName(current)) {
          namespace.unshift(current.right.text);
          current = current.left;
        } else {
          break;
        }
      }
    }

    return namespace;
  }

  /**
   * TypeChecker에서 타입 이름 추출
   */
  private extractTypeNameFromType(type: ts.Type): string {
    if (type.symbol) {
      return type.symbol.name;
    }

    // TypeReference에서 추출
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const typeRef = objectType as ts.TypeReference;
        if (typeRef.target && typeRef.target.symbol) {
          return typeRef.target.symbol.name;
        }
      }
    }

    return "unknown";
  }

  /**
   * TypeChecker에서 타입 인수 추출
   */
  private extractTypeArgumentsFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): TypeNode[] {
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;
      if (objectType.objectFlags & ts.ObjectFlags.Reference) {
        const typeRef = objectType as ts.TypeReference;
        if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
          return typeRef.typeArguments.map((argType) =>
            globalHandlerRegistry.createTypeNode(argType, undefined, context)
          );
        }
      }
    }
    return [];
  }

  // ==============================
  // 🔧 특수 상황 처리
  // ==============================

  /**
   * 순환 참조 노드 생성
   */
  private createCircularReferenceNode(
    refInfo: ReferenceInfo,
    context: TypeCreationContext
  ): TypeNode {
    // 🔧 type 파라미터가 없으므로 직접 메타데이터 생성
    const metadata = {
      originalText: refInfo.typeName,
      finalTypeString: `${refInfo.typeName} (circular)`,
      isBuiltin: false,
      analysisMethod: "type-checker" as const,
      debug: {
        warnings: [`Circular reference detected: ${refInfo.typeName}`],
      },
      referenceInfo: {
        typeName: refInfo.typeName,
        isBuiltin: false,
        hasTypeArguments: refInfo.hasTypeArguments,
        isCircular: true,
      },
    };

    return typeNodeFactory.createReference(
      `${refInfo.typeName} (circular)`,
      refInfo.typeArguments,
      metadata
    );
  }

  /**
   * 깊이 제한 노드 생성
   */
  private createDepthLimitNode(
    refInfo: ReferenceInfo,
    context: TypeCreationContext
  ): TypeNode {
    // 🔧 type 파라미터가 없으므로 직접 메타데이터 생성
    const metadata = {
      originalText: refInfo.typeName,
      finalTypeString: `${refInfo.typeName} (depth limited)`,
      isBuiltin: false,
      analysisMethod: "type-checker" as const,
      debug: {
        warnings: [`Depth limit reached: ${refInfo.typeName}`],
      },
      referenceInfo: {
        typeName: refInfo.typeName,
        isBuiltin: false,
        hasTypeArguments: refInfo.hasTypeArguments,
        depthLimited: true,
      },
    };

    return typeNodeFactory.createReference(
      `${refInfo.typeName} (depth limited)`,
      refInfo.typeArguments,
      metadata
    );
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 참조 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "User-defined types", // User, Person, MyInterface
      "Builtin generics", // Array<T>, Promise<T>
      "Generic instances", // MyGeneric<string>
      "Namespace references", // A.B.C
      "Type alias chains", // type A = B; type B = C
      "Interface references", // interface IUser
      "Class references", // class MyClass
      "Enum references", // enum Status
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isReference = this.isReferenceType(type);
    const typeName = this.extractTypeNameFromType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";
    const isBuiltin = this.isBuiltinReference(typeName);

    return [
      `ReferenceTypeHandler Debug Info:`,
      `  Is Reference: ${isReference}`,
      `  Type Name: ${typeName}`,
      `  Type String: ${typeString}`,
      `  Is Builtin: ${isBuiltin}`,
      `  Type Flags: ${type.flags}`,
      `  Symbol Name: ${type.symbol?.name || "none"}`,
      `  Has Symbol: ${!!type.symbol}`,
    ].join("\n");
  }
}

// ==============================
// 🎯 타입 정의들
// ==============================

interface ReferenceInfo {
  typeName: string;
  typeArguments: TypeNode[];
  namespace: string[];
  hasTypeArguments: boolean;
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 참조 타입 핸들러 인스턴스 생성
 */
export function createReferenceTypeHandler(): ReferenceTypeHandler {
  return new ReferenceTypeHandler();
}

/**
 * 타입이 참조 타입인지 확인하는 헬퍼 함수
 */
export function isReferenceType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new ReferenceTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 참조 타입 목록 조회
 */
export function getSupportedReferenceTypes(): string[] {
  return ReferenceTypeHandler.getSupportedTypes();
}
