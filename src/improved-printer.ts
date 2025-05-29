// Enhanced TypeScript Type Analyzer with Handler Pattern and Reference Path
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

interface PrintOptions {
  expanded?: boolean;
  verbose?: boolean;
  final?: boolean;
  format?: "tree" | "compact" | "expanded";
  maxDepth?: number;
}

enum AnalyzableKind {
  TYPEALIAS = "TYPEALIAS",
  INTERFACE = "INTERFACE",
  VARIABLE = "VARIABLE",
  FUNCTION = "FUNCTION",
  UNKNOWN = "UNKNOWN",
  ENUM = "ENUM",
  CLASS = "CLASS",
}

interface TypeStructure {
  type:
    | "primitive"
    | "union"
    | "intersection"
    | "array"
    | "reference"
    | "literal"
    | "object"
    | "operator"
    | "access"
    | "conditional"
    | "mapped"
    | "template";
  name?: string;
  value?: string;
  children?: TypeStructure[];
  properties?: ObjectProperty[];
  metadata?: {
    isBuiltin?: boolean;
    typeArgs?: string[];
    originalText?: string;
    operator?: string;
    condition?: string;
    referencePath?: string[];
    originalTypeName?: string; // 원본 타입 이름 보존
    [key: string]: any;
  };
}

interface ObjectProperty {
  name: string;
  type: TypeStructure;
  optional?: boolean;
  readonly?: boolean;
}

interface TypeInfo {
  kind: AnalyzableKind;
  name: string;
  originalSource: string;
  structure: TypeStructure;
}

interface TypeCollectionContext {
  checker: ts.TypeChecker;
  program: ts.Program;
  depth: number;
  maxDepth: number;
  referencePath: string[];
  genericContext?: Map<string, TypeStructure>;
  isInstantiated: boolean;
  sourceFile: ts.SourceFile; // 원본 AST 접근을 위해 추가
}

// Handler interface
interface TypeHandler {
  canHandle(node: ts.TypeNode): boolean;
  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure;
}

// Operator Type Handler (keyof, typeof, readonly)
class OperatorTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeOperatorNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const operatorNode = node as ts.TypeOperatorNode;

    switch (operatorNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword:
        return this.handleKeyOf(operatorNode, context);
      case ts.SyntaxKind.ReadonlyKeyword:
        return this.handleReadonly(operatorNode, context);
      default:
        return this.handleUnknownOperator(operatorNode, context);
    }
  }

  private handleKeyOf(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const type = context.checker.getTypeFromTypeNode(operatorNode);

    if (type.isUnion()) {
      const literalTypes = type.types.map((unionMember) => {
        if (unionMember.isStringLiteral()) {
          return {
            type: "literal" as const,
            value: `"${unionMember.value}"`,
            metadata: { originalText: `"${unionMember.value}"` },
          };
        } else if (unionMember.isNumberLiteral()) {
          return {
            type: "literal" as const,
            value: unionMember.value.toString(),
            metadata: { originalText: unionMember.value.toString() },
          };
        } else {
          const typeString = context.checker.typeToString(unionMember);
          return {
            type: "literal" as const,
            value: typeString,
            metadata: { originalText: typeString },
          };
        }
      });

      return {
        type: "union",
        children: literalTypes,
        metadata: { originalText: operatorNode.getText() },
      };
    } else {
      const typeString = context.checker.typeToString(type);
      return {
        type: "literal",
        value: typeString,
        metadata: { originalText: operatorNode.getText() },
      };
    }
  }

  private handleReadonly(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return {
      type: "operator",
      metadata: {
        operator: "readonly",
        originalText: operatorNode.getText(),
      },
      children: [
        new TypeStructureCollector().collect(operatorNode.type, context),
      ],
    };
  }

  private handleUnknownOperator(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return {
      type: "operator",
      metadata: {
        operator: "unknown",
        originalText: operatorNode.getText(),
      },
      children: [
        new TypeStructureCollector().collect(operatorNode.type, context),
      ],
    };
  }
}

