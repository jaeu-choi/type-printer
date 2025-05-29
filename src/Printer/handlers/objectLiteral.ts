import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext, ObjectProperty } from "../types";
import { TypeStructureCollector } from "./index";

export class ObjectLiteralTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeLiteralNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const literalNode = node as ts.TypeLiteralNode;
    const properties: ObjectProperty[] = [];

    for (const member of literalNode.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = member.type
          ? new TypeStructureCollector().collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }
}