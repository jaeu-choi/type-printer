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
      // 🎯 실제 MappedTypeNode의 필수 구성 요소들이 모두 있는지 확인
      if (!mappedNode.typeParameter) {
        return false;
      }

      if (!mappedNode.typeParameter.constraint) {
        return false;
      }

      if (!mappedNode.type) {
        return false;
      }

      // 텍스트 패턴도 확인
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
      // 접근 중 에러가 발생하면 처리하지 않음
      return false;
    }
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const mappedNode = node as ts.MappedTypeNode;
    console.log(
      `🔥 MappedTypeHandler processing: "${node.getText()}" (kind: ${
        node.kind
      })`
    );

    // 구성 요소들 확인
    console.log(`  - typeParameter: ${mappedNode.typeParameter?.getText()}`);
    console.log(
      `  - constraint: ${mappedNode.typeParameter?.constraint?.getText()}`
    );
    console.log(`  - type: ${mappedNode.type?.getText()}`);

    // 🎯 핵심 1: 명목적 과정 - 매핑된 타입의 구성 요소들을 collector에게 위임
    const nominalProcess = this.extractMappedProcess(mappedNode, context);

    // 🎯 핵심 2: 최종 결과 계산 - collector에게 완전 위임
    const finalType = context.checker.getTypeFromTypeNode(mappedNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    const finalTypeString = context.checker.typeToString(finalType);

    // 🎯 MappedTypeHandler의 책임: 매핑된 타입 구조 생성!
    const structure: TypeStructure = {
      type: "mapped",
      children: nominalProcess, // 매핑된 타입 구조의 핵심!
      metadata: {
        originalText: mappedNode.getText(),
        finalTypeString,
        mappingInfo: this.extractMappingInfo(mappedNode, context),
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
   * 🎯 매핑된 타입의 구성 요소들을 collector에게 위임하여 분석
   * { [P in K]: T } → [TypeParameter, InType, ValueType, Modifiers] 구조
   */
  // mappedType.ts의 extractMappedProcess 메서드 수정:

  private extractMappedProcess(
    mappedNode: ts.MappedTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    const components: TypeStructure[] = [];

    // 🚨 깊이 제한 체크
    if (context.depth >= context.maxDepth - 2) {
      console.log(`🚨 MappedType depth limit reached`);
      return [
        {
          type: "literal",
          value: "...(depth limited)",
          metadata: { depthLimited: true },
        },
      ];
    }

    // 안전한 컨텍스트 생성
    const safeContext = {
      ...context,
      depth: context.depth + 1,
    };

    try {
      // 1. 타입 매개변수 (P)
      const typeParameter = mappedNode.typeParameter;
      components.push({
        type: "reference",
        name: "[TypeParameter]",
        children: [this.extractTypeParameter(typeParameter, safeContext)],
        metadata: {
          originalText: typeParameter.getText(),
          description: "Mapped type parameter",
          parameterName: typeParameter.name.text,
        },
      });

      // 2. In 절 (K) - 매핑할 키들 (🚨 안전하게 처리)
      if (typeParameter.constraint) {
        try {
          const constraintStructure = this.collector.collect(
            typeParameter.constraint,
            safeContext
          );
          components.push({
            type: "reference",
            name: "[InType]",
            children: [constraintStructure],
            metadata: {
              originalText: typeParameter.constraint.getText(),
              description: "Keys to iterate over (in clause)",
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.log(
            `⚠️ MappedType constraint analysis failed: ${error.message}`
          );
          components.push({
            type: "reference",
            name: "[InType]",
            children: [
              {
                type: "literal",
                value: typeParameter.constraint.getText(),
                metadata: { originalText: typeParameter.constraint.getText() },
              },
            ],
            metadata: {
              originalText: typeParameter.constraint.getText(),
              description: "Keys to iterate over (fallback)",
            },
          });
        }
      }

      // 3. 값 타입 (T) - 각 속성의 타입 (🚨 안전하게 처리)
      if (mappedNode.type) {
        try {
          const valueStructure = this.collector.collect(
            mappedNode.type,
            safeContext
          );
          components.push({
            type: "reference",
            name: "[ValueType]",
            children: [valueStructure],
            metadata: {
              originalText: mappedNode.type.getText(),
              description: "Type of each mapped property",
            },
          });
        } catch (error) {
          console.log(
            `⚠️ MappedType value type analysis failed: ${error.message}`
          );
          components.push({
            type: "reference",
            name: "[ValueType]",
            children: [
              {
                type: "literal",
                value: mappedNode.type.getText(),
                metadata: { originalText: mappedNode.type.getText() },
              },
            ],
            metadata: {
              originalText: mappedNode.type.getText(),
              description: "Type of each mapped property (fallback)",
            },
          });
        }
      }

      // 나머지 구성 요소들은 기존 로직 유지...
      const modifiers = this.extractModifiers(mappedNode);
      if (modifiers.length > 0) {
        components.push({
          type: "reference",
          name: "[Modifiers]",
          children: modifiers,
          metadata: {
            description: "Property modifiers (readonly, optional)",
          },
        });
      }

      if (mappedNode.nameType) {
        try {
          const nameTypeStructure = this.collector.collect(
            mappedNode.nameType,
            safeContext
          );
          components.push({
            type: "reference",
            name: "[KeyRemapping]",
            children: [nameTypeStructure],
            metadata: {
              originalText: mappedNode.nameType.getText(),
              description: "Key remapping (as clause)",
            },
          });
        } catch (error) {
          console.log(
            `⚠️ MappedType name type analysis failed: ${error.message}`
          );
        }
      }

      return components;
    } catch (error) {
      console.log(`🚨 MappedType process failed: ${error.message}`);
      return [
        {
          type: "literal",
          value: mappedNode.getText(),
          metadata: {
            originalText: mappedNode.getText(),
            processingFailed: true,
          },
        },
      ];
    }
  }
  /**
   * 🎯 타입 매개변수 추출
   */
  private extractTypeParameter(
    typeParam: ts.TypeParameterDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const paramName = typeParam.name.text;
    const children: TypeStructure[] = [];

    // 제약 조건 (constraint)
    if (typeParam.constraint) {
      children.push({
        type: "reference",
        name: "[Constraint]",
        children: [this.collector.collect(typeParam.constraint, context)],
        metadata: { description: "Type constraint" },
      });
    }

    // 기본 타입 (default)
    if (typeParam.default) {
      children.push({
        type: "reference",
        name: "[Default]",
        children: [this.collector.collect(typeParam.default, context)],
        metadata: { description: "Default type" },
      });
    }

    return {
      type: "reference",
      name: paramName,
      children: children.length > 0 ? children : undefined,
      metadata: {
        originalText: typeParam.getText(),
        description: `Type parameter: ${paramName}`,
      },
    };
  }

  /**
   * 🎯 수정자들 추출 (readonly, optional)
   */
  private extractModifiers(mappedNode: ts.MappedTypeNode): TypeStructure[] {
    const modifiers: TypeStructure[] = [];

    // readonly 수정자
    if (mappedNode.readonlyToken) {
      const readonlyModifier = this.getModifierInfo(mappedNode.readonlyToken);
      modifiers.push({
        type: "operator",
        metadata: {
          operator: "readonly",
          originalText: mappedNode.readonlyToken.getText(),
          modifier: readonlyModifier,
          description: "Readonly modifier",
        },
      });
    }

    // optional 수정자 (questionToken)
    if (mappedNode.questionToken) {
      const optionalModifier = this.getModifierInfo(mappedNode.questionToken);
      modifiers.push({
        type: "operator",
        metadata: {
          operator: "optional",
          originalText: mappedNode.questionToken.getText(),
          modifier: optionalModifier,
          description: "Optional modifier",
        },
      });
    }

    return modifiers;
  }

  /**
   * 🔧 수정자 정보 추출 헬퍼 (+, -, 없음)
   */
  private getModifierInfo(token: ts.Token<ts.SyntaxKind>): string {
    const tokenText = token.getText();

    // +readonly, -readonly, readonly
    if (tokenText.startsWith("+")) return "add";
    if (tokenText.startsWith("-")) return "remove";
    return "preserve"; // 기본값 (수정자 없음)
  }

  /**
   * 🎯 매핑 정보 추출 (디버깅/분석용)
   */
  private extractMappingInfo(
    mappedNode: ts.MappedTypeNode,
    context: TypeCollectionContext
  ): string {
    try {
      const paramName = mappedNode.typeParameter.name.text;

      let constraintInfo = "any";
      if (mappedNode.typeParameter.constraint) {
        const constraintType = context.checker.getTypeFromTypeNode(
          mappedNode.typeParameter.constraint
        );
        constraintInfo = context.checker.typeToString(constraintType);
      }

      let valueInfo = "unknown";
      if (mappedNode.type) {
        const valueType = context.checker.getTypeFromTypeNode(mappedNode.type);
        valueInfo = context.checker.typeToString(valueType);
      }

      return `[${paramName} in ${constraintInfo}]: ${valueInfo}`;
    } catch (error) {
      // 복잡한 제네릭 상황에서는 텍스트로 fallback
      return mappedNode.getText();
    }
  }
}
