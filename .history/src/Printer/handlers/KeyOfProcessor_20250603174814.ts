// KeyOfProcessor.ts를 다음과 같이 완전히 수정:

import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "../types";

export class KeyOfProcessor {
  constructor(private readonly collector: any) {}

  process(
    operatorNode: ts.TypeOperatorNode,
    context: TypeCollectionContext
  ): TypeStructure {
    const keyofTarget = operatorNode.type.getText();

    console.log(`🔍 KeyOfProcessor: Processing keyof ${keyofTarget}`);

    // 🚨 깊이 제한으로 무한 재귀 방지
    if (context.depth >= context.maxDepth - 2) {
      console.log(`🚨 KeyOf depth limit reached for: ${keyofTarget}`);
      const finalTypeString = `keyof ${keyofTarget}`;
      return {
        type: "operator",
        metadata: {
          operator: "keyof",
          originalText: operatorNode.getText(),
          finalTypeString,
          depthLimited: true,
        },
      };
    }

    // 🚨 keyof 스택 체크
    if (!context.keyofStack) {
      context.keyofStack = new Set();
    }

    if (context.keyofStack.has(keyofTarget)) {
      console.log(`🚨 KeyOf circular reference detected: ${keyofTarget}`);
      return {
        type: "operator",
        metadata: {
          operator: "keyof",
          originalText: operatorNode.getText(),
          finalTypeString: `keyof ${keyofTarget}`,
          isCircular: true,
        },
      };
    }

    // 현재 타겟을 스택에 추가
    context.keyofStack.add(keyofTarget);

    try {
      // 🎯 안전한 컨텍스트로 처리
      const safeContext = {
        ...context,
        depth: context.depth + 1,
      };

      // 🚨 최종 결과만 사용 - 명목적 과정은 스킵
      const finalType = context.checker.getTypeFromTypeNode(operatorNode);
      const finalTypeString = context.checker.typeToString(finalType);

      console.log("=== KeyOfProcessor: 최종 결과만 사용 ===");
      console.log("finalTypeString:", finalTypeString);

      // 🎯 단순한 KeyOf 구조 생성 (재귀 없음)
      const structure: TypeStructure = {
        type: "operator",
        metadata: {
          operator: "keyof",
          originalText: operatorNode.getText(),
          finalTypeString,
          target: keyofTarget,
        },
      };

      // expanded 모드에서만 대상 타입 분석 (안전하게)
      if (context.expanded && context.depth < context.maxDepth - 3) {
        try {
          const nominalTarget = this.collector.collect(
            operatorNode.type,
            safeContext
          );
          structure.children = [nominalTarget];
        } catch (error: Error) {
          console.log(`⚠️ KeyOf target analysis failed: ${error.message}`);
          // 에러 발생 시 children 없이 진행
        }
      }

      // 최종 결과는 TypeChecker 결과만 사용
      const computedResult = {
        type: "literal" as const,
        value: finalTypeString,
        metadata: { finalTypeString },
      };

      if (context.expanded) {
        structure.computedResult = computedResult;
      } else {
        structure.computedResult = computedResult;
      }

      return structure;
    } finally {
      // 🚨 스택에서 제거 (finally로 확실히 정리)
      context.keyofStack.delete(keyofTarget);
    }
  }
}
