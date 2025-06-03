import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class ObjectLiteralTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeLiteralNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const literalNode = node as ts.TypeLiteralNode;

    // 최종 계산된 타입 가져오기
    const finalType = context.checker.getTypeFromTypeNode(literalNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 명목적 과정 (AST에서 직접 추출한 프로퍼티들)
    const nominalProperties = this.extractNominalProperties(
      literalNode,
      context
    );

    // 최종 결과 계산 (TypeChecker가 계산한 실제 객체 구조)
    const computedResult = this.computeFinalObjectResult(finalType, context);

    const structure: TypeStructure = {
      type: "object",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.properties = nominalProperties;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private extractNominalProperties(
    literalNode: ts.TypeLiteralNode,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];

    for (const member of literalNode.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = member.type
          ? new TypeStructureCollector().collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return properties;
  }

  private computeFinalObjectResult(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(objectType);
    const properties: ObjectProperty[] = [];

    try {
      // TypeChecker가 계산한 최종 프로퍼티들
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

        // 복잡한 프로퍼티 타입의 경우 재귀적 처리
        const finalPropType = this.createFinalPropertyType(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting object literal properties:", error);
    }

    return {
      type: "object",
      properties,
      metadata: { finalTypeString },
    };
  }

  private createFinalPropertyType(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const propTypeString = context.checker.typeToString(propType);

    // 1. Primitive 타입 먼저 체크 (가장 중요!)
    if (this.isPrimitiveType(propType)) {
      return {
        type: "primitive",
        value: propTypeString,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 2. Union 타입인 경우
    if (propType.isUnion()) {
      const unionMembers = propType.types.map((memberType) => {
        // Union 멤버도 재귀적으로 처리
        return this.createFinalPropertyType(memberType, context);
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 3. Intersection 타입인 경우
    if (propType.isIntersection()) {
      // Intersection의 결과가 객체인지 확인
      const intersectionProperties = this.collectIntersectionProperties(
        propType,
        context
      );
      if (intersectionProperties.length > 0) {
        return {
          type: "object",
          properties: intersectionProperties,
          metadata: { finalTypeString: propTypeString },
        };
      } else {
        return {
          type: "primitive",
          value: propTypeString,
          metadata: { finalTypeString: propTypeString },
        };
      }
    }

    // 4. 배열 타입인 경우 (객체보다 먼저)
    if (this.isArrayType(propType, propTypeString)) {
      return this.createArrayStructure(propType, propTypeString, context);
    }

    // 5. 실제 객체 타입인 경우 (사용자 정의 객체만)
    if (this.isObjectType(propType, context)) {
      return this.createObjectStructure(propType, context);
    }

    // 6. 참조 타입인 경우 (사용자 정의 타입)
    if (this.isReferenceType(propType)) {
      return this.createReferenceStructure(propType, propTypeString, context);
    }

    // 7. 리터럴 타입인 경우
    if (this.isLiteralType(propType)) {
      return this.createLiteralStructure(propType, context);
    }

    // 8. 기본 fallback - 복잡한 타입은 문자열로
    return {
      type: "primitive",
      value: propTypeString,
      metadata: { finalTypeString: propTypeString },
    };
  }

  // === 타입 판별 메서드들 ===
  private isPrimitiveType(propType: ts.Type): boolean {
    return !!(
      propType.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol)
    );
  }

  private isArrayType(propType: ts.Type, propTypeString: string): boolean {
    return (
      propTypeString.endsWith("[]") ||
      (propType.symbol && propType.symbol.name === "Array") ||
      propTypeString.startsWith("Array<")
    );
  }

  private isObjectType(
    propType: ts.Type,
    context: TypeCollectionContext
  ): boolean {
    const properties = propType.getProperties();
    return !!(
      properties &&
      properties.length > 0 &&
      properties.length <= 50 &&
      !this.isPrimitiveType(propType) &&
      !this.isArrayType(propType, context.checker.typeToString(propType))
    );
  }

  private isReferenceType(propType: ts.Type): boolean {
    return !!(
      propType.symbol &&
      propType.symbol.declarations &&
      propType.symbol.declarations.length > 0 &&
      propType.symbol.flags &
        (ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.Class)
    );
  }

  private isLiteralType(propType: ts.Type): boolean {
    return !!(
      propType.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  // === 구조 생성 메서드들 ===
  private createArrayStructure(
    propType: ts.Type,
    propTypeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    const typeArgs = context.checker.getTypeArguments(
      propType as ts.TypeReference
    );

    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementStructure = this.createFinalPropertyType(
        elementType,
        context
      );

      return {
        type: "array",
        children: [elementStructure],
        metadata: { finalTypeString: propTypeString },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString: propTypeString },
    };
  }

  private createObjectStructure(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties: ObjectProperty[] = [];
    const props = propType.getProperties();

    for (const prop of props) {
      const propPropertyType = context.checker.getTypeOfSymbolAtLocation(
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

      const nestedPropType = this.createFinalPropertyType(
        propPropertyType,
        context
      );

      properties.push({
        name: prop.name,
        type: nestedPropType,
        optional,
        readonly,
      });
    }

    return {
      type: "object",
      properties,
      metadata: { finalTypeString: context.checker.typeToString(propType) },
    };
  }

  private createReferenceStructure(
    propType: ts.Type,
    propTypeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    const declaration = propType.symbol.declarations![0];
    let typeName = "Unknown";

    if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    } else if (ts.isClassDeclaration(declaration) && declaration.name) {
      typeName = declaration.name.text;
    }

    // 내장 타입 체크
    if (this.isBuiltinType(typeName)) {
      return {
        type: "reference",
        name: typeName,
        metadata: {
          isBuiltin: true,
          finalTypeString: propTypeString,
        },
      };
    }

    // 참조 타입이 실제로 객체 구조를 가지는지 확인
    if (propType.getProperties && propType.getProperties().length > 0) {
      return this.createObjectStructure(propType, context);
    }

    // 단순 참조 타입
    return {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        isBuiltin: false,
        finalTypeString: propTypeString,
        originalTypeName: typeName,
      },
    };
  }

  private createLiteralStructure(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    let literalValue: string;

    if (propType.isStringLiteral()) {
      literalValue = `"${(propType as ts.StringLiteralType).value}"`;
    } else if (propType.isNumberLiteral()) {
      literalValue = (propType as ts.NumberLiteralType).value.toString();
    } else if (propType.flags & ts.TypeFlags.BooleanLiteral) {
      literalValue = context.checker.typeToString(propType);
    } else {
      literalValue = context.checker.typeToString(propType);
    }

    return {
      type: "literal",
      value: literalValue,
      metadata: { finalTypeString: literalValue },
    };
  }

  private collectIntersectionProperties(
    intersectionType: ts.Type,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];
    const seenProperties = new Set<string>();

    try {
      const props = intersectionType.getProperties();

      for (const prop of props) {
        if (seenProperties.has(prop.name)) continue;
        seenProperties.add(prop.name);

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

        const finalPropType = this.createFinalPropertyType(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting intersection properties:", error);
    }

    return properties;
  }

  private isBuiltinType(name: string): boolean {
    const builtinTypes = [
      "Array",
      "Promise",
      "Record",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "ConstructorParameters",
      "InstanceType",
      "ThisParameterType",
      "OmitThisParameter",
      "ThisType",
      "Uppercase",
      "Lowercase",
      "Capitalize",
      "Uncapitalize",
      "Extract",
      "Exclude",
    ];
    return builtinTypes.includes(name);
  }
}
