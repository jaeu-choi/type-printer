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
        const propTypeString = context.checker.typeToString(propType);

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
    const isPrimitive = !!(
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

    if (isPrimitive) {
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

    // 3. 배열 타입인 경우 (객체보다 먼저)
    const typeArgs = context.checker.getTypeArguments(
      propType as ts.TypeReference
    );
    if (typeArgs && typeArgs.length > 0 && propTypeString.endsWith("[]")) {
      const elementType = context.checker.typeToString(typeArgs[0]);
      return {
        type: "array",
        children: [
          {
            type: "primitive",
            value: elementType,
            metadata: { finalTypeString: elementType },
          },
        ],
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 4. 실제 객체 타입인 경우 (사용자 정의 객체만)
    const properties = propType.getProperties();
    if (properties.length > 0 && properties.length <= 50) {
      // 내장 타입이 아닌 실제 사용자 정의 객체만 처리
      return this.computeFinalObjectResult(propType, context);
    }

    // 5. 기본 fallback - 복잡한 타입은 문자열로
    return {
      type: "primitive",
      value: propTypeString,
      metadata: { finalTypeString: propTypeString },
    };
  }
}
