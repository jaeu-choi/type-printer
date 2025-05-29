import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class ArrayTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isArrayTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const arrayNode = node as ts.ArrayTypeNode;
    return {
      type: "array",
      children: [
        new TypeStructureCollector().collect(arrayNode.elementType, context),
      ],
      metadata: { originalText: node.getText() },
    };
  }
}