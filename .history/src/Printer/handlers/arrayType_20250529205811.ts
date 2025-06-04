import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class ArrayTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isArrayTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const arrayNode = node as ts.ArrayTypeNode;

    // 최종 계산된 타입 가져오기
    const finalType = context.checker.getTypeFromTypeNode(arrayNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 명목적 과정 (원소 타입의 구조)
    const nominalElementType = new TypeStructureCollector().collect(
      arrayNode.elementType,
      context
    );

    // 최종 결과 계산
    const computedResult = this.computeFinalArrayResult(finalType, context);

    const structure: TypeStructure = {
      type: "array",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.children = [nominalElementType];
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private computeFinalArrayResult(
    arrayType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(arrayType);

    // 배열의 원소 타입 추출
    const typeArgs = context.checker.getTypeArguments(
      arrayType as ts.TypeReference
    );
    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementTypeString = context.checker.typeToString(elementType);

      // 원소가 객체 타입인 경우
      if (elementType.getProperties && elementType.getProperties().length > 0) {
        const elementStructure = this.createFinalElementStructure(
          elementType,
          context
        );
        return {
          type: "array",
          children: [elementStructure],
          metadata: { finalTypeString },
        };
      } else {
        // 원시 타입 원소
        return {
          type: "array",
          children: [
            {
              type: "primitive",
              value: elementTypeString,
              metadata: { finalTypeString: elementTypeString },
            },
          ],
          metadata: { finalTypeString },
        };
      }
    }

    // 타입 인자를 추출할 수 없는 경우
    return {
      type: "array",
      metadata: { finalTypeString },
    };
  }

  private createFinalElementStructure(
    elementType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const elementTypeString = context.checker.typeToString(elementType);

    // 객체 타입인 경우 프로퍼티 수집
    if (elementType.getProperties && elementType.getProperties().length > 0) {
      const properties = [];
      const props = elementType.getProperties();

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

        properties.push({
          name: prop.name,
          type: {
            type: "primitive" as const,
            value: propTypeString,
            metadata: { finalTypeString: propTypeString },
          },
          optional,
          readonly,
        });
      }

      return {
        type: "object",
        properties,
        metadata: { finalTypeString: elementTypeString },
      };
    }

    // Union 타입인 경우
    if (elementType.isUnion()) {
      const unionMembers = elementType.types.map((memberType) => {
        const memberString = context.checker.typeToString(memberType);
        return {
          type: "primitive" as const,
          value: memberString,
          metadata: { finalTypeString: memberString },
        };
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString: elementTypeString },
      };
    }

    // 기본: primitive 타입
    return {
      type: "primitive",
      value: elementTypeString,
      metadata: { finalTypeString: elementTypeString },
    };
  }
}
