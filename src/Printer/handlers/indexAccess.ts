import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class IndexAccessHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIndexedAccessTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const indexNode = node as ts.IndexedAccessTypeNode;

    // Extract original type info from AST to preserve reference information
    const originalTypeInfo = this.extractOriginalTypeInfo(indexNode, context);

    const type = context.checker.getTypeFromTypeNode(indexNode);

    if (type.isUnion()) {
      const literalTypes = type.types.map((unionMember, index) => {
        // Use original type info if available, otherwise fall back to existing method
        const originalInfo = originalTypeInfo[index];
        if (originalInfo) {
          return this.createTypeStructureWithOriginalInfo(
            unionMember,
            originalInfo,
            context
          );
        }
        return this.createTypeStructureFromType(unionMember, context);
      });

      return {
        type: "union",
        children: literalTypes,
        metadata: { originalText: indexNode.getText() },
      };
    } else {
      const originalInfo = originalTypeInfo[0];
      if (originalInfo) {
        return this.createTypeStructureWithOriginalInfo(
          type,
          originalInfo,
          context
        );
      }
      return this.createTypeStructureFromType(type, context);
    }
  }

  // Extract type information from original AST
  private extractOriginalTypeInfo(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    try {
      // Check if objectType is a type reference
      if (!ts.isTypeReferenceNode(indexNode.objectType)) {
        return [];
      }

      const objectTypeName = indexNode.objectType.typeName.getText();

      // Check if indexType is a literal type
      if (!ts.isLiteralTypeNode(indexNode.indexType)) {
        return [];
      }

      const propertyName = indexNode.indexType.literal
        .getText()
        .replace(/['"]/g, "");

      // Find original type declaration
      const typeDeclaration = this.findTypeDeclarationInProgram(
        objectTypeName,
        context
      );
      if (!typeDeclaration) {
        return [];
      }

      // Extract original type info from property
      if (ts.isInterfaceDeclaration(typeDeclaration)) {
        return this.extractFromInterface(typeDeclaration, propertyName);
      } else if (
        ts.isTypeAliasDeclaration(typeDeclaration) &&
        ts.isTypeLiteralNode(typeDeclaration.type)
      ) {
        return this.extractFromTypeLiteral(typeDeclaration.type, propertyName);
      }

      return [];
    } catch (error) {
      console.log("Debug - Error extracting original type info:", error);
      return [];
    }
  }

  private extractFromInterface(
    interfaceDecl: ts.InterfaceDeclaration,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    return [];
  }

  private extractFromTypeLiteral(
    typeLiteral: ts.TypeLiteralNode,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    for (const member of typeLiteral.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    return [];
  }

  private extractTypeInfoFromTypeNode(
    typeNode: ts.TypeNode
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map((unionMember) => {
        if (ts.isTypeReferenceNode(unionMember)) {
          return {
            typeName: unionMember.typeName.getText(),
            typeNode: unionMember,
          };
        }
        return { typeNode: unionMember };
      });
    } else if (ts.isTypeReferenceNode(typeNode)) {
      return [
        {
          typeName: typeNode.typeName.getText(),
          typeNode: typeNode,
        },
      ];
    } else {
      return [{ typeNode: typeNode }];
    }
  }

  private findTypeDeclarationInProgram(
    typeName: string,
    context: TypeCollectionContext
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    const sourceFiles = context.program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      for (const statement of sourceFile.statements) {
        if (
          (ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement)) &&
          statement.name?.text === typeName
        ) {
          return statement;
        }
      }
    }
    return null;
  }

  // Create TypeStructure using original type information
  private createTypeStructureWithOriginalInfo(
    type: ts.Type,
    originalInfo: { typeName?: string; typeNode?: ts.TypeNode },
    context: TypeCollectionContext
  ): TypeStructure {
    // If original type name exists, treat as reference type
    if (originalInfo.typeName) {
      const typeName = originalInfo.typeName;

      if (this.isBuiltinType(typeName)) {
        return {
          type: "reference",
          name: typeName,
          metadata: {
            isBuiltin: true,
            originalText: typeName,
            originalTypeName: typeName,
          },
        };
      }

      // Check for circular reference
      if (context.referencePath.includes(typeName)) {
        return {
          type: "reference",
          name: `[${typeName}] (circular)`,
          metadata: {
            isBuiltin: false,
            originalText: typeName,
            referencePath: [...context.referencePath, typeName],
            originalTypeName: typeName,
          },
        };
      }

      const structure: TypeStructure = {
        type: "reference",
        name: `[${typeName}]`,
        metadata: {
          isBuiltin: false,
          originalText: typeName,
          referencePath: [...context.referencePath, typeName],
          originalTypeName: typeName,
        },
      };

      // Expand reference if within depth limit
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeByName(typeName, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    }

    // If no original type name, use existing method
    return this.createTypeStructureFromType(type, context);
  }

  private createTypeStructureFromType(
    type: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const typeString = context.checker.typeToString(type);

    // If type has symbol (user-defined type)
    if (
      type.symbol &&
      type.symbol.declarations &&
      type.symbol.declarations.length > 0
    ) {
      const declaration = type.symbol.declarations[0];
      let name: string;

      if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
        name = declaration.name.text;
      } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
        name = declaration.name.text;
      } else if (ts.isClassDeclaration(declaration) && declaration.name) {
        name = declaration.name.text;
      } else {
        return {
          type: "primitive",
          value: typeString,
          metadata: { originalText: typeString },
        };
      }

      if (this.isBuiltinType(name)) {
        return {
          type: "reference",
          name,
          metadata: { isBuiltin: true, originalText: name },
        };
      }

      // Check for circular reference
      if (context.referencePath.includes(name)) {
        return {
          type: "reference",
          name: `[${name}] (circular)`,
          metadata: {
            isBuiltin: false,
            originalText: name,
            referencePath: [...context.referencePath, name],
          },
        };
      }

      const structure: TypeStructure = {
        type: "reference",
        name: `[${name}]`,
        metadata: {
          isBuiltin: false,
          originalText: name,
          referencePath: [...context.referencePath, name],
        },
      };

      // Expand if within depth limit
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeDeclaration(declaration, name, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    } else {
      // If no symbol: determine if user-defined type by type string
      const primitiveTypes = [
        "string",
        "number",
        "boolean",
        "symbol",
        "bigint",
        "unknown",
        "any",
        "never",
        "void",
        "null",
        "undefined",
      ];

      if (primitiveTypes.includes(typeString)) {
        return {
          type: "primitive",
          value: typeString,
          metadata: { originalText: typeString },
        };
      }

      // Check builtin types
      if (this.isBuiltinType(typeString)) {
        return {
          type: "reference",
          name: typeString,
          metadata: { isBuiltin: true, originalText: typeString },
        };
      }

      // Otherwise treat as user-defined type
      if (context.referencePath.includes(typeString)) {
        return {
          type: "reference",
          name: `[${typeString}] (circular)`,
          metadata: {
            isBuiltin: false,
            originalText: typeString,
            referencePath: [...context.referencePath, typeString],
          },
        };
      }

      const structure: TypeStructure = {
        type: "reference",
        name: `[${typeString}]`,
        metadata: {
          isBuiltin: false,
          originalText: typeString,
          referencePath: [...context.referencePath, typeString],
        },
      };

      // Try to find and expand type by name
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeByName(typeString, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    }
  }

  // Helper method to find and expand type by name
  private expandTypeByName(
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    try {
      const sourceFiles = context.program.getSourceFiles();
      for (const sourceFile of sourceFiles) {
        for (const statement of sourceFile.statements) {
          if (
            (ts.isTypeAliasDeclaration(statement) ||
              ts.isInterfaceDeclaration(statement)) &&
            statement.name?.text === typeName
          ) {
            return this.expandTypeDeclaration(statement, typeName, context);
          }
        }
      }
    } catch (error) {
      // Return null if search fails
    }
    return null;
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

  private expandTypeDeclaration(
    declaration: ts.Declaration,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
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
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }
}
