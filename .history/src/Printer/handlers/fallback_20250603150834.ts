import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class FallbackTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return true; // 🎯 모든 타입을 처리 (최후의 보루)
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const finalType = context.checker.getTypeFromTypeNode(node);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "literal",
      value: node.getText(), // AST에서 원본 텍스트 사용
      metadata: {
        originalText: node.getText(),
        finalTypeString,
        isFallback: true, // 🏷️ fallback으로 처리되었음을 표시
      },
    };

    if (context.expanded) {
      // expanded 모드: 원본 + 최종 결과
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }
}
