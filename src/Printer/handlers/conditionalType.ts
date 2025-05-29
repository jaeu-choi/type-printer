import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeStructureCollector } from "./index";

export class ConditionalTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isConditionalTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const conditionalNode = node as ts.ConditionalTypeNode;

    return {
      type: "conditional",
      metadata: {
        originalText: node.getText(),
      },
      children: [
        this.collectTypeStructure(conditionalNode.checkType, context),
        this.collectTypeStructure(conditionalNode.extendsType, context),
        this.collectTypeStructure(conditionalNode.trueType, context),
        this.collectTypeStructure(conditionalNode.falseType, context),
      ],
    };
  }

  private collectTypeStructure(
    node: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return new TypeStructureCollector().collect(node, context);
  }
}