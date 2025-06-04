import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class PrimitiveTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return this.isPrimitiveOrBuiltinTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    // 🎯 핵심: 일관성을 위해 collector의 최종 타입 계산 사용
    const finalType = context.checker.getTypeFromTypeNode(node);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "primitive",
      value: finalTypeString,
      metadata: {
        isBuiltin: true,
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: primitive는 명목적 과정이 없으므로 최종 결과만
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private isPrimitiveOrBuiltinTypeNode(node: ts.TypeNode): boolean {
    const k = node.kind;
    return (
      k === ts.SyntaxKind.StringKeyword ||
      k === ts.SyntaxKind.NumberKeyword ||
      k === ts.SyntaxKind.BooleanKeyword ||
      k === ts.SyntaxKind.SymbolKeyword ||
      k === ts.SyntaxKind.BigIntKeyword ||
      k === ts.SyntaxKind.UnknownKeyword ||
      k === ts.SyntaxKind.AnyKeyword ||
      k === ts.SyntaxKind.NeverKeyword ||
      k === ts.SyntaxKind.VoidKeyword ||
      k === ts.SyntaxKind.NullKeyword ||
      k === ts.SyntaxKind.UndefinedKeyword
    );
  }
}
