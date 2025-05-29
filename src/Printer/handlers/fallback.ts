import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class FallbackTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return true;
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    return {
      type: "literal",
      value: node.getText(),
      metadata: { originalText: node.getText() },
    };
  }
}