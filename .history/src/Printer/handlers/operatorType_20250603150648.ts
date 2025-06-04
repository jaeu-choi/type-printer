import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { KeyOfProcessor } from "./KeyOfProcessor";

export class OperatorTypeHandler implements TypeHandler {
  private keyOfProcessor: KeyOfProcessor;

  constructor(private readonly collector: any) {
    this.keyOfProcessor = new KeyOfProcessor(collector);
  }

  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeOperatorNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const operatorNode = node as ts.TypeOperatorNode;

    // 🎯 라우터 역할: operator 종류에 따라 적절한 처리기로 위임
    switch (operatorNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword:
        return this.keyOfProcessor.process(operatorNode, context);

      case ts.SyntaxKind.ReadonlyKeyword:
        return this.handleReadonly(operatorNode, context);

      default:
        return this.handleUnknownOperator(operatorNode, context);
    }
  }

  /**
   * ReadOnly 연산자 처리 (단순하므로 직접 처리)
   */
  private handleReadonly(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "operator",
      metadata: {
        operator: "readonly",
        originalText: operatorNode.getText(),
        finalTypeString,
      },
      children: [this.collector.collect(operatorNode.type, context)],
    };

    if (context.expanded) {
      structure.computedResult = computedResult;
    } else {
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private handleUnknownOperator(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "operator",
      metadata: {
        operator: "unknown",
        originalText: operatorNode.getText(),
        finalTypeString,
      },
      children: [this.collector.collect(operatorNode.type, context)],
    };

    if (context.expanded) {
      structure.computedResult = computedResult;
    } else {
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
