import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "../types";

export class KeyOfProcessor {
  constructor(private readonly collector: any) {}

  process(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    // 🎯 핵심: 명목적 과정과 최종 결과 모두 collector에게 위임
    const nominalTarget = this.collector.collect(operatorNode.type, context);

    // 🎯 최종 결과도 collector의 표준 흐름 사용 (타입 연산을 위해)
    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    console.log("=== KeyOfProcessor: 표준 collector 흐름 ===");
    console.log("finalTypeString:", finalTypeString);

    // 🎯 KeyOf 구조 생성
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
      // expanded 모드: 명목적 과정 + 최종 결과 (실제 키들 보여줌)
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만 (하지만 정확한 구조로 다른 연산에서 사용 가능)
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
