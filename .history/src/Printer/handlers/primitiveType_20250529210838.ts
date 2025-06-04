import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class PrimitiveTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return this.isPrimitiveOrBuiltinTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const finalTypeString = node.getText();

    const structure: TypeStructure = {
      type: "primitive",
      value: finalTypeString,
      metadata: {
        isBuiltin: true,
        finalTypeString,
      },
    };

    // 원시 타입은 expanded 모드에서도 단순하게 표시
    if (!context.expanded) {
      structure.computedResult = {
        type: "primitive",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
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
