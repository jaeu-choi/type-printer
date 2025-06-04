import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class MappedTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    if (!ts.isMappedTypeNode(node)) {
      return false;
    }

    const mappedNode = node as ts.MappedTypeNode;

    try {
      // 필수 구성 요소들이 모두 있는지 확인
      if (!mappedNode.typeParameter) return false;
      if (!mappedNode.typeParameter.constraint) return false;
      if (!mappedNode.type) return false;

      // 텍스트 패턴 확인
      const nodeText = node.getText();
      if (
        !nodeText.includes("[") ||
        !nodeText.includes(" in ") ||
        !nodeText.includes("]:")
      ) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const mappedNode = node as ts.MappedTypeNode;

    console.log(`🔥 MappedTypeHandler processing: "${node.getText()}"`);

    // 🎯 핵심 1: 다른 핸들러 호출 없이 직접 최종 결과만 계산
    const finalType = context.checker.getTypeFromTypeNode(mappedNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 🎯 핵심 2: 결과에서 과정 역추적
    const mappingSteps = this.extractMappingStepsFromResult(
      mappedNode,
      finalType,
      context
    );

    // 🎯 핵심 3: 포매터 친화적 구조로 구성
    const structure: TypeStructure = {
      type: "mapped",
      metadata: {
        originalText: mappedNode.getText(),
        finalTypeString,
        mappingPattern: this.extractMappingPattern(mappedNode),
      },
    };

    if (context.expanded) {
      // expanded 모드: 매핑 과정(children) + 최종 결과(computedResult)
      structure.children = mappingSteps;
      structure.computedResult = this.createFinalResultStructure(
        finalType,
        context
      );
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = this.createFinalResultStructure(
        finalType,
        context
      );
    }

    return structure;
  }

  /**
   * 🎯 핵심: 최종 결과에서 매핑 과정 역추적
   * { [K in keyof User]: User[K] } → 실제 매핑된 각 단계들 추출
   */
  private extractMappingStepsFromResult(
    mappedNode: ts.MappedTypeNode,
    finalType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const steps: TypeStructure[] = [];

    try {
      // 매핑 패턴 정보 추출
      const paramName = mappedNode.typeParameter.name.text; // "K"
      const constraintText =
        mappedNode.typeParameter.constraint?.getText() || "unknown"; // "keyof User"
      const valueText = mappedNode.type?.getText() || "unknown"; // "User[K]"

      // 패턴 정보 추가
      steps.push({
        type: "reference",
        name: "[MappingPattern]",
        children: [
          {
            type: "literal",
            value: `[${paramName} in ${constraintText}]: ${valueText}`,
            metadata: {
              description: "Original mapping pattern",
              originalText: mappedNode.getText(),
            },
          },
        ],
        metadata: {
          description: "Mapping type pattern structure",
        },
      });

      // 최종 결과가 객체 타입인 경우 각 property에 대한 매핑 단계 생성
      if (this.isObjectType(finalType)) {
        const properties = finalType.getProperties();
        const mappingIterations: TypeStructure[] = [];

        for (const prop of properties) {
          const propName = prop.name;
          const propType = context.checker.getTypeOfSymbolAtLocation(
            prop,
            prop.valueDeclaration || prop.declarations?.[0]!
          );
          const propTypeString = context.checker.typeToString(propType);

          // 각 매핑 단계: K = "propName", ValueType = propTypeString
          mappingIterations.push({
            type: "reference",
            name: `[Step: ${propName}]`,
            children: [
              {
                type: "literal",
                value: `${paramName} = "${propName}"`,
                metadata: { description: "Iterator variable value" },
              },
              {
                type: "literal",
                value: `${valueText} = ${propTypeString}`,
                metadata: { description: "Mapped value result" },
              },
            ],
            metadata: {
              description: `Mapping iteration for property "${propName}"`,
              keyValue: propName,
              resultType: propTypeString,
            },
          });
        }

        if (mappingIterations.length > 0) {
          steps.push({
            type: "reference",
            name: "[MappingIterations]",
            children: mappingIterations,
            metadata: {
              description:
                "Individual mapping steps extracted from final result",
              totalIterations: mappingIterations.length,
            },
          });
        }
      } else {
        // 객체가 아닌 경우 (예: string[], number[] 등)
        steps.push({
          type: "reference",
          name: "[MappingResult]",
          children: [
            {
              type: "literal",
              value: finalTypeString,
              metadata: { description: "Non-object mapping result" },
            },
          ],
          metadata: {
            description: "Mapped type resolved to non-object type",
          },
        });
      }

      // 수정자 정보 (readonly, optional)
      const modifiers = this.extractModifiersInfo(mappedNode);
      if (modifiers.length > 0) {
        steps.push({
          type: "reference",
          name: "[Modifiers]",
          children: modifiers,
          metadata: {
            description: "Property modifiers applied during mapping",
          },
        });
      }
    } catch (error) {
      console.log(`⚠️ Failed to extract mapping steps: ${error}`);
      // 실패 시 기본 패턴 정보만 반환
      steps.push({
        type: "literal",
        value: mappedNode.getText(),
        metadata: {
          originalText: mappedNode.getText(),
          extractionFailed: true,
        },
      });
    }

    return steps;
  }

  /**
   * 🎯 최종 결과 구조 생성 (다른 핸들러 호출 없이 직접)
   */
  private createFinalResultStructure(
    finalType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // Primitive 타입 체크
    if (this.isPrimitiveType(finalType)) {
      return {
        type: "primitive",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // Union 타입 체크
    if (finalType.isUnion()) {
      const unionMembers = finalType.types.map((memberType) => ({
        type: "primitive" as const,
        value: context.checker.typeToString(memberType),
        metadata: { finalTypeString: context.checker.typeToString(memberType) },
      }));

      return {
        type: "union",
        children: unionMembers,
        metadata: { finalTypeString },
      };
    }

    // 객체 타입 체크
    if (this.isObjectType(finalType)) {
      return this.createObjectStructureDirectly(finalType, context);
    }

    // 배열 타입 체크
    if (this.isArrayType(finalType, finalTypeString)) {
      return this.createArrayStructureDirectly(finalType, context);
    }

    // Fallback
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: { finalTypeString },
    };
  }

  /**
   * 🔧 객체 구조 직접 생성 (다른 핸들러 호출 없이)
   */
  private createObjectStructureDirectly(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(objectType);
    const properties = [];

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
            type: "primitive" as const,
            value: propTypeString,
            metadata: { finalTypeString: propTypeString },
          },
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Error collecting object properties:", error);
    }

    return {
      type: "object",
      properties,
      metadata: { finalTypeString },
    };
  }

  /**
   * 🔧 배열 구조 직접 생성
   */
  private createArrayStructureDirectly(
    arrayType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(arrayType);
    const typeArgs = context.checker.getTypeArguments(
      arrayType as ts.TypeReference
    );

    if (typeArgs && typeArgs.length > 0) {
      const elementTypeString = context.checker.typeToString(typeArgs[0]);
      return {
        type: "array",
        children: [
          {
            type: "primitive" as const,
            value: elementTypeString,
            metadata: { finalTypeString: elementTypeString },
          },
        ],
        metadata: { finalTypeString },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString },
    };
  }

  /**
   * 🔧 매핑 패턴 추출
   */
  private extractMappingPattern(mappedNode: ts.MappedTypeNode): string {
    try {
      const paramName = mappedNode.typeParameter.name.text;
      const constraintText =
        mappedNode.typeParameter.constraint?.getText() || "unknown";
      const valueText = mappedNode.type?.getText() || "unknown";

      return `[${paramName} in ${constraintText}]: ${valueText}`;
    } catch (error) {
      return mappedNode.getText();
    }
  }

  /**
   * 🔧 수정자 정보 추출
   */
  private extractModifiersInfo(mappedNode: ts.MappedTypeNode): TypeStructure[] {
    const modifiers: TypeStructure[] = [];

    if (mappedNode.readonlyToken) {
      const tokenText = mappedNode.readonlyToken.getText();
      modifiers.push({
        type: "operator",
        metadata: {
          operator: "readonly",
          originalText: tokenText,
          modifier: tokenText.startsWith("+")
            ? "add"
            : tokenText.startsWith("-")
            ? "remove"
            : "preserve",
        },
      });
    }

    if (mappedNode.questionToken) {
      const tokenText = mappedNode.questionToken.getText();
      modifiers.push({
        type: "operator",
        metadata: {
          operator: "optional",
          originalText: tokenText,
          modifier: tokenText.startsWith("+")
            ? "add"
            : tokenText.startsWith("-")
            ? "remove"
            : "preserve",
        },
      });
    }

    return modifiers;
  }

  // 🔧 타입 판별 헬퍼들
  private isPrimitiveType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral)
    );
  }

  private isObjectType(type: ts.Type): boolean {
    const properties = type.getProperties();
    return properties && properties.length > 0;
  }

  private isArrayType(type: ts.Type, typeString: string): boolean {
    return (
      typeString.endsWith("[]") ||
      (type.symbol && type.symbol.name === "Array") ||
      typeString.startsWith("Array<")
    );
  }
}
