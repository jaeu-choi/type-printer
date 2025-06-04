import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class UnionTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isUnionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const unionNode = node as ts.UnionTypeNode;

    // 🎯 핵심: 명목적 과정은 collector에게 완전 위임
    const nominalChildren = this.collector.collectUnionMembers(
      unionNode.types,
      context
    );

    // 🎯 핵심: 최종 결과도 collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(unionNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "union",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.children = nominalChildren;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
