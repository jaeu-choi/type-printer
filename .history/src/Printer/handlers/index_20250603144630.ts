import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

// Import all handlers
import { OperatorTypeHandler } from "./operatorType";
import { IndexAccessHandler } from "./indexAccess";
import { ConditionalTypeHandler } from "./conditionalType";
import { ReferenceTypeHandler } from "./referenceType";
import { PrimitiveTypeHandler } from "./primitiveType";
import { UnionTypeHandler } from "./unionType";
import { IntersectionTypeHandler } from "./intersectionType";
import { ArrayTypeHandler } from "./arrayType";
import { ObjectLiteralTypeHandler } from "./objectLiteral";
import { FallbackTypeHandler } from "./fallback";

export class TypeStructureCollector {
  private handlers: TypeHandler[] = [];

  constructor() {
    // 🎯 핵심: 모든 핸들러에 this(collector) 주입
    this.handlers = [
      new OperatorTypeHandler(this),
      new IndexAccessHandler(this),
      new ConditionalTypeHandler(this),
      new ReferenceTypeHandler(this),
      new UnionTypeHandler(this),
      new IntersectionTypeHandler(this),
      new ArrayTypeHandler(this),
      new ObjectLiteralTypeHandler(this),
      new PrimitiveTypeHandler(this),
      new FallbackTypeHandler(this),
    ];
  }

  /**
   * 🎯 핵심 메서드: 모든 핸들러가 이 메서드로 위임
   * 타입 노드를 받아서 적절한 핸들러에게 라우팅
   */
  collect(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    for (const handler of this.handlers) {
      if (handler.canHandle(node)) {
        return handler.handle(node, context);
      }
    }

    throw new Error(
      `No handler found for type node: ${node.kind} (${node.getText()})`
    );
  }

  /**
   * 🆕 새로운 헬퍼 메서드들: 핸들러들이 공통으로 사용할 유틸리티
   */

  // Union 타입 처리 (모든 핸들러에서 공통 사용)
  collectUnionMembers(
    types: readonly ts.TypeNode[],
    context: TypeCollectionContext
  ): TypeStructure[] {
    return types.map((typeNode) => this.collect(typeNode, context));
  }

  // Intersection 타입 처리 (모든 핸들러에서 공통 사용)
  collectIntersectionMembers(
    types: readonly ts.TypeNode[],
    context: TypeCollectionContext
  ): TypeStructure[] {
    return types.map((typeNode) => this.collect(typeNode, context));
  }

  // 배열 원소 타입 처리 (모든 핸들러에서 공통 사용)
  collectArrayElement(
    elementType: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return this.collect(elementType, context);
  }

  // 객체 프로퍼티 타입들 처리 (모든 핸들러에서 공통 사용)
  collectPropertyType(
    propertyType: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return this.collect(propertyType, context);
  }

  // 참조 타입 확장 (순환 참조 안전하게)
  collectReferenceExpansion(
    declaration: ts.Declaration,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    // 순환 참조 체크
    if (context.referencePath.includes(typeName)) {
      return null;
    }

    // 깊이 체크
    if (context.depth >= context.maxDepth) {
      return null;
    }

    const newContext = {
      ...context,
      depth: context.depth + 1,
      referencePath: [...context.referencePath, typeName],
    };

    if (ts.isTypeAliasDeclaration(declaration)) {
      return this.collect(declaration.type, newContext);
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      return this.collectInterfaceMembers(declaration, newContext);
    }

    return null;
  }

  // 인터페이스 멤버들 처리
  private collectInterfaceMembers(
    interfaceDecl: ts.InterfaceDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties = [];

    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = this.collect(member.type, context);

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: interfaceDecl.getText() },
    };
  }

  /**
   * 🆕 최종 타입 계산 헬퍼들 (TypeChecker 기반)
   * 각 핸들러에서 computedResult 생성할 때 사용
   */

  // TypeChecker로 최종 타입 구조 생성
  createFinalTypeStructure(
    finalType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // 1. Primitive 타입 체크 (최우선)
    if (this.isPrimitiveType(finalType)) {
      return {
        type: "primitive",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // 2. Literal 타입 체크
    if (this.isLiteralType(finalType)) {
      return {
        type: "literal",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // 3. Union 타입 체크
    if (finalType.isUnion()) {
      const unionMembers = finalType.types.map((memberType) =>
        this.createFinalTypeStructure(memberType, context)
      );
      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString },
      };
    }

    // 4. 배열 타입 체크
    if (this.isArrayType(finalType, finalTypeString)) {
      return this.createFinalArrayStructure(finalType, context);
    }

    // 5. 객체 타입 체크
    if (this.isObjectType(finalType)) {
      return this.createFinalObjectStructure(finalType, context);
    }

    // 6. 참조 타입 체크
    if (this.isReferenceType(finalType)) {
      return this.createFinalReferenceStructure(finalType, context);
    }

    // 7. Fallback
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: { finalTypeString },
    };
  }

  // 타입 판별 헬퍼들
  private isPrimitiveType(type: ts.Type): boolean {
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

  private isLiteralType(type: ts.Type): boolean {
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

  private isArrayType(type: ts.Type, typeString: string): boolean {
    return (
      typeString.endsWith("[]") ||
      (type.symbol && type.symbol.name === "Array") ||
      typeString.startsWith("Array<")
    );
  }

  private isObjectType(type: ts.Type): boolean {
    const properties = type.getProperties();
    return properties && properties.length > 0 && properties.length <= 50;
  }

  private isReferenceType(type: ts.Type): boolean {
    return !!(
      type.symbol?.declarations?.length &&
      type.symbol.flags &
        (ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.Class)
    );
  }

  // 최종 구조 생성 헬퍼들
  private createFinalArrayStructure(
    arrayType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(arrayType);
    const typeArgs = context.checker.getTypeArguments(
      arrayType as ts.TypeReference
    );

    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementStructure = this.createFinalTypeStructure(
        elementType,
        context
      );

      return {
        type: "array",
        children: [elementStructure],
        metadata: { finalTypeString },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString },
    };
  }

  private createFinalObjectStructure(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(objectType);
    const properties = [];

    try {
      const props = objectType.getProperties();

      for (const prop of props) {
        const propType = context.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration || prop.declarations?.[0]!
        );

        const optional = !!(prop.flags & ts.SymbolFlags.Optional);
        let readonly = false;

        if (
          prop.valueDeclaration &&
          ts.isPropertySignature(prop.valueDeclaration)
        ) {
          readonly = !!prop.valueDeclaration.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          );
        }

        const finalPropType = this.createFinalTypeStructure(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Error collecting object properties:", error);
    }

    return {
      type: "object",
      properties,
      metadata: { finalTypeString },
    };
  }

  private createFinalReferenceStructure(
    refType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(refType);
    const declaration = refType.symbol?.declarations?.[0];
    let typeName = "Unknown";

    if (declaration) {
      if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isClassDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      }
    }

    return {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        finalTypeString,
        originalTypeName: typeName,
      },
    };
  }
}

export * from "./operatorType";
export * from "./indexAccess";
export * from "./conditionalType";
export * from "./referenceType";
export * from "./primitiveType";
export * from "./unionType";
export * from "./intersectionType";
export * from "./arrayType";
export * from "./objectLiteral";
export * from "./fallback";
