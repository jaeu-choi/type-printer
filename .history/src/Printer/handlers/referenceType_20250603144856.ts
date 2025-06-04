import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class ReferenceTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isTypeReferenceNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const refNode = node as ts.TypeReferenceNode;
    const symbol = context.checker.getSymbolAtLocation(refNode.typeName);
    const name = symbol ? symbol.getName() : refNode.typeName.getText();

    // 🎯 핵심: 최종 계산된 타입 가져오기 (제네릭 인스턴스화 포함)
    const finalType = context.checker.getTypeFromTypeNode(refNode);
    const finalTypeString = context.checker.typeToString(finalType);

    const typeArgs =
      refNode.typeArguments?.map((arg) =>
        context.checker.typeToString(context.checker.getTypeFromTypeNode(arg))
      ) || [];

    // 내장 타입 처리
    if (this.isBuiltinType(name)) {
      return this.handleBuiltinType(
        name,
        typeArgs,
        finalType,
        finalTypeString,
        refNode,
        context
      );
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

    // 🎯 사용자 정의 타입 처리: collector에게 위임
    return this.handleUserDefinedType(
      symbol,
      name,
      typeArgs,
      finalType,
      finalTypeString,
      refNode,
      context
    );
  }

  /**
   * 내장 타입 처리 (Array, Promise, Record 등)
   */
  private handleBuiltinType(
    name: string,
    typeArgs: string[],
    finalType: ts.Type,
    finalTypeString: string,
    refNode: ts.TypeReferenceNode,
    context: TypeCollectionContext
  ): TypeStructure {
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

    // 🎯 최종 결과는 collector에게 위임
    if (!context.expanded) {
      structure.computedResult = this.collector.createFinalTypeStructure(
        finalType,
        context
      );
    }

    return structure;
  }

  /**
   * 사용자 정의 타입 처리
   */
  private handleUserDefinedType(
    symbol: ts.Symbol | undefined,
    name: string,
    typeArgs: string[],
    finalType: ts.Type,
    finalTypeString: string,
    refNode: ts.TypeReferenceNode,
    context: TypeCollectionContext
  ): TypeStructure {
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

    if (context.expanded) {
      // expanded 모드: 명목적 확장 + 최종 결과
      const nominalExpansion = this.expandReference(symbol, name, context);
      if (nominalExpansion) {
        structure.children = [nominalExpansion];
      }
      structure.computedResult = this.collector.createFinalTypeStructure(
        finalType,
        context
      );
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = this.collector.createFinalTypeStructure(
        finalType,
        context
      );
    }

    return structure;
  }

  /**
   * 🎯 참조 확장: collector에게 위임
   */
  private expandReference(
    symbol: ts.Symbol | undefined,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    if (!symbol?.declarations?.length) {
      return null;
    }

    // 🎯 collector의 안전한 참조 확장 사용
    return this.collector.collectReferenceExpansion(
      symbol.declarations[0],
      typeName,
      context
    );
  }

  /**
   * 내장 타입 체크
   */
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
}
