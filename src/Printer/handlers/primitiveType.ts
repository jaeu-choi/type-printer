import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class PrimitiveTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return this.isPrimitiveOrBuiltinTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    return {
      type: "primitive",
      value: node.getText(),
      metadata: { isBuiltin: true },
    };
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