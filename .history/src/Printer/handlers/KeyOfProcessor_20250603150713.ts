import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "../types";

export class KeyOfProcessor {
  constructor(private readonly collector: any) {}

  process(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const nominalTarget = this.collector.collect(operatorNode.type, context);

    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "operator",
      metadata: {
        operator: "keyof",
        originalText: operatorNode.getText(),
        finalTypeString,
      },
      children: [nominalTarget], // keyof 대상 타입
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
