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

    // ✨ UPDATED: 타입의 프로퍼티를 직접 추출해서 keyof 연산 수행
    const properties = targetType.getProperties();
    console.log("properties count:", properties.length);

    if (properties && properties.length > 0) {
      console.log("✓ 프로퍼티 직접 추출 방식으로 처리");

      const keyNames = properties.map((prop) => {
        const keyName = prop.getName();
        console.log("추출된 키:", keyName);
        return keyName;
      });

      if (keyNames.length > 1) {
        // 여러 키가 있는 경우 Union으로 처리
        const literalTypes = keyNames.map((keyName) => ({
          type: "literal" as const,
          value: `"${keyName}"`,
          metadata: {
            originalText: `"${keyName}"`,
            finalTypeString: `"${keyName}"`,
          },
        }));

        return {
          type: "union" as const,
          children: literalTypes,
          metadata: {
            originalText: operatorNode.getText(),
            finalTypeString: keyNames.map((k) => `"${k}"`).join(" | "),
            extractedFromProperties: true,
          },
        };
      } else if (keyNames.length === 1) {
        // 단일 키인 경우
        const keyName = keyNames[0];
        return {
          type: "literal" as const,
          value: `"${keyName}"`,
          metadata: {
            originalText: `"${keyName}"`,
            finalTypeString: `"${keyName}"`,
            extractedFromProperties: true,
          },
        };
      }
    }

    // ✨ UPDATED: 프로퍼티 추출이 실패한 경우 fallback
    console.log("✗ 프로퍼티 추출 실패, fallback 처리");

    // 최후의 수단: 원본 keyof 노드 자체를 처리
    const originalType = context.checker.getTypeFromTypeNode(operatorNode);
    const originalTypeString = context.checker.typeToString(originalType);

    // 혹시 originalType이 Union인지 한번 더 체크
    if (
      originalType &&
      originalType.isUnion() &&
      originalType.types &&
      originalType.types.length > 0
    ) {
      console.log("✓ 원본 노드에서 Union 발견!");

      const literalTypes = originalType.types.map((unionMember) => {
        const memberString = context.checker.typeToString(unionMember);

        if (unionMember.isStringLiteral()) {
          return {
            type: "literal" as const,
            value: `"${unionMember.value}"`,
            metadata: {
              originalText: `"${unionMember.value}"`,
              finalTypeString: `"${unionMember.value}"`,
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

      return {
        type: "union" as const,
        children: literalTypes,
        metadata: {
          originalText: operatorNode.getText(),
          finalTypeString: originalTypeString,
          fallbackUnion: true,
        },
      };
    }

    // 정말 마지막 fallback
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