// Indexed Access Type Handler (T[K]) - 핵심 수정 부분
class IndexAccessHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIndexedAccessTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const indexNode = node as ts.IndexedAccessTypeNode;

    // 원본 AST에서 타입 정보를 추출하여 참조 정보 보존
    const originalTypeInfo = this.extractOriginalTypeInfo(indexNode, context);

    const type = context.checker.getTypeFromTypeNode(indexNode);

    if (type.isUnion()) {
      const literalTypes = type.types.map((unionMember, index) => {
        // 원본 타입 정보가 있으면 사용, 없으면 기존 방식
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

  // 원본 AST에서 타입 정보 추출
  private extractOriginalTypeInfo(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    try {
      // objectType이 타입 참조인지 확인
      if (!ts.isTypeReferenceNode(indexNode.objectType)) {
        return [];
      }

      const objectTypeName = indexNode.objectType.typeName.getText();

      // indexType이 리터럴 타입인지 확인
      if (!ts.isLiteralTypeNode(indexNode.indexType)) {
        return [];
      }

      const propertyName = indexNode.indexType.literal
        .getText()
        .replace(/['"]/g, "");

      // 원본 타입 선언 찾기
      const typeDeclaration = this.findTypeDeclarationInProgram(
        objectTypeName,
        context
      );
      if (!typeDeclaration) {
        return [];
      }

      // 프로퍼티의 원본 타입 정보 추출
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

  // 원본 타입 정보를 사용하여 TypeStructure 생성
  private createTypeStructureWithOriginalInfo(
    type: ts.Type,
    originalInfo: { typeName?: string; typeNode?: ts.TypeNode },
    context: TypeCollectionContext
  ): TypeStructure {
    // 원본 타입 이름이 있으면 참조 타입으로 처리
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

      // 순환 참조 체크
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

      // 깊이 제한 확인 후 펼치기
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeByName(typeName, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    }

    // 원본 타입 이름이 없으면 기존 방식 사용
    return this.createTypeStructureFromType(type, context);
  }

  private createTypeStructureFromType(
    type: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const typeString = context.checker.typeToString(type);

    // 심볼이 있는 경우 (사용자 정의 타입)
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

      // 순환 참조 체크
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

      // 깊이 제한 확인 후 펼치기
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeDeclaration(declaration, name, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    } else {
      // 심볼이 없는 경우: 타입 문자열로 사용자 정의 타입인지 판단
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

      // 내장 타입 체크
      if (this.isBuiltinType(typeString)) {
        return {
          type: "reference",
          name: typeString,
          metadata: { isBuiltin: true, originalText: typeString },
        };
      }

      // 그 외는 사용자 정의 타입으로 간주
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

      // 타입 이름으로 선언을 찾아서 펼치기 시도
      if (this.shouldExpandReference(context)) {
        const expanded = this.expandTypeByName(typeString, context);
        if (expanded) {
          structure.children = [expanded];
        }
      }

      return structure;
    }
  }

  // 타입 이름으로 선언을 찾아서 펼치는 헬퍼 메서드
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
      // 찾기 실패시 null 반환
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

// Conditional Type Handler (T extends U ? X : Y)
class ConditionalTypeHandler implements TypeHandler {
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

// Reference Type Handler
class ReferenceTypeHandler implements TypeHandler {
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

    // 순환 참조 체크
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

    // 재귀적으로 펼치기 (깊이 제한 확인)
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

// Primitive Type Handler
class PrimitiveTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return this.isPrimitiveOrBuiltinTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    return {
      type: "primitive",
      value: node.getText(),
      metadata: { isBuiltin: true },
    };
  }

  private isPrimitiveOrBuiltinTypeNode(node: ts.TypeNode): boolean {
    const k = node.kind;
    return (
      k === ts.SyntaxKind.StringKeyword ||
      k === ts.SyntaxKind.NumberKeyword ||
      k === ts.SyntaxKind.BooleanKeyword ||
      k === ts.SyntaxKind.SymbolKeyword ||
      k === ts.SyntaxKind.BigIntKeyword ||
      k === ts.SyntaxKind.UnknownKeyword ||
      k === ts.SyntaxKind.AnyKeyword ||
      k === ts.SyntaxKind.NeverKeyword ||
      k === ts.SyntaxKind.VoidKeyword ||
      k === ts.SyntaxKind.NullKeyword ||
      k === ts.SyntaxKind.UndefinedKeyword
    );
  }
}

// Union Type Handler
class UnionTypeHandler implements TypeHandler {
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

// Intersection Type Handler
class IntersectionTypeHandler implements TypeHandler {
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

// Array Type Handler
class ArrayTypeHandler implements TypeHandler {
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

// Object Literal Type Handler
class ObjectLiteralTypeHandler implements TypeHandler {
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

// Fallback Handler for unknown types
class FallbackTypeHandler implements TypeHandler {
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

// Main Type Structure Collector
class TypeStructureCollector {
  private handlers: TypeHandler[] = [
    new OperatorTypeHandler(),
    new IndexAccessHandler(),
    new ConditionalTypeHandler(),
    new ReferenceTypeHandler(),
    new UnionTypeHandler(),
    new IntersectionTypeHandler(),
    new ArrayTypeHandler(),
    new ObjectLiteralTypeHandler(),
    new PrimitiveTypeHandler(),
    new FallbackTypeHandler(),
  ];

  collect(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    for (const handler of this.handlers) {
      if (handler.canHandle(node)) {
        return handler.handle(node, context);
      }
    }

    throw new Error("No handler found for type node");
  }
}

// Enhanced Formatter
class TypeFormatter {
  private readonly DEFAULT_WIDTH = 50;
  private readonly INDENT_SIZE = 2;

  format(
    info: TypeInfo,
    style: "tree" | "compact" | "expanded" = "tree"
  ): string {
    const separator = "=".repeat(this.calculateOptimalWidth(info));
    const header = this.formatHeader(info.name, info.originalSource);
    const body = this.formatStructure(info.structure, style, 0);

    return [
      separator,
      header,
      separator,
      `${info.name}:`,
      body,
      separator,
    ].join("\n");
  }

  private calculateOptimalWidth(info: TypeInfo): number {
    const sourceWidth = info.originalSource.length;
    const maxDepth = this.getMaxDepth(info.structure);
    const estimatedWidth = Math.max(
      sourceWidth + 10,
      maxDepth * this.INDENT_SIZE + 30,
      this.DEFAULT_WIDTH
    );
    return Math.min(estimatedWidth, 100);
  }

  private getMaxDepth(structure: TypeStructure, currentDepth = 0): number {
    if (!structure.children || structure.children.length === 0) {
      return currentDepth;
    }
    return Math.max(
      ...structure.children.map((child) =>
        this.getMaxDepth(child, currentDepth + 1)
      )
    );
  }

  private formatHeader(name: string, originalSource: string): string {
    return `|            [Original]               |\n|${originalSource}`;
  }

  private formatStructure(
    structure: TypeStructure,
    style: string,
    depth: number
  ): string {
    const indent = this.getIndent(depth);

    switch (structure.type) {
      case "primitive":
        return `${indent}${structure.value}`;

      case "literal":
        return `${indent}${structure.value}`;

      case "operator":
        const operatorHeader = `${indent}[${structure.metadata?.operator}]`;
        if (structure.children && structure.children.length > 0) {
          const childFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          return `${operatorHeader}\n${childFormatted}`;
        }
        return operatorHeader;

      case "access":
        const accessHeader = `${indent}[IndexedAccess]`;
        if (structure.children && structure.children.length >= 2) {
          const objFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          const indexFormatted = this.formatStructure(
            structure.children[1],
            style,
            depth + 1
          );
          return `${accessHeader}\n${objFormatted}\n${indexFormatted}`;
        }
        return accessHeader;

      case "conditional":
        const condHeader = `${indent}[Conditional]`;
        if (structure.children && structure.children.length >= 4) {
          const parts = structure.children.map((child, i) => {
            const labels = ["Check", "Extends", "True", "False"];
            return `${indent}  [${labels[i]}]\n${this.formatStructure(
              child,
              style,
              depth + 2
            )}`;
          });
          return `${condHeader}\n${parts.join("\n")}`;
        }
        return condHeader;

      case "reference":
        const typeArgs = structure.metadata?.typeArgs?.length
          ? `<${structure.metadata.typeArgs.join(", ")}>`
          : "";
        const refHeader = `${indent}${structure.name}${typeArgs}`;

        if (structure.children && structure.children.length > 0) {
          const childrenFormatted = structure.children
            .map((child) => this.formatStructure(child, style, depth + 1))
            .join("\n");
          return `${refHeader}\n${childrenFormatted}`;
        }
        return refHeader;

      case "union":
        return this.formatUnionOrIntersection(
          structure,
          style,
          depth,
          "[Union]"
        );

      case "intersection":
        return this.formatUnionOrIntersection(
          structure,
          style,
          depth,
          "[Intersection]"
        );

      case "array":
        const arrayHeader = `${indent}Array`;
        if (structure.children && structure.children.length > 0) {
          const elementFormatted = this.formatStructure(
            structure.children[0],
            style,
            depth + 1
          );
          return `${arrayHeader}\n${elementFormatted}`;
        }
        return arrayHeader;

      case "object":
        return this.formatObject(structure, style, depth);

      default:
        return `${indent}${structure.metadata?.originalText || "Unknown"}`;
    }
  }

  private formatUnionOrIntersection(
    structure: TypeStructure,
    style: string,
    depth: number,
    label: string
  ): string {
    const indent = this.getIndent(depth);
    const header = `${indent}${label}`;

    if (!structure.children || structure.children.length === 0) {
      return header;
    }

    const childrenFormatted = structure.children
      .map((child) => this.formatStructure(child, style, depth + 1))
      .join("\n");

    return `${header}\n${childrenFormatted}`;
  }

  private formatObject(
    structure: TypeStructure,
    style: string,
    depth: number
  ): string {
    const braceIndent = this.getIndent(depth);
    const propIndent = this.getIndent(depth + 1);

    if (!structure.properties || structure.properties.length === 0) {
      return `${braceIndent}{}`;
    }

    const header = `${braceIndent}{`;
    const footer = `${braceIndent}}`;

    const properties = structure.properties.map((prop) => {
      const optional = prop.optional ? "?" : "";
      const readonly = prop.readonly ? "readonly " : "";
      const propType = this.formatStructure(prop.type, style, 0).trim();

      return `${propIndent}${readonly}${prop.name}${optional}: ${propType};`;
    });

    return `${header}\n${properties.join("\n")}\n${footer}`;
  }

  private getIndent(depth: number): string {
    if (depth === 0) return "";
    return (
      " ".repeat((depth - 1) * this.INDENT_SIZE) +
      "|" +
      "-".repeat(this.INDENT_SIZE + 1)
    );
  }
}

// Enhanced TypeAliasPrinter
export class TypeAliasPrinter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;
  private fileName: string;
  private sourceCode: string;
  private formatter: TypeFormatter;
  private collector: TypeStructureCollector;

  constructor(indexFilePath: string) {
    this.fileName = path.resolve(indexFilePath);
    this.sourceCode = fs.readFileSync(this.fileName, "utf-8");

    this.program = ts.createProgram([this.fileName], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    });
    this.checker = this.program.getTypeChecker();
    const src = this.program.getSourceFile(this.fileName);
    if (!src) throw new Error("Cannot find source file: " + this.fileName);
    this.sourceFile = src;
    this.formatter = new TypeFormatter();
    this.collector = new TypeStructureCollector();
  }

  public printType(name: string, options?: PrintOptions): void {
    const maxDepth = options?.maxDepth || 10;
    const { typeName, isInstantiated, typeArgs } = this.parseTypeRequest(name);
    const kind = this.identifyKind(typeName);
    console.log("Kind:", kind);

    const context: TypeCollectionContext = {
      checker: this.checker,
      depth: 0,
      program: this.program,
      maxDepth,
      referencePath: [], // 빈 배열로 시작
      isInstantiated,
      genericContext: isInstantiated
        ? this.createGenericContext(typeName, typeArgs)
        : undefined,
      sourceFile: this.sourceFile, // 원본 AST 접근을 위해 추가
    };

    switch (kind) {
      case AnalyzableKind.TYPEALIAS:
        const typeInfo = this.collectTypeAliasInfo(typeName, context);
        const formatted = this.formatter.format(typeInfo, options?.format);
        console.log(formatted);
        break;
      case AnalyzableKind.INTERFACE:
        const interfaceInfo = this.collectInterfaceInfo(typeName, context);
        const interfaceFormatted = this.formatter.format(
          interfaceInfo,
          options?.format
        );
        console.log(interfaceFormatted);
        break;
      default:
        console.log("Cannot find analyzable symbol: '" + typeName + "'.");
    }
  }

  private parseTypeRequest(input: string): {
    typeName: string;
    isInstantiated: boolean;
    typeArgs: string[];
  } {
    const genericMatch = input.match(/^([^<]+)<(.+)>$/);
    if (genericMatch) {
      const typeName = genericMatch[1].trim();
      const typeArgsString = genericMatch[2];
      const typeArgs = this.parseTypeArguments(typeArgsString);
      return { typeName, isInstantiated: true, typeArgs };
    }
    return { typeName: input, isInstantiated: false, typeArgs: [] };
  }

  private parseTypeArguments(argsString: string): string[] {
    return argsString.split(",").map((arg) => arg.trim());
  }

  private createGenericContext(
    typeName: string,
    typeArgs: string[]
  ): Map<string, TypeStructure> {
    const context = new Map<string, TypeStructure>();

    const declaration = this.findTypeDeclaration(typeName);
    if (
      declaration &&
      "typeParameters" in declaration &&
      declaration.typeParameters
    ) {
      declaration.typeParameters.forEach((param, index) => {
        if (index < typeArgs.length) {
          const paramName = param.name.text;
          const argType = typeArgs[index];
          context.set(paramName, {
            type: "primitive",
            value: argType,
          });
        }
      });
    }

    return context;
  }

  private findTypeDeclaration(
    name: string
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return statement;
      }
    }
    return null;
  }

  private collectInterfaceInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const interfaceDecl = this.sourceFile.statements.find(
      (n): n is ts.InterfaceDeclaration =>
        ts.isInterfaceDeclaration(n) && n.name.text === name
    );

    if (!interfaceDecl) {
      throw new Error(`Interface ${name} not found`);
    }

    const originalSource = interfaceDecl.getText();
    const structure = this.collectInterfaceStructure(interfaceDecl, context);

    return {
      kind: AnalyzableKind.INTERFACE,
      name,
      originalSource,
      structure,
    };
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

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }

  private collectTypeAliasInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const aliasDecl = this.sourceFile.statements.find(
      (n): n is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(n) && n.name.text === name
    );

    if (!aliasDecl) {
      throw new Error(`Alias ${name} not found`);
    }

    const originalSource = aliasDecl.getText();
    const structure = this.collector.collect(aliasDecl.type, context);

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name,
      originalSource,
      structure,
    };
  }

  private identifyKind(name: string): AnalyzableKind {
    const symbol = this.findSymbolByName(name);
    if (!symbol) return AnalyzableKind.UNKNOWN;

    const flags = symbol.getFlags();

    if (flags & ts.SymbolFlags.TypeAlias) return AnalyzableKind.TYPEALIAS;
    if (flags & ts.SymbolFlags.Interface) return AnalyzableKind.INTERFACE;
    if (flags & ts.SymbolFlags.Enum) return AnalyzableKind.ENUM;
    if (flags & ts.SymbolFlags.Class) return AnalyzableKind.CLASS;
    if (flags & ts.SymbolFlags.Function) return AnalyzableKind.FUNCTION;

    if (flags & ts.SymbolFlags.Variable) {
      const type = this.checker.getTypeOfSymbolAtLocation(
        symbol,
        symbol.valueDeclaration!
      );
      if (type.getCallSignatures().length > 0) return AnalyzableKind.FUNCTION;
      return AnalyzableKind.VARIABLE;
    }

    return AnalyzableKind.UNKNOWN;
  }

  private findSymbolByName(name: string): ts.Symbol | undefined {
    for (const statement of this.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isFunctionDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return this.checker.getSymbolAtLocation(statement.name);
      }

      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            return this.checker.getSymbolAtLocation(decl.name);
          }
        }
      }
    }

    return undefined;
  }
}
