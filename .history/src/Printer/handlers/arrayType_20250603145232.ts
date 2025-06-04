import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class ArrayTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isArrayTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const arrayNode = node as ts.ArrayTypeNode;

    // 🎯 핵심 1: 배열 요소 타입 분석은 collector에게 위임
    const elementStructure = this.collector.collect(
      arrayNode.elementType,
      context
    );

    // 🎯 핵심 2: 최종 결과 계산은 collector에게 위임
    const finalType = context.checker.getTypeFromTypeNode(arrayNode);
    const computedResult = this.collector.createFinalArrayStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    // 🎯 ArrayTypeHandler의 책임: 배열 구조 생성!
    const structure: TypeStructure = {
      type: "array",
      children: [elementStructure], // 배열 구조의 핵심!
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정(children) + 최종 결과(computedResult)
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만 (children는 그대로 유지 - 배열 구조이므로)
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
