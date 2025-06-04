import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";

export class ObjectLiteralTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeLiteralNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const literalNode = node as ts.TypeLiteralNode;

    const nominalProperties = this.extractNominalProperties(
      literalNode,
      context
    );

    const finalType = context.checker.getTypeFromTypeNode(literalNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    const structure: TypeStructure = {
      type: "object",
      properties: nominalProperties, // 객체 구조의 핵심!
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      structure.computedResult = computedResult;
    } else {
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private extractNominalProperties(
    literalNode: ts.TypeLiteralNode,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];

    for (const member of literalNode.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        // 🎯 핵심: 프로퍼티 타입 분석은 collector에게 위임
        const propType = member.type
          ? this.collector.collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return properties;
  }
}
