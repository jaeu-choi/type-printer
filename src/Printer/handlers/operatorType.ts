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

    if (type.isUnion()) {
      const literalTypes = type.types.map((unionMember) => {
        if (unionMember.isStringLiteral()) {
          return {
            type: "literal" as const,
            value: `"${unionMember.value}"`,
            metadata: { originalText: `"${unionMember.value}"` },
          };
        } else if (unionMember.isNumberLiteral()) {
          return {
            type: "literal" as const,
            value: unionMember.value.toString(),
            metadata: { originalText: unionMember.value.toString() },
          };
        } else {
          const typeString = context.checker.typeToString(unionMember);
          return {
            type: "literal" as const,
            value: typeString,
            metadata: { originalText: typeString },
          };
        }
      });

      return {
        type: "union",
        children: literalTypes,
        metadata: { originalText: operatorNode.getText() },
      };
    } else {
      const typeString = context.checker.typeToString(type);
      return {
        type: "literal",
        value: typeString,
        metadata: { originalText: operatorNode.getText() },
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