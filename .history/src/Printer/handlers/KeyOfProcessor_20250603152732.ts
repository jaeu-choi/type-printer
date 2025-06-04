import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "../types";

export class KeyOfProcessor {
  constructor(private readonly collector: any) {}

  process(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    // 🎯 핵심: keyof는 결과 중심으로 처리!

    // 1. TypeChecker로 최종 타입 계산
    const finalType = context.checker.getTypeFromTypeNode(operatorNode);
    const finalTypeString = context.checker.typeToString(finalType);

    console.log("=== KeyOfProcessor: keyof 결과 중심 처리 ===");
    console.log("finalTypeString:", finalTypeString);

    // 2. keyof 결과를 직접 Union으로 생성
    const keyofResult = this.createKeyOfResult(
      finalType,
      finalTypeString,
      context
    );

    // 🎯 KeyOf 구조 생성 (결과 중심!)
    const structure: TypeStructure = {
      type: "operator",
      metadata: {
        operator: "keyof",
        originalText: operatorNode.getText(),
        finalTypeString,
        skipRecomputation: true, // 🔥 재계산 방지!
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과
      const nominalTarget = this.collector.collect(operatorNode.type, context);
      structure.children = [nominalTarget];
      structure.computedResult = keyofResult;
    } else {
      // 기본 모드: 최종 결과만 (keyof는 결과가 중요!)
      structure.computedResult = keyofResult;
    }

    return structure;
  }

  /**
   * 🎯 keyof 결과를 직접 생성 (collector 위임 없이)
   */
  private createKeyOfResult(
    finalType: ts.Type,
    finalTypeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    console.log("✓ keyof 결과 직접 생성");

    // Union 타입인 경우 (일반적인 keyof 결과)
    if (finalType.isUnion() && finalType.types && finalType.types.length > 0) {
      console.log("✓ Union 타입으로 keyof 결과 처리");

      const literalTypes = finalType.types.map((unionMember) => {
        const memberString = context.checker.typeToString(unionMember);
        console.log(`  - 키: ${memberString}`);

        if (unionMember.isStringLiteral()) {
          return {
            type: "literal" as const,
            value: `"${unionMember.value}"`,
            metadata: {
              originalText: `"${unionMember.value}"`,
              finalTypeString: `"${unionMember.value}"`,
            },
          };
        } else {
          return {
            type: "literal" as const,
            value: memberString,
            metadata: {
              originalText: memberString,
              finalTypeString: memberString,
            },
          };
        }
      });

      return {
        type: "union",
        children: literalTypes,
        metadata: {
          finalTypeString,
          skipRecomputation: true, // 🔥 중요: 재계산 방지
        },
      };
    }

    // 단일 키인 경우
    if (finalTypeString.startsWith('"') && finalTypeString.endsWith('"')) {
      console.log("✓ 단일 키로 keyof 결과 처리");
      return {
        type: "literal",
        value: finalTypeString,
        metadata: {
          finalTypeString,
          skipRecomputation: true,
        },
      };
    }

    // Fallback: 문자열 파싱
    if (finalTypeString.includes(" | ")) {
      console.log("✓ 문자열 파싱으로 Union 생성");
      const unionParts = finalTypeString
        .split(" | ")
        .map((part) => part.trim());
      const literalTypes = unionParts.map((part) => ({
        type: "literal" as const,
        value: part,
        metadata: { originalText: part, finalTypeString: part },
      }));

      return {
        type: "union",
        children: literalTypes,
        metadata: {
          finalTypeString,
          skipRecomputation: true,
        },
      };
    }

    // 최종 fallback
    console.log("✓ fallback으로 keyof 결과 처리");
    return {
      type: "literal",
      value: finalTypeString,
      metadata: {
        finalTypeString,
        skipRecomputation: true,
      },
    };
  }
}
