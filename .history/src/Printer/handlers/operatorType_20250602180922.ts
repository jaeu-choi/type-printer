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
    // ✨ UPDATED: 참조되는 타입을 먼저 강제로 해석
    const targetType = context.checker.getTypeFromTypeNode(operatorNode.type);
    const targetTypeString = context.checker.typeToString(targetType);

    console.log("=== handleKeyOf 디버깅 ===");
    console.log("targetType:", targetTypeString);
    console.log("targetType.flags:", targetType.flags);

    // keyof 연산 수행: 타겟 타입의 키들을 추출
    const keyofType = context.checker.getIndexTypeOfType(
      targetType,
      ts.IndexKind.String
    );
    const finalTypeString = keyofType
      ? context.checker.typeToString(keyofType)
      : `keyof ${targetTypeString}`;

    console.log("keyofType result:", finalTypeString);
    console.log("keyofType.isUnion():", keyofType?.isUnion());

    // keyofType이 제대로 계산되었는지 확인
    if (
      keyofType &&
      keyofType.isUnion() &&
      keyofType.types &&
      keyofType.types.length > 0
    ) {
      console.log("✓ Union 타입으로 처리, 멤버 수:", keyofType.types.length);

      const literalTypes = keyofType.types.map((unionMember) => {
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
    // ✨ UPDATED: keyofType이 없거나 Union이 아닌 경우 fallback 처리
    else if (keyofType) {
      console.log("✓ 단일 키 또는 복합 타입으로 처리");
      const keyofTypeString = context.checker.typeToString(keyofType);

      // 문자열 패턴으로 Union 체크 (fallback)
      if (keyofTypeString.includes(" | ")) {
        console.log("✓ 문자열 패턴으로 Union 감지:", keyofTypeString);

        const unionParts = keyofTypeString
          .split(" | ")
          .map((part) => part.trim());
        const literalTypes = unionParts.map((part) => ({
          type: "literal" as const,
          value: part,
          metadata: { originalText: part, finalTypeString: part },
        }));

        return {
          type: "union" as const,
          children: literalTypes,
          metadata: {
            originalText: operatorNode.getText(),
            finalTypeString: keyofTypeString,
            parsedFromString: true,
          },
        };
      } else {
        // 단일 키
        return {
          type: "literal" as const,
          value: keyofTypeString,
          metadata: {
            originalText: keyofTypeString,
            finalTypeString: keyofTypeString,
          },
        };
      }
    }
    // ✨ UPDATED: 모든 방법이 실패한 경우 원본 방식으로 fallback
    else {
      console.log("✗ keyof 해석 실패, 원본 방식으로 fallback");
      const originalType = context.checker.getTypeFromTypeNode(operatorNode);
      const originalTypeString = context.checker.typeToString(originalType);

      return {
        type: "literal" as const,
        value: originalTypeString,
        metadata: {
          originalText: operatorNode.getText(),
          finalTypeString: originalTypeString,
          fallback: true,
        },
      };
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
