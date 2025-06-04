import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

export class ConditionalTypeHandler implements TypeHandler {
  constructor(private readonly collector: any) {} // TypeStructureCollector 주입

  canHandle(node: ts.TypeNode): boolean {
    return ts.isConditionalTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const conditionalNode = node as ts.ConditionalTypeNode;

    // 🎯 핵심 1: 명목적 과정 - 조건부 타입의 각 구성 요소를 collector에게 위임
    const nominalProcess = this.extractConditionalProcess(
      conditionalNode,
      context
    );

    // 🎯 핵심 2: 최종 결과 계산 - collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(conditionalNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    // 🎯 ConditionalTypeHandler의 책임: 조건부 구조 생성!
    const structure: TypeStructure = {
      type: "conditional",
      children: nominalProcess, // 조건부 구조의 핵심!
      metadata: {
        originalText: conditionalNode.getText(),
        finalTypeString,
        condition: this.extractConditionInfo(conditionalNode, context),
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
   * 🎯 조건부 타입의 구성 요소들을 collector에게 위임하여 분석
   * T extends U ? X : Y → [Check, Extends, True, False] 구조
   */
  private extractConditionalProcess(
    conditionalNode: ts.ConditionalTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    return [
      // 1. Check Type (T)
      {
        type: "reference",
        name: "[Check]",
        children: [this.collector.collect(conditionalNode.checkType, context)],
        metadata: {
          originalText: conditionalNode.checkType.getText(),
          description: "Type being checked",
        },
      },

      // 2. Extends Type (U)
      {
        type: "reference",
        name: "[Extends]",
        children: [
          this.collector.collect(conditionalNode.extendsType, context),
        ],
        metadata: {
          originalText: conditionalNode.extendsType.getText(),
          description: "Type constraint",
        },
      },

      // 3. True Type (X) - infer 처리 포함
      {
        type: "reference",
        name: "[True]",
        children: [
          this.processTypeWithInfer(conditionalNode.trueType, context),
        ],
        metadata: {
          originalText: conditionalNode.trueType.getText(),
          description: "Result if condition is true",
        },
      },

      // 4. False Type (Y)
      {
        type: "reference",
        name: "[False]",
        children: [this.collector.collect(conditionalNode.falseType, context)],
        metadata: {
          originalText: conditionalNode.falseType.getText(),
          description: "Result if condition is false",
        },
      },
    ];
  }

  /**
   * 🆕 infer 키워드 처리
   * infer R 같은 타입에서 infer를 특별 처리
   */
  private processTypeWithInfer(
    typeNode: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    // infer 키워드가 포함된 타입인지 확인
    if (this.containsInfer(typeNode)) {
      return this.handleInferType(typeNode, context);
    }

    // 일반적인 타입은 collector에게 위임
    return this.collector.collect(typeNode, context);
  }

  /**
   * 🆕 infer 키워드 포함 여부 확인
   */
  private containsInfer(node: ts.TypeNode): boolean {
    // infer는 conditional type의 extends 절에서만 나타남
    // 예: T extends (...args: any[]) => infer R ? R : any

    // 간단한 구현: infer 키워드가 텍스트에 포함되어 있는지 확인
    const nodeText = node.getText();
    return nodeText.includes("infer ");
  }

  /**
   * 🆕 infer 타입 처리
   */
  private handleInferType(
    typeNode: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    // infer 타입의 최종 결과 계산
    const finalType = context.checker.getTypeFromTypeNode(typeNode);
    const finalTypeString = context.checker.typeToString(finalType);

    return {
      type: "operator",
      metadata: {
        operator: "infer",
        originalText: typeNode.getText(),
        finalTypeString,
        description: "Inferred type variable",
      },
      // infer의 실제 추론 결과는 computedResult에
      computedResult: this.collector.createFinalTypeStructure(
        finalType,
        context
      ),
    };
  }

  /**
   * 🎯 조건 평가 정보 추출 (디버깅/분석용)
   */
  private extractConditionInfo(
    conditionalNode: ts.ConditionalTypeNode,
    context: TypeCollectionContext
  ): string {
    try {
      const checkTypeString = context.checker.typeToString(
        context.checker.getTypeFromTypeNode(conditionalNode.checkType)
      );
      const extendsTypeString = context.checker.typeToString(
        context.checker.getTypeFromTypeNode(conditionalNode.extendsType)
      );

      return `${checkTypeString} extends ${extendsTypeString}`;
    } catch (error) {
      // 복잡한 제네릭 상황에서는 텍스트로 fallback
      return `${conditionalNode.checkType.getText()} extends ${conditionalNode.extendsType.getText()}`;
    }
  }
}
