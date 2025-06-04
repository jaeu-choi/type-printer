import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class ConditionalTypeHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isConditionalTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const conditionalNode = node as ts.ConditionalTypeNode;

    // 최종 계산된 타입 가져오기 (조건부 타입의 평가 결과)
    const finalType = context.checker.getTypeFromTypeNode(conditionalNode);
    const finalTypeString = context.checker.typeToString(finalType);

    // 명목적 과정: 조건부 타입의 각 구성 요소
    const nominalProcess = this.extractNominalProcess(conditionalNode, context);

    // 최종 결과 계산
    const computedResult = this.computeFinalConditionalResult(
      finalType,
      context
    );

    const structure: TypeStructure = {
      type: "conditional",
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 조건부 과정 + 최종 결과
      structure.children = nominalProcess;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 평가 결과만
      structure.computedResult = computedResult;
    }

    return structure;
  }

  private extractNominalProcess(
    conditionalNode: ts.ConditionalTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const process: TypeStructure[] = [];

    // 1. Check Type (T)
    const checkType = this.collectTypeStructure(
      conditionalNode.checkType,
      context
    );
    process.push({
      type: "reference",
      name: "[Check]",
      children: [checkType],
      metadata: {
        originalText: conditionalNode.checkType.getText(),
        description: "Type being checked",
      },
    });

    // 2. Extends Type (U)
    const extendsType = this.collectTypeStructure(
      conditionalNode.extendsType,
      context
    );
    process.push({
      type: "reference",
      name: "[Extends]",
      children: [extendsType],
      metadata: {
        originalText: conditionalNode.extendsType.getText(),
        description: "Type constraint",
      },
    });

    // 3. True Type (X)
    const trueType = this.collectTypeStructure(
      conditionalNode.trueType,
      context
    );
    process.push({
      type: "reference",
      name: "[True]",
      children: [trueType],
      metadata: {
        originalText: conditionalNode.trueType.getText(),
        description: "Result if condition is true",
      },
    });

    // 4. False Type (Y)
    const falseType = this.collectTypeStructure(
      conditionalNode.falseType,
      context
    );
    process.push({
      type: "reference",
      name: "[False]",
      children: [falseType],
      metadata: {
        originalText: conditionalNode.falseType.getText(),
        description: "Result if condition is false",
      },
    });

    // 5. 조건 평가 결과
    const evaluationResult = this.evaluateCondition(conditionalNode, context);
    if (evaluationResult) {
      process.push({
        type: "reference",
        name: "[Evaluation]",
        children: [evaluationResult],
        metadata: {
          originalText: "Condition evaluation result",
          description: "Which branch was taken",
        },
      });
    }

    return process;
  }

  private evaluateCondition(
    conditionalNode: ts.ConditionalTypeNode,
    context: TypeCollectionContext
  ): TypeStructure | null {
    try {
      // TypeChecker를 사용해 조건 평가 시도
      const checkType = context.checker.getTypeFromTypeNode(
        conditionalNode.checkType
      );
      const extendsType = context.checker.getTypeFromTypeNode(
        conditionalNode.extendsType
      );
      const finalType = context.checker.getTypeFromTypeNode(conditionalNode);

      const checkTypeString = context.checker.typeToString(checkType);
      const extendsTypeString = context.checker.typeToString(extendsType);
      const finalTypeString = context.checker.typeToString(finalType);

      // 최종 결과가 trueType인지 falseType인지 추론
      const trueTypeString = context.checker.typeToString(
        context.checker.getTypeFromTypeNode(conditionalNode.trueType)
      );
      const falseTypeString = context.checker.typeToString(
        context.checker.getTypeFromTypeNode(conditionalNode.falseType)
      );

      let conditionResult: string;
      let takenBranch: "true" | "false" | "unknown";

      if (finalTypeString === trueTypeString) {
        conditionResult = `${checkTypeString} extends ${extendsTypeString} → TRUE`;
        takenBranch = "true";
      } else if (finalTypeString === falseTypeString) {
        conditionResult = `${checkTypeString} extends ${extendsTypeString} → FALSE`;
        takenBranch = "false";
      } else {
        conditionResult = `${checkTypeString} extends ${extendsTypeString} → COMPLEX`;
        takenBranch = "unknown";
      }

      return {
        type: "literal",
        value: conditionResult,
        metadata: {
          originalText: conditionResult,
          takenBranch,
          checkType: checkTypeString,
          extendsType: extendsTypeString,
          finalResult: finalTypeString,
        },
      };
    } catch (error) {
      console.log("Debug - Error evaluating conditional:", error);
      return null;
    }
  }

  private computeFinalConditionalResult(
    finalType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    // Union 타입인 경우 (조건부 타입이 여러 결과를 가질 수 있음)
    if (finalType.isUnion()) {
      const unionMembers = finalType.types.map((memberType) => {
        return this.createFinalMemberStructure(memberType, context);
      });

      return {
        type: "union",
        children: unionMembers,
        metadata: {
          finalTypeString,
          description: "Conditional type resolved to union",
        },
      };
    }

    // 객체 타입인 경우
    if (finalType.getProperties && finalType.getProperties().length > 0) {
      return this.createFinalObjectStructure(finalType, context);
    }

    // 단일 타입인 경우 (most common)
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: {
        finalTypeString,
        description: "Conditional type resolved to single type",
      },
    };
  }

  private createFinalMemberStructure(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const memberTypeString = context.checker.typeToString(memberType);

    // 객체 타입인 경우
    if (memberType.getProperties && memberType.getProperties().length > 0) {
      return this.createFinalObjectStructure(memberType, context);
    }

    // 사용자 정의 타입 참조인 경우
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

      return {
        type: "reference",
        name: `[${typeName}]`,
        metadata: {
          finalTypeString: memberTypeString,
          originalTypeName: typeName,
        },
      };
    }

    // 원시 타입인 경우
    return {
      type: "primitive",
      value: memberTypeString,
      metadata: { finalTypeString: memberTypeString },
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
      console.log(
        "Debug - Error collecting conditional object properties:",
        error
      );
    }

    return {
      type: "object",
      properties,
      metadata: {
        finalTypeString: context.checker.typeToString(objectType),
      },
    };
  }

  private collectTypeStructure(
    node: ts.TypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    return new TypeStructureCollector().collect(node, context);
  }
}
