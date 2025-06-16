// src/handlers/templateTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, TemplateLiteralTypeInfo } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { LiteralTypeHandler } from "./literalTypeHandler";
import { globalHandlerRegistry } from "./registry";

/**
 * 템플릿 리터럴 타입 핸들러
 *
 * 모든 리터럴 관련 타입의 상위 핸들러:
 * - 단순 리터럴: "hello", 42, true 등 -> LiteralTypeHandler에 위임
 * - 템플릿 리터럴: `hello ${string}`, `${T}-${U}` 등 -> 자체 처리
 * - 복합 템플릿: 조건부, 매핑 등이 포함된 템플릿
 */
export class TemplateTypeHandler extends BaseTypeHandler {
  readonly name = "TemplateTypeHandler";
  readonly priority = 9; // LiteralTypeHandler보다 높은 우선순위

  private literalHandler: LiteralTypeHandler;

  constructor() {
    super();
    this.literalHandler = new LiteralTypeHandler();
  }

  /**
   * 모든 리터럴 관련 타입 감지 (템플릿 리터럴 + 단순 리터럴)
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isTemplateLiteralType(type) || this.isSimpleLiteralType(type);
  }

  /**
   * 타입에 따라 처리 방식 결정
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for template type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.processType(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create template type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 타입 처리 분기점
   */
  private processType(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    // 단순 리터럴은 LiteralTypeHandler에 위임
    if (this.isSimpleLiteralType(type)) {
      return this.delegateToLiteralHandler(type, node, context);
    }

    // 템플릿 리터럴은 자체 처리
    if (this.isTemplateLiteralType(type)) {
      return this.createTemplateNode(type, node, context);
    }

    // 예상치 못한 경우 (fallback)
    return this.createErrorNode(
      "Unexpected type in TemplateTypeHandler",
      type,
      node,
      context
    );
  }

  /**
   * LiteralTypeHandler에 위임
   */
  private delegateToLiteralHandler(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    return this.literalHandler.createTypeNode(type, node, context);
  }

