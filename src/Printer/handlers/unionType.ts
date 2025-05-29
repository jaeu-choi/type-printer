import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class UnionTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isUnionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const unionNode = node as ts.UnionTypeNode;
    return {
      type: "union",
      children: unionNode.types.map((child) =>
        new TypeStructureCollector().collect(child, context)
      ),
      metadata: { originalText: node.getText() },
    };
  }
}