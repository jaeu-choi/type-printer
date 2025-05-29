import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class IntersectionTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIntersectionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const intersectionNode = node as ts.IntersectionTypeNode;
    return {
      type: "intersection",
      children: intersectionNode.types.map((child) =>
        new TypeStructureCollector().collect(child, context)
      ),
      metadata: { originalText: node.getText() },
    };
  }
}