  /**
   * 템플릿 리터럴 TypeNode 생성
   */
  private createTemplateNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    const templateInfo = this.extractTemplateInfo(type, node, context);
    const resolvedString = this.resolveTemplateString(type, context);

    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      debug: {
        warnings: [],
      },
      templateInfo: {
        partsCount: templateInfo.parts.length,
        hasInterpolation: templateInfo.parts.length > 1,
        resolvedString,
      },
    });

    return typeNodeFactory.createTemplate(
      templateInfo.parts,
      resolvedString,
      metadata
    );
  }

  /**
   * 템플릿 구조 정보 추출
   */
  private extractTemplateInfo(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TemplateLiteralTypeInfo {
    // 템플릿 리터럴 타입에서 parts 추출
    const parts = this.extractTemplateParts(type, node, context);

    return {
      parts,
      resolvedString: this.resolveTemplateString(type, context),
    };
  }

  /**
   * 템플릿 구성 요소들 추출
   */
  private extractTemplateParts(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode[] {
    // AST 노드가 있는 경우 노드 기반 분석
    if (node && ts.isTemplateLiteralTypeNode) {
      return this.extractPartsFromNode(node, context);
    }

    // 타입 기반 분석 (TypeScript 내부 구조 활용)
    return this.extractPartsFromType(type, context);
  }

  /**
   * AST 노드에서 parts 추출
   */
  private extractPartsFromNode(
    node: ts.TypeNode,
    context: TypeCreationContext
  ): TypeNode[] {
    // TemplateLiteralTypeNode인 경우
    if (this.isTemplateLiteralNode(node)) {
      const templateNode = node as any; // TypeScript doesn't export this type
      const parts: TypeNode[] = [];

      // head (첫 번째 고정 부분)
      if (templateNode.head) {
        parts.push(
          this.createStringLiteralNode(templateNode.head.text, context)
        );
      }

      // templateSpans (변수 부분 + 이어지는 고정 부분)
      if (templateNode.templateSpans) {
        for (const span of templateNode.templateSpans) {
          // 변수 부분
          if (span.type) {
            const partNode = globalHandlerRegistry.createTypeNode(
              context.checker.getTypeFromTypeNode(span.type),
              span.type,
              context
            );
            parts.push(partNode);
          }

          // 고정 부분
          if (span.literal) {
            parts.push(
              this.createStringLiteralNode(span.literal.text, context)
            );
          }
        }
      }

      return parts;
    }

    // fallback: 전체를 하나의 부분으로 처리
    return [this.createStringLiteralNode(node.getText(), context)];
  }

  /**
   * 타입에서 parts 추출 (TypeScript 내부 구조 활용)
   */
  private extractPartsFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): TypeNode[] {
    // TypeScript의 내부 TemplateLiteralType 구조 활용 시도
    try {
      const templateType = type as any;

      // texts와 types가 있는 경우 (TypeScript 내부 구조)
      if (templateType.texts && templateType.types) {
        const parts: TypeNode[] = [];

        // texts와 types를 번갈아가며 처리
        for (let i = 0; i < templateType.texts.length; i++) {
          // 고정 텍스트 부분
          if (templateType.texts[i]) {
            parts.push(
              this.createStringLiteralNode(templateType.texts[i], context)
            );
          }

          // 변수 타입 부분 (마지막 텍스트 이후에는 없음)
          if (i < templateType.types.length) {
            const partNode = globalHandlerRegistry.createTypeNode(
              templateType.types[i],
              undefined,
              context
            );
            parts.push(partNode);
          }
        }

        return parts;
      }
    } catch (error) {
      // 내부 구조 접근 실패시 fallback
    }

    // fallback: 타입 문자열 전체를 하나의 부분으로 처리
    const typeString = context.checker.typeToString(type);
    return [this.createStringLiteralNode(typeString, context)];
  }

  /**
   * 문자열 리터럴 노드 생성 헬퍼
   */
  private createStringLiteralNode(
    text: string,
    context: TypeCreationContext
  ): TypeNode {
    return typeNodeFactory.createLiteral(`"${text}"`, {
      originalText: text,
      finalTypeString: `"${text}"`,
      isBuiltin: false,
    });
  }

  /**
   * 템플릿 문자열 해결 시도
   */
  private resolveTemplateString(
    type: ts.Type,
    context: TypeCreationContext
  ): string | undefined {
    try {
      const typeString = context.checker.typeToString(type);

      // 구체적인 문자열로 해결된 경우
      if (typeString.startsWith('"') && typeString.endsWith('"')) {
        return typeString.slice(1, -1); // 따옴표 제거
      }

      // 템플릿 형태인 경우 그대로 반환
      if (typeString.includes("${")) {
        return typeString;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 타입 판별 헬퍼들
   */
  private isTemplateLiteralType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.TemplateLiteral);
  }

  private isSimpleLiteralType(type: ts.Type): boolean {
    return !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.EnumLiteral)
    );
  }

  private isTemplateLiteralNode(node: ts.TypeNode): boolean {
    // TypeScript doesn't export TemplateLiteralTypeNode enum value
    // 임시로 kind 번호나 getText()로 판별
    return node.getText().includes("`") || node.getText().includes("${");
  }

  /**
   * 디버깅 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isTemplate = this.isTemplateLiteralType(type);
    const isLiteral = this.isSimpleLiteralType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";

    return [
      `TemplateTypeHandler Debug Info:`,
      `  Is Template Literal: ${isTemplate}`,
      `  Is Simple Literal: ${isLiteral}`,
      `  Type String: ${typeString}`,
      `  Type Flags: ${type.flags}`,
      `  Will Delegate: ${isLiteral && !isTemplate}`,
    ].join("\n");
  }

  /**
   * 지원하는 타입들
   */
  static getSupportedTypes(): string[] {
    return [
      "template-literal",
      "string-literal",
      "number-literal",
      "boolean-literal",
      "bigint-literal",
      "enum-literal",
    ];
  }
}

// 편의 함수들
export function createTemplateTypeHandler(): TemplateTypeHandler {
  return new TemplateTypeHandler();
}

export function isTemplateOrLiteralType(type: ts.Type): boolean {
  return !!(
    type.flags &
    (ts.TypeFlags.TemplateLiteral |
      ts.TypeFlags.StringLiteral |
      ts.TypeFlags.NumberLiteral |
      ts.TypeFlags.BooleanLiteral |
      ts.TypeFlags.BigIntLiteral |
      ts.TypeFlags.EnumLiteral)
  );
}
