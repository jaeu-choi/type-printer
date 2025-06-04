import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class FunctionTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isFunctionTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const functionNode = node as ts.FunctionTypeNode;

    // 🎯 핵심 1: 명목적 과정 - 함수의 구성 요소들을 collector에게 위임
    const nominalProcess = this.extractFunctionProcess(functionNode, context);

    // 🎯 핵심 2: 최종 결과 계산 - collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(functionNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    // 🎯 FunctionTypeHandler의 책임: 함수 구조 생성!
    const structure: TypeStructure = {
      type: "function",
      children: nominalProcess, // 함수 구조의 핵심!
      metadata: {
        originalText: functionNode.getText(),
        finalTypeString,
        signature: this.extractSignatureInfo(functionNode, context),
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정(children) + 최종 결과(computedResult)
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  /**
   * 🎯 함수 타입의 구성 요소들을 collector에게 위임하여 분석
   * (param1: Type1, param2: Type2) => ReturnType → [Parameters, ReturnType] 구조
   */
  private extractFunctionProcess(
    functionNode: ts.FunctionTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const components: TypeStructure[] = [];

    // 1. 제네릭 타입 매개변수 (있는 경우)
    if (functionNode.typeParameters && functionNode.typeParameters.length > 0) {
      components.push({
        type: "reference",
        name: "[TypeParameters]",
        children: this.extractTypeParameters(
          functionNode.typeParameters,
          context
        ),
        metadata: {
          originalText: functionNode.typeParameters
            .map((tp) => tp.getText())
            .join(", "),
          description: "Generic type parameters",
        },
      });
    }

    // 2. 매개변수들 (Parameters)
    if (functionNode.parameters && functionNode.parameters.length > 0) {
      components.push({
        type: "reference",
        name: "[Parameters]",
        children: this.extractParameters(functionNode.parameters, context),
        metadata: {
          originalText: functionNode.parameters
            .map((p) => p.getText())
            .join(", "),
          description: "Function parameters",
        },
      });
    } else {
      // 매개변수가 없는 경우도 명시적으로 표시
      components.push({
        type: "reference",
        name: "[Parameters]",
        children: [],
        metadata: {
          originalText: "()",
          description: "No parameters",
        },
      });
    }

    // 3. 반환 타입 (Return Type)
    components.push({
      type: "reference",
      name: "[ReturnType]",
      children: [this.collector.collect(functionNode.type, context)],
      metadata: {
        originalText: functionNode.type.getText(),
        description: "Function return type",
      },
    });

    return components;
  }

  /**
   * 🆕 제네릭 타입 매개변수 추출
   */
  private extractTypeParameters(
    typeParameters: readonly ts.TypeParameterDeclaration[],
    context: TypeCollectionContext
  ): TypeStructure[] {
    return typeParameters.map((typeParam, index) => {
      const paramName = typeParam.name.text;
      let constraintStructure: TypeStructure | undefined;
      let defaultStructure: TypeStructure | undefined;

      // 제약 조건 (extends)
      if (typeParam.constraint) {
        constraintStructure = this.collector.collect(
          typeParam.constraint,
          context
        );
      }

      // 기본 타입 (default)
      if (typeParam.default) {
        defaultStructure = this.collector.collect(typeParam.default, context);
      }

      const children: TypeStructure[] = [];
      if (constraintStructure) {
        children.push({
          type: "reference",
          name: "[Constraint]",
          children: [constraintStructure],
          metadata: { description: "Type constraint" },
        });
      }
      if (defaultStructure) {
        children.push({
          type: "reference",
          name: "[Default]",
          children: [defaultStructure],
          metadata: { description: "Default type" },
        });
      }

      return {
        type: "reference",
        name: `[${paramName}]`,
        children: children.length > 0 ? children : undefined,
        metadata: {
          originalText: typeParam.getText(),
          description: `Type parameter: ${paramName}`,
          parameterIndex: index,
        },
      };
    });
  }

  /**
   * 🎯 함수 매개변수들을 collector에게 위임하여 분석
   */
  private extractParameters(
    parameters: readonly ts.ParameterDeclaration[],
    context: TypeCollectionContext
  ): TypeStructure[] {
    return parameters.map((param, index) => {
      const paramName = this.getParameterName(param);
      const isOptional = !!param.questionToken;
      const isRest = !!param.dotDotDotToken;

      // 매개변수 타입 분석 (collector에게 위임)
      const paramType = param.type
        ? this.collector.collect(param.type, context)
        : { type: "primitive" as const, value: "any" };

      return {
        type: "reference",
        name: `[${paramName}]`,
        children: [paramType],
        metadata: {
          originalText: param.getText(),
          description: `Parameter: ${paramName}`,
          parameterIndex: index,
          isOptional,
          isRest,
        },
      };
    });
  }

  /**
   * 🔧 매개변수 이름 추출 헬퍼
   */
  private getParameterName(param: ts.ParameterDeclaration): string {
    if (ts.isIdentifier(param.name)) {
      return param.name.text;
    } else if (ts.isObjectBindingPattern(param.name)) {
      return "{ destructured }";
    } else if (ts.isArrayBindingPattern(param.name)) {
      return "[ destructured ]";
    } else {
      return "unknown";
    }
  }

  /**
   * 🎯 함수 시그니처 정보 추출 (디버깅/분석용)
   */
  private extractSignatureInfo(
    functionNode: ts.FunctionTypeNode,
    context: TypeCollectionContext
  ): string {
    try {
      // TypeChecker를 사용한 정확한 시그니처
      const functionType = context.checker.getTypeFromTypeNode(functionNode);
      const signatures = functionType.getCallSignatures();

      if (signatures.length > 0) {
        return context.checker.signatureToString(signatures[0]);
      }

      // Fallback: 텍스트 기반
      return functionNode.getText();
    } catch (error) {
      // 복잡한 제네릭 상황에서는 텍스트로 fallback
      return functionNode.getText();
    }
  }
}
