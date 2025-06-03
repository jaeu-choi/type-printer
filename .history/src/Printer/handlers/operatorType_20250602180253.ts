import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class OperatorTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeOperatorNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const operatorNode = node as ts.TypeOperatorNode;

    switch (operatorNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword:
        return this.handleKeyOf(operatorNode, context);
      case ts.SyntaxKind.ReadonlyKeyword:
        return this.handleReadonly(operatorNode, context);
      default:
        return this.handleUnknownOperator(operatorNode, context);
    }
  }

  private handleKeyOf(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const type = context.checker.getTypeFromTypeNode(operatorNode);
    const finalTypeString = context.checker.typeToString(type);

    console.log("=== handleKeyOf 디버깅 ===");
    console.log("finalTypeString:", finalTypeString);
    console.log("type.flags:", type.flags);
    console.log("type.isUnion():", type.isUnion());

    // Union 타입 체크를 더 엄격하게
    if (type.isUnion() && type.types && type.types.length > 0) {
      console.log("✓ Union 타입으로 처리, 멤버 수:", type.types.length);

      const literalTypes = type.types.map((unionMember) => {
        const memberString = context.checker.typeToString(unionMember);
        console.log("Union 멤버:", memberString);

        if (unionMember.isStringLiteral()) {
          return {
            type: "literal" as const,
            value: `"${unionMember.value}"`,
            metadata: {
              originalText: `"${unionMember.value}"`,
              finalTypeString: `"${unionMember.value}"`,
            },
          };
        } else if (unionMember.isNumberLiteral()) {
          return {
            type: "literal" as const,
            value: unionMember.value.toString(),
            metadata: {
              originalText: unionMember.value.toString(),
              finalTypeString: unionMember.value.toString(),
            },
          };
        } else {
          return {
            type: "literal" as const,
            value: memberString,
            metadata: {
              originalText: memberString,
              finalTypeString: memberString,
            },
          };
        }
      });

      // ✨ UPDATED: keyof는 항상 Union 멤버들을 직접 표시
      const unionStructure = {
        type: "union" as const,
        children: literalTypes,
        metadata: {
          originalText: operatorNode.getText(),
          finalTypeString,
        },
      };

      // keyof 연산자는 expanded 여부와 관계없이 항상 Union 멤버들을 보여줌
      return unionStructure;
    }
    // finalTypeString이 Union 패턴인지 체크 (fallback)
    else if (finalTypeString.includes(" | ")) {
      console.log("✓ 문자열 패턴으로 Union 감지:", finalTypeString);

      // 문자열을 파싱해서 Union 멤버들 추출
      const unionParts = finalTypeString
        .split(" | ")
        .map((part) => part.trim());
      const literalTypes = unionParts.map((part) => ({
        type: "literal" as const,
        value: part,
        metadata: { originalText: part, finalTypeString: part },
      }));

      // ✨ UPDATED: keyof는 항상 Union 멤버들을 직접 표시
      const unionStructure = {
        type: "union" as const,
        children: literalTypes,
        metadata: {
          originalText: operatorNode.getText(),
          finalTypeString,
          parsedFromString: true,
        },
      };

      // keyof 연산자는 expanded 여부와 관계없이 항상 Union 멤버들을 보여줌
      return unionStructure;
    }
    // 단일 키인 경우 또는 다른 경우
    else {
      console.log("✓ 단일 타입 또는 기타로 처리");

      // ✨ UPDATED: 단일 키도 keyof 특성에 맞게 literal로 직접 반환
      const literalStructure = {
        type: "literal" as const,
        value: finalTypeString,
        metadata: {
          originalText: finalTypeString,
          finalTypeString,
        },
      };

      // keyof 연산자는 expanded 여부와 관계없이 항상 결과를 직접 보여줌
      return literalStructure;
    }
  }

  private handleReadonly(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return {
      type: "operator",
      metadata: {
        operator: "readonly",
        originalText: operatorNode.getText(),
      },
      children: [
        new TypeStructureCollector().collect(operatorNode.type, context),
      ],
    };
  }

  private handleUnknownOperator(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return {
      type: "operator",
      metadata: {
        operator: "unknown",
        originalText: operatorNode.getText(),
      },
      children: [
        new TypeStructureCollector().collect(operatorNode.type, context),
      ],
    };
  }
}
