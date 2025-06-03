import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class ReferenceTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeReferenceNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const refNode = node as ts.TypeReferenceNode;
    const symbol = context.checker.getSymbolAtLocation(refNode.typeName);
    const name = symbol ? symbol.getName() : refNode.typeName.getText();

    // 최종 계산된 타입 가져오기 (제네릭 인스턴스화 포함)
    const finalType = context.checker.getTypeFromTypeNode(refNode);
    const finalTypeString = context.checker.typeToString(finalType);

    const typeArgs =
      refNode.typeArguments?.map((arg) =>
        context.checker.typeToString(context.checker.getTypeFromTypeNode(arg))
      ) || [];

    if (this.isBuiltinType(name)) {
      // 내장 타입의 경우 최종 결과 계산
      const computedResult = this.computeBuiltinTypeResult(
        finalType,
        name,
        typeArgs,
        context
      );

      const structure: TypeStructure = {
        type: "reference",
        name,
        metadata: {
          typeArgs,
          originalText: refNode.getText(),
          isBuiltin: true,
          finalTypeString,
        },
      };

      if (!context.expanded) {
        structure.computedResult = computedResult;
      }

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
          finalTypeString,
        },
      };
    }

    // 사용자 정의 타입의 경우
    const structure: TypeStructure = {
      type: "reference",
      name: `[${name}]`,
      metadata: {
        typeArgs,
        originalText: refNode.getText(),
        isBuiltin: false,
        referencePath: [...context.referencePath, name],
        finalTypeString,
      },
    };

    // 명목적 과정과 최종 결과 계산
    const nominalExpansion = this.expandReference(symbol, name, context);
    const computedResult = this.computeFinalReferenceResult(
      finalType,
      name,
      context
    );

    if (context.expanded) {
      // expanded 모드: 명목적 확장 + 최종 결과
      if (nominalExpansion) {
        structure.children = [nominalExpansion];
      }
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private computeBuiltinTypeResult(
    finalType: ts.Type,
    typeName: string,
    typeArgs: string[],
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // 제네릭 내장 타입들의 최종 형태 계산
    switch (typeName) {
      case "Array":
        if (typeArgs.length > 0) {
          return {
            type: "array",
            children: [
              {
                type: "primitive",
                value: typeArgs[0],
                metadata: { finalTypeString: typeArgs[0] },
              },
            ],
            metadata: { finalTypeString },
          };
        }
        break;

      case "Promise":
        if (typeArgs.length > 0) {
          return {
            type: "reference",
            name: "Promise",
            children: [
              {
                type: "primitive",
                value: typeArgs[0],
                metadata: { finalTypeString: typeArgs[0] },
              },
            ],
            metadata: { finalTypeString, isBuiltin: true },
          };
        }
        break;

      case "Record":
        if (typeArgs.length >= 2) {
          return {
            type: "object",
            metadata: {
              finalTypeString,
              recordKeyType: typeArgs[0],
              recordValueType: typeArgs[1],
            },
          };
        }
        break;

      case "Pick":
      case "Omit":
      case "Partial":
      case "Required":
      case "Readonly":
        // 이런 유틸리티 타입들은 실제 계산된 객체 구조 반환
        if (finalType.getProperties && finalType.getProperties().length > 0) {
          return this.createFinalObjectStructure(finalType, context);
        }
        break;
    }

    // 기본: 타입 이름과 인자들
    return {
      type: "reference",
      name: typeName,
      metadata: {
        typeArgs,
        finalTypeString,
        isBuiltin: true,
      },
    };
  }

  private computeFinalReferenceResult(
    finalType: ts.Type,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // 객체 타입인 경우 실제 프로퍼티 구조 반환
    if (finalType.getProperties && finalType.getProperties().length > 0) {
      return this.createFinalObjectStructure(finalType, context);
    }

    // Union 타입인 경우
    if (finalType.isUnion()) {
      const unionMembers = finalType.types.map((memberType) => {
        const memberString = context.checker.typeToString(memberType);

        if (memberType.getProperties && memberType.getProperties().length > 0) {
          return this.createFinalObjectStructure(memberType, context);
        } else {
          return {
            type: "primitive" as const,
            value: memberString,
            metadata: { finalTypeString: memberString },
          };
        }
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString },
      };
    }

    // 원시 타입이나 단순 참조인 경우
    return {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        finalTypeString,
        originalTypeName: typeName,
      },
    };
  }

  private createFinalObjectStructure(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
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

        // 복잡한 프로퍼티 타입의 경우 재귀적 처리
        const finalPropType = this.createFinalPropertyType(propType, context);

        properties.push({
          name: prop.name,
          type: finalPropType,
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting reference properties:", error);
    }

    return {
      type: "object",
      properties,
      metadata: {
        finalTypeString: context.checker.typeToString(objectType),
      },
    };
  }

  private createFinalPropertyType(
    propType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const propTypeString = context.checker.typeToString(propType);

    // 1. Primitive 타입 먼저 체크 (가장 중요!)
    const isPrimitive = !!(
      propType.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol)
    );

    if (isPrimitive) {
      return {
        type: "primitive",
        value: propTypeString,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 2. Union 타입인 경우
    if (propType.isUnion()) {
      const unionMembers = propType.types.map((memberType) => {
        const memberString = context.checker.typeToString(memberType);

        // Union 멤버가 객체인지 확인
        if (memberType.getProperties && memberType.getProperties().length > 0) {
          return this.createFinalObjectStructure(memberType, context);
        } else {
          return {
            type: "primitive" as const,
            value: memberString,
            metadata: { finalTypeString: memberString },
          };
        }
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString: propTypeString },
      };
    }

    // 3. 배열 타입인 경우 (객체보다 먼저)
    const typeArgs = context.checker.getTypeArguments(
      propType as ts.TypeReference
    );
    if (typeArgs && typeArgs.length > 0 && propTypeString.endsWith("[]")) {
      const elementType = typeArgs[0];
      const elementTypeString = context.checker.typeToString(elementType);

      // 배열 원소가 객체인지 확인
      if (elementType.getProperties && elementType.getProperties().length > 0) {
        const elementStructure = this.createFinalObjectStructure(
          elementType,
          context
        );
        return {
          type: "array",
          children: [elementStructure],
          metadata: { finalTypeString: propTypeString },
        };
      } else {
        return {
          type: "array",
          children: [
            {
              type: "primitive",
              value: elementTypeString,
              metadata: { finalTypeString: elementTypeString },
            },
          ],
          metadata: { finalTypeString: propTypeString },
        };
      }
    }

    // 4. 실제 객체 타입 체크 (사용자 정의 객체만)
    const properties = propType.getProperties();
    if (properties.length > 0 && properties.length <= 50) {
      // 내장 타입이 아닌 실제 사용자 정의 객체만 처리
      return this.createFinalObjectStructure(propType, context);
    }

    // 5. 참조 타입인 경우 (사용자 정의 타입)
    if (propType.symbol && propType.symbol.declarations) {
      const declaration = propType.symbol.declarations[0];
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
            finalTypeString: propTypeString,
          },
        };
      }

      // 사용자 정의 타입인 경우 - 객체 구조로 확장
      if (properties.length > 0) {
        return this.createFinalObjectStructure(propType, context);
      } else {
        return {
          type: "reference",
          name: `[${typeName}]`,
          metadata: {
            isBuiltin: false,
            finalTypeString: propTypeString,
            originalTypeName: typeName,
          },
        };
      }
    }

    // 6. 기본 fallback - 복잡한 타입은 문자열로
    return {
      type: "primitive",
      value: propTypeString,
      metadata: { finalTypeString: propTypeString },
    };
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
