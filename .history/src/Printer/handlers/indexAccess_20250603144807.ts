import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class IndexAccessHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isIndexedAccessTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const indexNode = node as ts.IndexedAccessTypeNode;

    // 🎯 핵심 1: 명목적 과정은 collector에게 완전 위임
    const nominalProcess = this.extractNominalProcess(indexNode, context);

    // 🎯 핵심 2: 최종 결과도 collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(indexNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "access",
      metadata: {
        originalText: indexNode.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      structure.children = nominalProcess;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  /**
   * 🎯 IndexAccessHandler의 유일한 책임: 구조 파악
   * "User["roles"]"에서 "User 구조 + roles 구조" 추출
   */
  private extractNominalProcess(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    return [
      // 1. 객체 타입 구조 (User)
      {
        type: "reference",
        name: "[ObjectType]",
        children: [this.collector.collect(indexNode.objectType, context)],
        metadata: { originalText: indexNode.objectType.getText() },
      },

      // 2. 인덱스 타입 구조 ("roles" 또는 "age" | "name")
      {
        type: "reference",
        name: "[IndexType]",
        children: [this.collector.collect(indexNode.indexType, context)],
        metadata: { originalText: indexNode.indexType.getText() },
      },
    ];
  }
}
