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

    // 최종 계산된 타입 가져오기 (TypeScript 컴파일러가 계산한 결과)
    const finalType = context.checker.getTypeFromTypeNode(indexNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 명목적 과정: 원본 AST에서 참조 추적 정보 추출
    const nominalProcess = this.extractNominalProcess(indexNode, context);

    // 최종 결과 계산
    const computedResult = this.computeFinalIndexAccessResult(
      finalType,
      context,
      indexNode
    );

    const structure: TypeStructure = {
      type: "access",
      metadata: {
        originalText: indexNode.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      structure.children = nominalProcess;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만 표시
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private extractNominalProcess(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const process: TypeStructure[] = [];

    // 1. 객체 타입 참조 정보
    const objectTypeStructure = new TypeStructureCollector().collect(
      indexNode.objectType,
      context
    );
    process.push({
      type: "reference",
      name: "[ObjectType]",
      children: [objectTypeStructure],
      metadata: { originalText: indexNode.objectType.getText() },
    });

    // 2. 인덱스 타입 정보
    const indexTypeStructure = new TypeStructureCollector().collect(
      indexNode.indexType,
      context
    );
    process.push({
      type: "reference",
      name: "[IndexType]",
      children: [indexTypeStructure],
      metadata: { originalText: indexNode.indexType.getText() },
    });

    // 3. 원본 타입 정보 (AST에서 추출한 참조 추적)
    const originalTypeInfo = this.extractOriginalTypeInfo(indexNode, context);
    if (originalTypeInfo.length > 0) {
      const referenceTrace = originalTypeInfo.map((info, index) => ({
        type: "reference" as const,
        name: info.typeName
          ? `[Reference: ${info.typeName}]`
          : `[Member ${index}]`,
        metadata: {
          originalText: info.typeNode?.getText() || "",
          originalTypeName: info.typeName,
        },
      }));

      process.push({
        type: "reference",
        name: "[ReferenceTrace]",
        children: referenceTrace,
        metadata: { originalText: "Reference tracking from AST" },
      });
    }

    return process;
  }

  private computeFinalIndexAccessResult(
    finalType: ts.Type,
    context: TypeCollectionContext,
    indexNode: ts.IndexedAccessTypeNode
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // Union 타입인 경우 (예: User["age"] = number | Client)
    if (finalType.isUnion()) {
      const finalMembers = finalType.types.map((memberType) => {
        return this.createFinalMemberStructure(memberType, context);
      });

      return {
        type: "union",
        children: finalMembers,
        metadata: {
          finalTypeString,
          originalText: indexNode.getText(),
        },
      };
    } else {
      // 단일 타입인 경우
      return this.createFinalMemberStructure(finalType, context);
    }
  }

  private createFinalMemberStructure(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const memberTypeString = context.checker.typeToString(memberType);

    // 객체 타입인 경우
    if (memberType.getProperties && memberType.getProperties().length > 0) {
      const properties = this.collectFinalProperties(memberType, context);
      return {
        type: "object",
        properties,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 사용자 정의 타입 참조인 경우 (심볼이 있는 경우)
    if (memberType.symbol && memberType.symbol.declarations) {
      const declaration = memberType.symbol.declarations[0];
      let typeName = "Unknown";

      if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isClassDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      }

      // 내장 타입 체크
      if (this.isBuiltinType(typeName)) {
        return {
          type: "reference",
          name: typeName,
          metadata: {
            isBuiltin: true,
            finalTypeString: memberTypeString,
          },
        };
      }

      // 사용자 정의 타입인 경우
      const structure: TypeStructure = {
        type: "reference",
        name: `[${typeName}]`,
        metadata: {
          isBuiltin: false,
          finalTypeString: memberTypeString,
          originalTypeName: typeName,
        },
      };

      // 컨텍스트에 따라 확장 여부 결정
      if (context.expanded && this.shouldExpandReference(context)) {
        const expanded = this.expandTypeDeclaration(
          declaration,
          typeName,
          context
        );
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    }

    // 원시 타입인 경우
    return {
      type: "primitive",
      value: memberTypeString,
      metadata: { finalTypeString: memberTypeString },
    };
  }

  private collectFinalProperties(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    const properties: ObjectProperty[] = [];

    try {
      const props = objectType.getProperties();

      for (const prop of props) {
        const propType = context.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration || prop.declarations?.[0]!
        );
        const propTypeString = context.checker.typeToString(propType);

        const optional = !!(prop.flags & ts.SymbolFlags.Optional);
        let readonly = false;

        if (
          prop.valueDeclaration &&
          ts.isPropertySignature(prop.valueDeclaration)
        ) {
          readonly = !!prop.valueDeclaration.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          );
        }

        properties.push({
          name: prop.name,
          type: {
            type: "primitive",
            value: propTypeString,
            metadata: { finalTypeString: propTypeString },
          },
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting final properties:", error);
    }

    return properties;
  }

  // 기존 extractOriginalTypeInfo 메서드들 유지 (명목적 과정용)
  private extractOriginalTypeInfo(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    try {
      if (!ts.isTypeReferenceNode(indexNode.objectType)) {
        return [];
      }

      const objectTypeName = indexNode.objectType.typeName.getText();

      if (!ts.isLiteralTypeNode(indexNode.indexType)) {
        return [];
      }

      const propertyName = indexNode.indexType.literal
        .getText()
        .replace(/['"]/g, "");

      const typeDeclaration = this.findTypeDeclarationInProgram(
        objectTypeName,
        context
      );
      if (!typeDeclaration) {
        return [];
      }

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
