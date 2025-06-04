import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "../types";

export class KeyOfProcessor {
  constructor(private readonly collector: any) {}

  process(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    // 🚨 깊이 제한으로 무한 재귀 방지
    if (context.depth >= context.maxDepth - 2) {
      const finalTypeString = context.checker.typeToString(
        context.checker.getTypeFromTypeNode(operatorNode)
      );

      return {
        type: "operator",
        metadata: {
          operator: "keyof",
          originalText: operatorNode.getText(),
          finalTypeString,
          depthLimited: true,
        },
      };
    }

    // 🎯 안전한 컨텍스트로 처리
    const safeContext = {
      ...context,
      depth: context.depth + 1,
    };

    const nominalTarget = this.collector.collect(
      operatorNode.type,
      safeContext
    );
    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      safeContext
    );

    const finalTypeString = context.checker.typeToString(finalType);

    console.log("=== KeyOfProcessor: 표준 collector 흐름 ===");
    console.log("finalTypeString:", finalTypeString);

    const structure: TypeStructure = {
      type: "operator",
      metadata: {
        operator: "keyof",
        originalText: operatorNode.getText(),
        finalTypeString,
      },
      children: [nominalTarget],
    };

    if (context.expanded) {
      structure.computedResult = computedResult;
    } else {
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
