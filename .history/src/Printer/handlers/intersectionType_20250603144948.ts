import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class IntersectionTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isIntersectionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const intersectionNode = node as ts.IntersectionTypeNode;

    // 🎯 핵심 1: 명목적 과정은 collector에게 완전 위임
    const nominalChildren = this.collector.collectIntersectionMembers(
      intersectionNode.types,
      context
    );

    // 🎯 핵심 2: 최종 결과도 collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(intersectionNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "intersection",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      structure.children = nominalChildren;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 병합 결과만 표시
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
