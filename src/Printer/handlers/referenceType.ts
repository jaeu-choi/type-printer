import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext, ObjectProperty } from "../types";
import { TypeStructureCollector } from "./index";

export class ReferenceTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeReferenceNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const refNode = node as ts.TypeReferenceNode;
    const symbol = context.checker.getSymbolAtLocation(refNode.typeName);
    const name = symbol ? symbol.getName() : refNode.typeName.getText();

    const typeArgs =
      refNode.typeArguments?.map((arg) =>
        context.checker.typeToString(context.checker.getTypeFromTypeNode(arg))
      ) || [];

    if (this.isBuiltinType(name)) {
      const structure: TypeStructure = {
        type: "reference",
        name,
        metadata: {
          typeArgs,
          originalText: refNode.getText(),
          isBuiltin: true,
        },
      };
      return structure;
    }

    // Check for circular reference
    if (context.referencePath.includes(name)) {
      return {
        type: "reference",
        name: `[${name}] (circular)`,
        metadata: {
          typeArgs,
          originalText: refNode.getText(),
          isBuiltin: false,
          referencePath: [...context.referencePath, name],
        },
      };
    }

    const structure: TypeStructure = {
      type: "reference",
      name: `[${name}]`,
      metadata: {
        typeArgs,
        originalText: refNode.getText(),
        isBuiltin: false,
        referencePath: [...context.referencePath, name],
      },
    };

    // Recursively expand (check depth limit)
    if (this.shouldExpandReference(context)) {
      const expanded = this.expandReference(symbol, name, context);
      if (expanded) {
        structure.children = [expanded];
      }
    }

    return structure;
  }

  private isBuiltinType(name: string): boolean {
    const builtinTypes = [
      "Array",
      "Promise",
      "Record",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "ConstructorParameters",
      "InstanceType",
      "ThisParameterType",
      "OmitThisParameter",
      "ThisType",
      "Uppercase",
      "Lowercase",
      "Capitalize",
      "Uncapitalize",
      "Extract",
      "Exclude",
    ];
    return builtinTypes.includes(name);
  }

  private shouldExpandReference(context: TypeCollectionContext): boolean {
    return context.depth < context.maxDepth;
  }

  private expandReference(
    symbol: ts.Symbol | undefined,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    if (!symbol || !symbol.declarations || symbol.declarations.length === 0) {
      return null;
    }

    const declaration = symbol.declarations[0];
    const newContext = {
      ...context,
      depth: context.depth + 1,
      referencePath: [...context.referencePath, typeName],
    };

    if (ts.isTypeAliasDeclaration(declaration)) {
      return new TypeStructureCollector().collect(declaration.type, newContext);
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      return this.collectInterfaceStructure(declaration, newContext);
    }

    return null;
  }

  private collectInterfaceStructure(
    node: ts.InterfaceDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties: ObjectProperty[] = [];

    for (const member of node.members) {
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

      if (ts.isMethodSignature(member) && member.name) {
        const methodName = member.name.getText();
        const optional = !!member.questionToken;

        const parameters = member.parameters
          .map((param) => {
            const paramName = param.name.getText();
            const paramOptional = !!param.questionToken;
            const paramType = param.type
              ? context.checker.typeToString(
                  context.checker.getTypeFromTypeNode(param.type)
                )
              : "any";
            return `${paramName}${paramOptional ? "?" : ""}: ${paramType}`;
          })
          .join(", ");

        const returnType = member.type
          ? context.checker.typeToString(
              context.checker.getTypeFromTypeNode(member.type)
            )
          : "void";

        const functionType = `(${parameters}) => ${returnType}`;

        properties.push({
          name: methodName,
          type: {
            type: "primitive",
            value: functionType,
            metadata: { originalText: functionType },
          },
          optional,
          readonly: false,
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